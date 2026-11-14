#!/usr/bin/env node
// Publishes a built site to the gh-pages branch: `node tools/ci/deploy-site.mjs <dist-dir>`.
//
// Everything at the root of the branch is replaced by the new build, except the directories in
// KEEP. Those hold content that outlives a site build: the Maven repository and pull request
// previews.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BRANCH = "gh-pages";
const KEEP = [".git", "maven", "pr"];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  console.error(`deploy-site: ${message}`);
  process.exit(1);
}

function git(args, { cwd = repoRoot, allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    fail(`git ${args[0]} failed:\n${result.stderr.trim()}`);
  }
  return { ok: result.status === 0, out: result.stdout.trim() };
}

const dist = process.argv[2] ? resolve(process.argv[2]) : null;
if (!dist || !existsSync(join(dist, "index.html"))) {
  fail("usage: deploy-site.mjs <dist-dir>, where <dist-dir> contains index.html");
}

// In GitHub Actions the workflow's token pushes as the Actions bot. Locally the checkout's own
// remote and identity are used.
const inActions = Boolean(process.env.GITHUB_ACTIONS);
const remote = inActions
  ? `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
  : git(["remote", "get-url", "origin"]).out;
if (inActions && !process.env.GITHUB_TOKEN) fail("GITHUB_TOKEN is not set");
const identity = inActions
  ? ["github-actions[bot]", "41898282+github-actions[bot]@users.noreply.github.com"]
  : [git(["config", "user.name"]).out, git(["config", "user.email"]).out];
const source = git(["rev-parse", "--short", "HEAD"]).out;

const work = mkdtempSync(join(tmpdir(), "raincoat-site-"));
try {
  const exists = git(["ls-remote", "--exit-code", "--heads", remote, BRANCH], {
    allowFailure: true,
  }).ok;
  if (exists) {
    git(["clone", "--quiet", "--depth", "1", "--branch", BRANCH, remote, work]);
  } else {
    git(["init", "--quiet", "--initial-branch", BRANCH, work]);
    git(["remote", "add", "origin", remote], { cwd: work });
  }

  for (const entry of readdirSync(work)) {
    if (!KEEP.includes(entry)) rmSync(join(work, entry), { recursive: true, force: true });
  }
  cpSync(dist, work, { recursive: true });
  // Tells GitHub Pages to serve the files as they are, without running Jekyll.
  writeFileSync(join(work, ".nojekyll"), "");

  git(["add", "--all"], { cwd: work });
  if (git(["diff", "--cached", "--quiet"], { cwd: work, allowFailure: true }).ok) {
    console.log("The published site is already up to date.");
  } else {
    git(
      [
        "-c",
        `user.name=${identity[0]}`,
        "-c",
        `user.email=${identity[1]}`,
        "commit",
        "--quiet",
        "--message",
        `chore(site): deploy from ${source}`,
      ],
      { cwd: work },
    );
    git(["push", "--quiet", "origin", BRANCH], { cwd: work });
    console.log(`Published the site from ${source} to the ${BRANCH} branch.`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
