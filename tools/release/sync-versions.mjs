#!/usr/bin/env node
// Copies the version that Changesets manages into the places it cannot write: Gradle's
// properties file. The Swift package has no version file; its version is the mirror's git tag.
//
//   node tools/release/sync-versions.mjs          write
//   node tools/release/sync-versions.mjs --check  fail if anything is out of date
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gradleVersion, releaseVersion, repoRoot } from "./lib.mjs";

const check = process.argv.includes("--check");
const version = releaseVersion();
const current = gradleVersion();

if (current === version) {
  console.log(`Versions agree: ${version}.`);
} else if (check) {
  console.error(
    `gradle.properties has version ${current}, but the packages are at ${version}.\nRun: node tools/release/sync-versions.mjs`,
  );
  process.exit(1);
} else {
  const file = join(repoRoot, "gradle.properties");
  writeFileSync(file, readFileSync(file, "utf8").replace(/^version=.+$/m, `version=${version}`));
  console.log(`gradle.properties: ${current} -> ${version}`);
}
