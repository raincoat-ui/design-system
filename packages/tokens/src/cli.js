#!/usr/bin/env node
// raincoat-tokens lint      check the token source
// raincoat-tokens contrast  check contrast for every declared pair in every color mode
// Both read `<cwd>/tokens`; pass --root <dir> to point elsewhere. --all lists passing pairs too.
import { resolve } from "node:path";
import { checkContrast } from "./contrast.js";
import { lint } from "./lint.js";
import { loadSource } from "./load.js";

const args = process.argv.slice(2);
const command = args[0];
const rootIndex = args.indexOf("--root");
const root = resolve(rootIndex === -1 ? process.cwd() : args[rootIndex + 1]);

if (command === "lint") {
  const problems = lint(root);
  if (problems.length > 0) {
    let file = null;
    for (const problem of problems) {
      if (problem.file !== file) {
        file = problem.file;
        console.error(`\n${file}`);
      }
      console.error(`  ${problem.message}`);
    }
    console.error(`\n${problems.length} token problem(s).`);
    process.exit(1);
  }
  const count = new Set(loadSource(root).flatMap((entry) => entry.tokens.map((t) => t.id))).size;
  console.log(`Tokens: ${count} tokens valid in every color mode and density.`);
} else if (command === "contrast") {
  const rows = checkContrast(root);
  const failures = rows.filter((row) => !row.pass);
  const shown = args.includes("--all") ? rows : failures;
  for (const row of shown) {
    const line = `${row.pass ? "pass" : "FAIL"}  ${row.mode.padEnd(8)}  ${row.ratio.toFixed(2).padStart(5)}:1 (needs ${row.required}:1, ${row.kind})  ${row.token} on ${row.on}`;
    (row.pass ? console.log : console.error)(line);
  }
  if (failures.length > 0) {
    console.error(
      `\n${failures.length} of ${rows.length} color pair(s) fail their contrast requirement.`,
    );
    process.exit(1);
  }
  console.log(`Contrast: ${rows.length} color pair(s) pass across all color modes.`);
} else {
  console.error("usage: raincoat-tokens <lint|contrast> [--root <dir>] [--all]");
  process.exit(2);
}
