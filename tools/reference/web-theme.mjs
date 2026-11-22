#!/usr/bin/env node
// Writes the stylesheet that loads a web reference app's theme, before the app is built:
//
//   node ../../tools/reference/web-theme.mjs <file>     run from the app's directory
//
// The theme is the one RAINCOAT_THEME names, or the base theme. The file imports it the way an
// app does, by its package name, when the app has the package installed: always for the base
// theme, and for any theme once tools/release/use-published.mjs has installed it from npm.
// Otherwise it imports the stylesheet this checkout generated, so that CI can run the apps in
// every theme without each app listing every theme as a dependency.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const target = process.argv[2];
const theme = process.env.RAINCOAT_THEME || "base";
if (!target || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(theme)) {
  console.error("usage: RAINCOAT_THEME=<id> web-theme.mjs <file>");
  process.exit(2);
}
const name = `@raincoat-ui/theme-${theme}`;
const file = resolve(target);
let specifier;
if (existsSync(join(process.cwd(), "node_modules", name, "theme.css"))) {
  specifier = `${name}/theme.css`;
} else {
  const generated = join(repoRoot, "packages/web-themes", theme, "theme.css");
  if (!existsSync(generated)) {
    const known = readdirSync(join(repoRoot, "packages/web-themes")).join(", ");
    console.error(`No theme "${theme}". Themes: ${known}.`);
    process.exit(1);
  }
  specifier = relative(dirname(file), generated).split("\\").join("/");
}
writeFileSync(
  file,
  `/* Written by tools/reference/web-theme.mjs for the "${theme}" theme. Not committed. */\n@import "${specifier}";\n`,
);
console.log(`The app loads the ${theme} theme from ${specifier}.`);
