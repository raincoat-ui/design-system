#!/usr/bin/env node
// Copies the version that Changesets manages into the places it cannot write: Gradle's
// properties file, and the install commands in the Android and token build READMEs. The Swift
// package has no version file; its version is the mirror's git tag.
//
//   node tools/release/sync-versions.mjs          write
//   node tools/release/sync-versions.mjs --check  fail if anything is out of date
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { releaseVersion, repoRoot, versionMentions } from "./lib.mjs";

const check = process.argv.includes("--check");
const version = releaseVersion();
let stale = false;

for (const { file, pattern, versions } of versionMentions()) {
  if (versions.length === 0) {
    console.error(`${file} no longer names the version where sync-versions.mjs looks for it.`);
    process.exit(1);
  }
  const other = versions.find((found) => found !== version);
  if (other === undefined) {
    console.log(`${file}: ${version}`);
  } else if (check) {
    console.error(`${file} has version ${other}, but the packages are at ${version}.`);
    stale = true;
  } else {
    const path = join(repoRoot, file);
    const text = readFileSync(path, "utf8");
    writeFileSync(
      path,
      text.replace(pattern, (_, before) => `${before}${version}`),
    );
    console.log(`${file}: ${other} -> ${version}`);
  }
}
if (stale) {
  console.error("Run: node tools/release/sync-versions.mjs");
  process.exit(1);
}
