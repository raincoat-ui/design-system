#!/usr/bin/env node
// Installs the npm packages the way an app would, into an empty project, and uses them:
//
//   node tools/release/consumers/npm-check.mjs --tarballs <dir>     the staged tarballs
//   node tools/release/consumers/npm-check.mjs --version <version>  from the npm registry
//
// It uses npm, not pnpm, and no file of this repository, so it sees what a stranger sees.
//
// npm checks a newly published version before it serves it. npm says that typically takes
// around five minutes and can take longer, and until then the registry answers as it does for a
// version that does not exist. So from the registry, the install is tried again until it works
// or NPM_CHECK_WAIT_MINUTES (30 unless set) have passed.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [mode, value] = process.argv.slice(2);
if (!["--tarballs", "--version"].includes(mode) || !value) {
  console.error("usage: npm-check.mjs --tarballs <dir> | --version <version>");
  process.exit(2);
}
const raincoat =
  mode === "--tarballs"
    ? readdirSync(resolve(value))
        .filter((name) => name.endsWith(".tgz"))
        .map((name) => join(resolve(value), name))
    : [`@raincoat-ui/react@${value}`, `@raincoat-ui/theme-base@${value}`];

const waitMinutes = Number(process.env.NPM_CHECK_WAIT_MINUTES ?? 30);

const project = mkdtempSync(join(tmpdir(), "raincoat-npm-consumer-"));
function attempt(command, args) {
  return spawnSync(command, args, {
    cwd: project,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}
function fail(command, args, result) {
  console.error(`${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
  process.exit(1);
}
function run(command, args) {
  const result = attempt(command, args);
  if (result.status !== 0) fail(command, args, result);
  return result.stdout;
}

writeFileSync(
  join(project, "package.json"),
  JSON.stringify({ name: "consumer", private: true, type: "module" }),
);
// What a React app has, plus TypeScript to check the type declarations.
const install = [
  "install",
  "--no-audit",
  "--no-fund",
  ...raincoat,
  "react@19.3.1",
  "react-dom@19.3.1",
  "@types/react@19.3.0",
  "@types/react-dom@19.3.0",
  "typescript@7.0.2",
];
if (mode === "--tarballs") {
  run("npm", install);
} else {
  // Never answer from npm's cache: the question is what the registry serves now.
  const fromRegistry = [...install, "--prefer-online"];
  const deadline = Date.now() + waitMinutes * 60_000;
  for (;;) {
    const result = attempt("npm", fromRegistry);
    if (result.status === 0) break;
    const output = `${result.stdout}${result.stderr}`;
    // E404: npm does not serve the package. ETARGET: it serves the package without the version.
    const notServedYet = /\b(E404|ETARGET)\b/.test(output) && output.includes("@raincoat-ui");
    if (!notServedYet) fail("npm", fromRegistry, result);
    if (Date.now() > deadline) {
      console.error(`npm did not serve ${value} within ${waitMinutes} minutes.`);
      fail("npm", fromRegistry, result);
    }
    console.log(`npm does not serve ${value} yet. Trying again in 20 seconds.`);
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

writeFileSync(
  join(project, "run.mjs"),
  `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BUTTON_VARIANTS, Button } from "@raincoat-ui/react";
import { Button as ButtonAlone } from "@raincoat-ui/react/button";

assert.equal(Button, ButtonAlone);
assert.deepEqual([...BUTTON_VARIANTS], ["primary", "secondary", "ghost", "danger"]);

// The Button renders on a server, with its defaults and its token classes.
const html = renderToStaticMarkup(createElement(Button, { variant: "primary" }, "Save changes"));
assert.match(html, /^<button /);
assert.match(html, /type="button"/);
assert.match(html, /data-variant="primary"/);
assert.match(html, /bg-\\(--rc-button-primary-bg-default\\)/);
assert.match(html, />Save changes<\\/button>$/);

// Every stylesheet the documentation names can be found, and they agree on a token's name.
const read = (specifier) => readFileSync(fileURLToPath(import.meta.resolve(specifier)), "utf8");
const theme = read("@raincoat-ui/theme-base/theme.css");
const precompiled = read("@raincoat-ui/react/ui.css");
const tailwind = read("@raincoat-ui/react/tailwind.css");
assert.match(theme, /--rc-button-primary-bg-default:/);
assert.match(precompiled, /var\\(--rc-button-primary-bg-default\\)/);
assert.match(tailwind, /@source /);
console.log("The packages install, import, render, and ship their stylesheets.");
`,
);
console.log(run("node", ["run.mjs"]).trim());

// The type declarations resolve for an app that compiles with TypeScript.
writeFileSync(
  join(project, "app.tsx"),
  `import { Button, type ButtonProps, type ButtonVariant } from "@raincoat-ui/react";

const variant: ButtonVariant = "danger";
const props: ButtonProps = { children: "Delete page", variant };
export const ok = <Button {...props} />;
// @ts-expect-error A button with no label needs an accessible name.
export const unnamed = <Button leadingIcon={<svg />} />;
`,
);
writeFileSync(
  join(project, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      jsx: "react-jsx",
      strict: true,
      noEmit: true,
      types: [],
    },
    files: ["app.tsx"],
  }),
);
run("npx", ["tsc", "--project", "tsconfig.json"]);
console.log("The type declarations resolve and check.");

rmSync(project, { recursive: true, force: true });
