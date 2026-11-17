#!/usr/bin/env node
// Two modes:
//   --message-file <path>           commit-msg hook: the message must carry a sign-off.
//   --range <base>..<head> [--title <text> [--author <login>]]
//                                   CI: every commit in the range is signed off, and the
//                                   pull request title follows Conventional Commits.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dcoProblem, parseGitLog, signOffs, titleToLint } from "./commits.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const HOW_TO_SIGN = "Add one with `git commit -s` (or `git commit --amend -s --no-edit`).";
const problems = [];

const messageFile = option("--message-file");
const range = option("--range");
const title = option("--title");
const author = option("--author");

if (!messageFile && !range) {
  console.error(
    "usage: check-commits.mjs --message-file <path> | --range <base>..<head> [--title <text> [--author <login>]]",
  );
  process.exit(2);
}

if (messageFile) {
  const message = readFileSync(messageFile, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n");
  if (signOffs(message).length === 0) {
    problems.push(`This commit has no Signed-off-by line. ${HOW_TO_SIGN}`);
  }
}

if (range) {
  const log = spawnSync("git", ["log", "--format=%H%x00%P%x00%ae%x00%ce%x00%B%x01", range], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (log.status !== 0) {
    console.error(log.stderr);
    process.exit(2);
  }
  for (const commit of parseGitLog(log.stdout)) {
    const problem = dcoProblem(commit);
    if (problem) problems.push(`Commit ${commit.sha.slice(0, 10)} ${problem}. ${HOW_TO_SIGN}`);
  }
}

if (title !== undefined) {
  const lint = spawnSync("pnpm", ["exec", "commitlint"], {
    input: `${titleToLint(title, author)}\n`,
    encoding: "utf8",
  });
  if (lint.status !== 0) {
    problems.push(
      `The pull request title is not a Conventional Commit:\n${(lint.stdout || lint.stderr).trim()}`,
    );
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Commit checks passed.");
