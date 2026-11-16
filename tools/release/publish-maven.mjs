#!/usr/bin/env node
// Adds a staged Maven release to the repository served by GitHub Pages:
//
//   node tools/release/publish-maven.mjs <staged-maven-dir>
//
// The repository is the maven/ directory of the gh-pages branch. The documentation site is
// deployed to the same branch, so a push can lose a race; it is then redone on the new tip.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { add } from "./maven-repo.mjs";

const BRANCH = "gh-pages";
const ATTEMPTS = 4;

function fail(message) {
  console.error(`publish-maven: ${message}`);
  process.exit(1);
}
function git(args, { cwd, allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) fail(`git ${args[0]} failed:\n${result.stderr.trim()}`);
  return { ok: result.status === 0, out: result.stdout.trim() };
}

const staged = process.argv[2]
  ? resolve(process.argv[2])
  : fail("usage: publish-maven.mjs <staged-maven-dir>");
const { GITHUB_TOKEN, GITHUB_REPOSITORY = "", GITHUB_SHA = "", PAGES_REMOTE } = process.env;
// PAGES_REMOTE replaces the address of the repository. The tests use it to push to a local one.
if (!PAGES_REMOTE && (!GITHUB_TOKEN || !GITHUB_REPOSITORY)) {
  fail("GITHUB_TOKEN and GITHUB_REPOSITORY must be set");
}
const remote =
  PAGES_REMOTE ?? `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git`;

/** One try at adding the release on top of the branch's tip. */
function attempt(work) {
  git(["clone", "--quiet", "--depth", "1", "--branch", BRANCH, remote, work]);
  const results = add(staged, join(work, "maven"));
  if (results.length === 0) fail(`no artifacts found in ${staged}`);
  for (const { coordinates, status } of results) {
    console.log(`${status === "added" ? "added" : "kept (already published)"}  ${coordinates}`);
  }
  const added = results
    .filter(({ status }) => status === "added")
    .map(({ coordinates }) => coordinates);
  if (added.length === 0) return "nothing";

  git(["add", "--all", "maven"], { cwd: work });
  git(
    [
      "-c",
      "user.name=github-actions[bot]",
      "-c",
      "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit",
      "--quiet",
      "--message",
      `Publish ${added.join(", ")}\n\nFrom ${GITHUB_REPOSITORY || "a local run"}@${GITHUB_SHA.slice(0, 12)}.`,
    ],
    { cwd: work },
  );
  return git(["push", "--quiet", "origin", BRANCH], { cwd: work, allowFailure: true }).ok
    ? "pushed"
    : "moved";
}

let outcome = "moved";
for (let number = 1; number <= ATTEMPTS && outcome === "moved"; number += 1) {
  // The clone's configuration holds the token, so the directory is removed whatever happens.
  const work = mkdtempSync(join(tmpdir(), "raincoat-maven-"));
  try {
    outcome = attempt(work);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  if (outcome === "moved") {
    console.log(
      `The branch moved while publishing (attempt ${number} of ${ATTEMPTS}). Trying again.`,
    );
  }
}
if (outcome === "moved") fail(`could not push to ${BRANCH} after ${ATTEMPTS} attempts`);
console.log(
  outcome === "pushed"
    ? `Pushed to ${BRANCH}.`
    : "Everything was already published. Nothing to push.",
);
