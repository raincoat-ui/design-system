// Builds dist/: the components as ES modules with type declarations, the Tailwind entry
// point, and the precompiled stylesheet for apps that do not use Tailwind.
import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const windows = process.platform === "win32";
/** Runs a command-line tool installed in this package. */
const run = (tool, args) =>
  execFileSync(join(root, "node_modules/.bin", windows ? `${tool}.cmd` : tool), args, {
    cwd: root,
    stdio: "inherit",
    shell: windows,
  });

const dist = (file) => new URL(`../dist/${file}`, import.meta.url);
const src = (file) => new URL(`../src/${file}`, import.meta.url);

rmSync(dist(""), { recursive: true, force: true });

// JavaScript without comments, then declarations with them. Tailwind finds class names by
// reading the JavaScript as text, and a word such as "block" in a comment would become a class.
run("tsc", ["--project", "tsconfig.build.json"]);
run("tsc", [
  "--project",
  "tsconfig.build.json",
  "--declaration",
  "--declarationMap",
  "--emitDeclarationOnly",
  "--removeComments",
  "false",
]);

// tailwind.css finds the class names with a path relative to itself, and dist/ has the same
// layout as src/, so it is copied as it is.
copyFileSync(src("tailwind.css"), dist("tailwind.css"));

// ui.css is compiled from a copy of its source inside dist/, so that the class names come
// from the JavaScript that ships.
copyFileSync(src("ui.css"), dist("ui.input.css"));
run("tailwindcss", ["--input", "dist/ui.input.css", "--output", "dist/ui.css", "--minify"]);
rmSync(dist("ui.input.css"));
