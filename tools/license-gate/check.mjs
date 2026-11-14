#!/usr/bin/env node
// The license gate for npm dependencies. Fails when any installed package carries a license
// outside licenses/allowlist.yml: production dependencies against the "ship" scope,
// development dependencies against the "dev" scope.
//
// Gradle and SwiftPM dependencies join the gate when those builds land (see ADR 0009).
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, flattenReport, loadAllowlist, loadCurations } from "./lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowlist = loadAllowlist(join(repoRoot, "licenses/allowlist.yml"));
const curations = loadCurations(join(repoRoot, "licenses/curations.yml"));
const today = new Date().toISOString().slice(0, 10);

function report(flag) {
  const result = spawnSync("pnpm", ["licenses", "list", "--json", flag], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`pnpm licenses list ${flag} failed`);
  }
  try {
    return flattenReport(JSON.parse(result.stdout));
  } catch {
    throw new Error(
      `pnpm licenses list ${flag} did not return JSON:\n${result.stdout.slice(0, 400)}`,
    );
  }
}

let failed = false;
for (const [scope, flag] of [
  ["ship", "--prod"],
  ["dev", "--dev"],
]) {
  const rows = report(flag);
  const { violations, problems } = evaluate({ rows, scope, allowlist, curations, today });
  for (const problem of problems) {
    failed = true;
    console.error(`licenses/curations.yml: ${problem}`);
  }
  if (violations.length > 0) {
    failed = true;
    console.error(`\n${violations.length} package(s) fail the "${scope}" license allowlist:`);
    for (const item of violations) {
      console.error(`  ${item.name}@${item.version}  ${item.license}  (${item.why})`);
    }
  } else {
    console.log(`${scope}: ${rows.length} package(s) checked, all allowed.`);
  }
}

if (failed) {
  console.error(
    "\nRemove the dependency, or record a reviewed correction or dated exception in licenses/curations.yml.",
  );
  process.exit(1);
}
