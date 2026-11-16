#!/usr/bin/env node
// Pushes a staged mirror tree to the Swift mirror repository and tags it:
//
//   node tools/release/publish-swift.mjs <mirror-tree-dir> <version>
//
// The tag is the plain version, as SwiftPM expects. A version that is already tagged is left
// alone.
//
// Credentials, either of:
//   SWIFT_MIRROR_DEPLOY_KEY  the private half of a deploy key with write access to the mirror
//   SWIFT_MIRROR_TOKEN       a fine-grained token that may write the mirror's contents
// With neither, nothing is pushed and the Swift package is reported as pending, so that the
// rest of a release is not held up by it.
//
// Output for GitHub Actions: `pending`, "true" when nothing could be pushed.
//
// SWIFT_MIRROR_URL replaces the mirror's address. The tests use it to push to a local
// repository.
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPOSITORY = "raincoat-ui/design-system-swift";
// GitHub's SSH host keys, as published by `gh api meta --jq .ssh_keys`. Pinned so that the push
// goes to GitHub and nowhere else.
const KNOWN_HOSTS = [
  "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
  "github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=",
].join("\n");

const output = (name, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
};

/** @returns {"pending" | "kept" | "pushed"} */
function publish({ tree, version, secrets, work }) {
  const key = process.env.SWIFT_MIRROR_DEPLOY_KEY ?? "";
  const token = process.env.SWIFT_MIRROR_TOKEN ?? "";
  const { GITHUB_REPOSITORY = "raincoat-ui/design-system", GITHUB_SHA = "" } = process.env;
  const env = { ...process.env };

  let mirror = process.env.SWIFT_MIRROR_URL;
  if (!mirror && key) {
    const keyFile = join(secrets, "key");
    const hostsFile = join(secrets, "known_hosts");
    writeFileSync(keyFile, key.endsWith("\n") ? key : `${key}\n`, { mode: 0o600 });
    chmodSync(keyFile, 0o600);
    writeFileSync(hostsFile, `${KNOWN_HOSTS}\n`);
    env.GIT_SSH_COMMAND = `ssh -i ${keyFile} -o IdentitiesOnly=yes -o UserKnownHostsFile=${hostsFile} -o StrictHostKeyChecking=yes`;
    mirror = `git@github.com:${REPOSITORY}.git`;
  } else if (!mirror && token) {
    mirror = `https://x-access-token:${token}@github.com/${REPOSITORY}.git`;
  }
  if (!mirror) return "pending";

  const git = (args, { cwd = work, allowFailure = false } = {}) => {
    const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    if (result.status !== 0 && !allowFailure) {
      // The address can hold the token, so it is never echoed.
      const detail = token ? result.stderr.replaceAll(token, "***") : result.stderr;
      throw new Error(`git ${args[0]} failed:\n${detail.trim()}`);
    }
    return { ok: result.status === 0, status: result.status, out: result.stdout.trim() };
  };

  const tagged = git(["ls-remote", "--exit-code", "--tags", mirror, `refs/tags/${version}`], {
    allowFailure: true,
  });
  if (tagged.ok) return "kept";
  // Exit code 2 means the tag is not there; anything else is a failure to ask.
  if (tagged.status !== 2) throw new Error("could not reach the mirror repository");

  // An empty repository has no branch to clone yet.
  const hasMain = git(["ls-remote", "--exit-code", "--heads", mirror, "main"], {
    allowFailure: true,
  }).ok;
  if (hasMain) {
    git(["clone", "--quiet", "--depth", "1", "--branch", "main", mirror, work], { cwd: tmpdir() });
  } else {
    git(["init", "--quiet", "--initial-branch", "main", work], { cwd: tmpdir() });
    git(["remote", "add", "origin", mirror]);
  }

  // The mirror becomes exactly the staged tree.
  for (const entry of readdirSync(work)) {
    if (entry !== ".git") rmSync(join(work, entry), { recursive: true, force: true });
  }
  cpSync(tree, work, { recursive: true });

  git(["add", "--all"]);
  const identity = [
    "-c",
    "user.name=github-actions[bot]",
    "-c",
    "user.email=41898282+github-actions[bot]@users.noreply.github.com",
  ];
  const message = `Release ${version}\n\nGenerated from ${GITHUB_REPOSITORY}@${GITHUB_SHA.slice(0, 12)}.`;
  // A release may change nothing in the Swift package; it is tagged all the same.
  git([...identity, "commit", "--quiet", "--allow-empty", "--message", message]);
  git([...identity, "tag", "--annotate", version, "--message", `Raincoat ${version}`]);
  git(["push", "--quiet", "origin", "main", `refs/tags/${version}`]);
  return "pushed";
}

const [treeArgument, version] = process.argv.slice(2);
if (!treeArgument || !version) {
  console.error("usage: publish-swift.mjs <mirror-tree-dir> <version>");
  process.exit(2);
}

// Both directories are removed whatever happens: one of them holds the key.
const secrets = mkdtempSync(join(tmpdir(), "raincoat-ssh-"));
const work = mkdtempSync(join(tmpdir(), "raincoat-swift-"));
let outcome;
let failure;
try {
  outcome = publish({ tree: resolve(treeArgument), version, secrets, work });
} catch (error) {
  failure = error;
} finally {
  rmSync(secrets, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
}

if (failure) {
  console.error(`publish-swift: ${failure.message}`);
  process.exit(1);
}
output("pending", outcome === "pending");
if (outcome === "pending") {
  const message = `The Swift package ${version} was not published: the release has no credential for ${REPOSITORY}. See "What the release needs on GitHub" in docs/maintaining/runbook.md, then run the release workflow by hand.`;
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : message);
} else if (outcome === "kept") {
  console.log(`${version} is already tagged in the mirror. Nothing to do.`);
} else {
  console.log(`Pushed ${version} to the Swift mirror.`);
}
