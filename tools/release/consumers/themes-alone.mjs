#!/usr/bin/env node
// Shows that each theme installs on its own, needing only Raincoat's token types and bringing
// no other theme with it:
//
//   node tools/release/consumers/themes-alone.mjs --swift <mirror tree>   builds each theme
//       product of the Swift package by itself
//   node tools/release/consumers/themes-alone.mjs --maven <repository> <version>   reads each
//       theme module's POM, which lists what an app receives with it
//
// The npm packages are checked the same way by npm-check.mjs.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [mode, where, version] = process.argv.slice(2);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (mode === "--swift" && where) {
  const manifest = readFileSync(join(resolve(where), "Package.swift"), "utf8");
  const themes = [...manifest.matchAll(/\.library\(name: "(RaincoatTheme\w+)"/g)].map((m) => m[1]);
  if (themes.length === 0) fail("the Swift package has no theme products");
  for (const theme of themes) {
    const target = new RegExp(
      `\\.target\\(name: "${theme}", dependencies: \\[([^\\]]*)\\]\\)`,
    ).exec(manifest);
    if (target?.[1] !== '"RaincoatTokens"') {
      fail(
        `${theme} should depend on RaincoatTokens alone, not on ${target?.[1] ?? "(no target)"}`,
      );
    }
    const built = spawnSync(
      "swift",
      ["build", "--package-path", resolve(where), "--product", theme],
      {
        encoding: "utf8",
      },
    );
    if (built.status !== 0)
      fail(`${theme} does not build on its own:\n${built.stdout}${built.stderr}`);
    console.log(`${theme} builds on its own, with RaincoatTokens alone.`);
  }
} else if (mode === "--maven" && where && version) {
  const group = join(resolve(where), "io/github/raincoat-ui");
  const themes = readdirSync(group).filter((name) => name.startsWith("theme-"));
  if (themes.length === 0) fail(`no theme modules in ${group}`);
  for (const theme of themes) {
    const pom = readFileSync(join(group, theme, version, `${theme}-${version}.pom`), "utf8");
    const dependencies = [...pom.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)].map((match) => {
      const field = (name) => new RegExp(`<${name}>([^<]+)</${name}>`).exec(match[1])?.[1];
      return `${field("groupId")}:${field("artifactId")}:${field("version")}`;
    });
    // Kotlin's standard library comes with any Kotlin module; of Raincoat's, only the token types.
    const raincoat = dependencies.filter((id) => id.startsWith("io.github.raincoat-ui:"));
    const expected = [`io.github.raincoat-ui:tokens:${version}`];
    if (raincoat.join() !== expected.join()) {
      fail(`${theme} should bring ${expected.join()} alone, not ${raincoat.join(", ")}`);
    }
    console.log(`${theme} brings no other Raincoat module than the token types.`);
  }
} else {
  console.error("usage: themes-alone.mjs --swift <mirror tree> | --maven <repository> <version>");
  process.exit(2);
}
