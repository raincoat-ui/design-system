#!/usr/bin/env node
// Generates, from licenses/allowlist.yml:
//   licenses/ALLOWLIST.md    the published, readable form
//   licenses/allowlist.json  the form the Gradle license gate reads
// `--check` fails instead of writing when a committed file is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { resolveAllowlist } from "./lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(repoRoot, "licenses/allowlist.yml");

const sorted = (set) => [...set].sort((a, b) => a.localeCompare(b));

export function render(document) {
  const scopes = resolveAllowlist(document);
  const lines = [
    "<!-- GENERATED from licenses/allowlist.yml by `pnpm licenses:render`. Do not edit. -->",
    "",
    "# License allowlist",
    "",
    "Every dependency and bundled asset must carry one of these licenses. CI fails on anything",
    "else. All identifiers are OSI-approved SPDX licenses. Exceptions are individual, dated, and",
    "listed in `licenses/curations.yml`.",
    "",
    "| Scope | Applies to | Allowed licenses |",
    "|---|---|---|",
  ];
  for (const [name, scope] of Object.entries(document.scopes)) {
    lines.push(`| \`${name}\` | ${scope.description} | ${sorted(scopes[name]).join(", ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

/** Each scope with `extends` resolved, as plain JSON for tools that cannot read YAML. */
export function renderJson(document) {
  const scopes = resolveAllowlist(document);
  const result = Object.fromEntries(
    Object.keys(document.scopes).map((name) => [name, sorted(scopes[name])]),
  );
  return `${JSON.stringify(result, null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const document = parseYaml(readFileSync(source, "utf8"));
  const outputs = [
    ["licenses/ALLOWLIST.md", render(document)],
    ["licenses/allowlist.json", renderJson(document)],
  ];
  const check = process.argv.includes("--check");
  let stale = false;
  for (const [file, expected] of outputs) {
    let current = "";
    try {
      current = readFileSync(join(repoRoot, file), "utf8");
    } catch {}
    if (current === expected) {
      if (check) console.log(`${file} is up to date.`);
    } else if (check) {
      stale = true;
      console.error(`${file} is out of date. Run \`pnpm licenses:render\` and commit it.`);
    } else {
      writeFileSync(join(repoRoot, file), expected);
      console.log(`Wrote ${file}`);
    }
  }
  if (stale) process.exit(1);
}
