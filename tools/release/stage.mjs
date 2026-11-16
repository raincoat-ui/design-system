#!/usr/bin/env node
// Builds everything a release publishes into build/release/, without publishing anything:
//
//   npm/*.tgz                      the npm packages
//   maven/                         the Android modules, as a Maven repository
//   design-system-swift/           the tree of the Swift mirror repository
//   design-system-swift-<v>.tar.gz the same tree, as one file to attach and attest
//   raincoat-<v>.cdx.json          the bill of materials
//   release.json                   the facts the publishing steps need
//
// The release workflow runs this, and so does every pull request, so a release is rehearsed
// long before it happens. It needs a JDK and the Android SDK, as the Android build does.
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isPrerelease, releaseVersion, repoRoot } from "./lib.mjs";

const out = join(repoRoot, "build/release");
const version = releaseVersion();

function run(title, command, args) {
  console.log(`\n== ${title}`);
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nStaging stopped: "${title}" failed.`);
    process.exit(result.status ?? 1);
  }
}
const node = (title, script, ...args) =>
  run(title, process.execPath, [join("tools/release", script), ...args]);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

node("Versions agree", "sync-versions.mjs", "--check");
node("npm packages", "pack-npm.mjs", join(out, "npm"));
run("Android modules", process.platform === "win32" ? "gradlew.bat" : "./gradlew", [
  "publishAllPublicationsToStagingRepository",
  "licensee",
  "--console=plain",
  "--quiet",
]);
node("Swift mirror tree", "swift-mirror.mjs", join(out, "design-system-swift"));
// One file for the mirror tree, with fixed order and times so that it is the same every build.
run("Swift mirror archive", "tar", [
  "--create",
  "--gzip",
  "--file",
  join(out, `design-system-swift-${version}.tar.gz`),
  "--directory",
  out,
  "design-system-swift",
]);
node("Bill of materials", "sbom.mjs", join(out, `raincoat-${version}.cdx.json`));

const commit = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).stdout.trim();
const facts = {
  version,
  tag: `v${version}`,
  prerelease: isPrerelease(version),
  // Prereleases never become what "npm install" gives by default.
  npmTag: isPrerelease(version) ? "next" : "latest",
  commit,
};
writeFileSync(join(out, "release.json"), `${JSON.stringify(facts, null, 2)}\n`);
console.log(`\nStaged ${version} in build/release/.`);
