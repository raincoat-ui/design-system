#!/usr/bin/env node
// Generates licenses/ALLOWLIST.md from licenses/allowlist.yml.
// `--check` fails instead of writing when the committed file is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { resolveAllowlist } from "./lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(repoRoot, "licenses/allowlist.yml");
const target = join(repoRoot, "licenses/ALLOWLIST.md");

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
    const licenses = [...scopes[name]].sort((a, b) => a.localeCompare(b));
    lines.push(`| \`${name}\` | ${scope.description} | ${licenses.join(", ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const expected = render(parseYaml(readFileSync(source, "utf8")));
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(target, "utf8");
    } catch {}
    if (current !== expected) {
      console.error(
        "licenses/ALLOWLIST.md is out of date. Run `pnpm licenses:render` and commit it.",
      );
      process.exit(1);
    }
    console.log("licenses/ALLOWLIST.md is up to date.");
  } else {
    writeFileSync(target, expected);
    console.log("Wrote licenses/ALLOWLIST.md");
  }
}
