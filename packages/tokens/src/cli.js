#!/usr/bin/env node
// raincoat-tokens lint      check the token source, every theme, and the component specs
// raincoat-tokens contrast  check contrast for every declared pair, in every theme and color mode
// raincoat-tokens build     generate every platform's output; --check fails if any is out of date
//
// It works on the directory it runs in, or on --root <dir>. In the Raincoat repository that is
// the base token source in tokens/ and the themes in themes/. Anywhere else it is a theme pack:
// the themes in themes/, built on the base source this package was released with, into --out
// (dist/ by default).
//
// --theme <id> limits contrast to one theme; --all lists passing pairs too.
import { resolve } from "node:path";
import { checkContrast } from "./contrast.js";
import { build } from "./emit/index.js";
import { buildPack } from "./emit/pack.js";
import { lint, lintTheme } from "./lint.js";
import { openProject, raincoatVersion } from "./project.js";
import { lintSpecs, loadSpecs } from "./specs.js";

const args = process.argv.slice(2);
const command = args[0];
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const root = resolve(option("--root") ?? process.cwd());

function report(problems, what) {
  let file = null;
  for (const problem of problems) {
    if (problem.file !== file) {
      file = problem.file;
      console.error(`\n${file}`);
    }
    console.error(`  ${problem.message}`);
  }
  console.error(`\n${problems.length} problem(s) in ${what}.`);
  process.exit(1);
}

const project = openProject(root);
const overlays = project.themes.filter((theme) => !theme.base);

if (command === "lint") {
  const problems = [
    ...(project.inRepo ? [...lint(root), ...lintSpecs(root)] : []),
    ...overlays.flatMap((theme) =>
      lintTheme(theme, { schemaDir: project.schemaDir, inRepo: project.inRepo }),
    ),
  ];
  if (problems.length > 0) {
    report(problems, project.inRepo ? "the token source, themes, or specs" : "the themes");
  }
  if (project.inRepo) {
    const count = new Set(project.themes[0].files.flatMap((e) => e.tokens.map((t) => t.id))).size;
    console.log(`Tokens: ${count} tokens valid in every color mode and density.`);
    console.log(`Specs: ${loadSpecs(root).length} component spec(s) valid.`);
  } else if (overlays.length === 0) {
    console.error(`No themes in ${root}/themes, and no token source in ${root}/tokens.`);
    process.exit(1);
  }
  const overrides = (theme) =>
    theme.files.flatMap((entry) => entry.tokens).filter((token) => token.overridden).length;
  for (const theme of overlays) {
    console.log(`Theme ${theme.id}: ${overrides(theme)} token(s) overridden, all valid.`);
  }
} else if (command === "contrast") {
  const only = option("--theme");
  const themes = project.themes.filter((theme) => !only || theme.id === only);
  if (themes.length === 0) {
    console.error(`No theme "${only}". Themes: ${project.themes.map((t) => t.id).join(", ")}.`);
    process.exit(2);
  }
  const width = Math.max(...themes.map((theme) => theme.id.length));
  let total = 0;
  let failed = 0;
  for (const theme of themes) {
    const rows = checkContrast(theme.files);
    total += rows.length;
    for (const row of rows) {
      if (!row.pass) failed += 1;
      if (row.pass && !args.includes("--all")) continue;
      const line = `${row.pass ? "pass" : "FAIL"}  ${theme.id.padEnd(width)}  ${row.mode.padEnd(8)}  ${row.ratio.toFixed(2).padStart(5)}:1 (needs ${row.required}:1, ${row.kind})  ${row.token} on ${row.on}`;
      (row.pass ? console.log : console.error)(line);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} of ${total} color pair(s) fail their contrast requirement.`);
    process.exit(1);
  }
  const names = themes.map((theme) => theme.id).join(", ");
  console.log(`Contrast: ${total} color pair(s) pass across all color modes (${names}).`);
} else if (command === "build") {
  const check = args.includes("--check");
  const results = project.inRepo
    ? await build(root, { check })
    : buildPack(project, { out: resolve(root, option("--out") ?? "dist"), check });
  for (const { file, status } of results) console.log(`${status.padEnd(9)} ${file}`);
  const stale = results.filter((result) => result.status === "stale");
  const orphaned = results.filter((result) => result.status === "orphaned");
  if (orphaned.length > 0) {
    console.error(
      `\n${orphaned.length} generated director(ies) belong to no theme. Delete them, or restore the theme.`,
    );
  }
  if (stale.length > 0) {
    console.error(
      `\n${stale.length} generated file(s) are out of date or were edited by hand. Run \`${project.inRepo ? "pnpm tokens:build" : "raincoat-tokens build"}\` and commit the result.`,
    );
  }
  if (stale.length > 0 || orphaned.length > 0) process.exit(1);
} else if (command === "--version" || command === "version") {
  console.log(raincoatVersion());
} else {
  console.error(
    "usage: raincoat-tokens <lint|contrast|build|version> [--root <dir>] [--theme <id>] [--all] [--check] [--out <dir>]",
  );
  process.exit(2);
}
