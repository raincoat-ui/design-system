#!/usr/bin/env node
// Decides whether the commit being built should be released, and prints the answer as
// outputs for GitHub Actions: `release`, `version`, `tag`.
//
// A commit is released when the packages' version has no tag yet. Version 0.0.0 means that
// nothing has been versioned. Running the workflow by hand releases the current version even
// if its tag exists: every publishing step skips what is already published, so this is how a
// release that stopped halfway is finished.
import { spawnSync } from "node:child_process";
import { releaseVersion, repoRoot } from "./lib.mjs";

const version = releaseVersion();
const tag = `v${version}`;
const manual = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

const remote = spawnSync(
  "git",
  ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);
// Exit code 2 means the tag is not there; anything else that is not 0 is a failure to ask.
if (remote.status !== 0 && remote.status !== 2) {
  console.error(`could not look up ${tag}:\n${remote.stderr}`);
  process.exit(1);
}
const tagged = remote.status === 0;

// What a package ships is built from these. A release that is being finished must still be the
// release that was tagged.
const SHIPPED = [
  "packages",
  "tokens",
  "specs",
  "gradle/libs.versions.toml",
  "gradle.properties",
  "build.gradle.kts",
  "settings.gradle.kts",
];
if (tagged && manual) {
  const fetched = spawnSync(
    "git",
    ["fetch", "--quiet", "--no-tags", "origin", `refs/tags/${tag}:refs/tags/${tag}`],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  if (fetched.status !== 0) {
    console.error(`could not fetch ${tag}:\n${fetched.stderr}`);
    process.exit(1);
  }
  const changed = spawnSync("git", ["diff", "--name-only", tag, "HEAD", "--", ...SHIPPED], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (changed.status !== 0) {
    console.error(`could not compare with ${tag}:\n${changed.stderr}`);
    process.exit(1);
  }
  if (changed.stdout.trim() !== "") {
    console.error(
      `${tag} cannot be finished from this commit: what the packages ship has changed since the tag.\n${changed.stdout}\nRelease a new version instead.`,
    );
    process.exit(1);
  }
}

let release = false;
let reason;
if (version === "0.0.0") reason = "nothing has been versioned yet";
else if (tagged && !manual) reason = `${tag} is already released`;
else {
  release = true;
  reason = tagged
    ? `${tag} exists; finishing it because the run was started by hand`
    : `${tag} has no tag yet`;
}

console.error(`${release ? "Releasing" : "Not releasing"}: ${reason}.`);
console.log(`release=${release}`);
console.log(`version=${version}`);
console.log(`tag=${tag}`);
