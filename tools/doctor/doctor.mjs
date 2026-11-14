#!/usr/bin/env node
// Reports whether this machine has what each part of the repo needs. Exits non-zero only when
// something required today is missing; tools needed by later milestones are listed as notes.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const pinnedNode = readFileSync(join(repoRoot, ".node-version"), "utf8").trim();
const pinnedPnpm = manifest.packageManager.split("@")[1];

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) return null;
  return `${result.stdout}${result.stderr}`.trim().split("\n")[0];
}

const major = (version) => Number(String(version).replace(/^v/, "").split(".")[0]);
const checks = [];
const add = (name, status, detail) => checks.push({ name, status, detail });

const node = process.version;
add(
  "Node.js",
  major(node) === major(pinnedNode) ? "ok" : "missing",
  `${node} (CI uses ${pinnedNode}; any ${major(pinnedNode)}.x from ${manifest.engines.node} works)`,
);

const pnpm = run("pnpm", ["--version"]);
add(
  "pnpm",
  pnpm === pinnedPnpm ? "ok" : "missing",
  pnpm ? `${pnpm} (pinned ${pinnedPnpm})` : "not found",
);

const git = run("git", ["--version"]);
add("git", git ? "ok" : "missing", git ?? "not found");

const xcode = run("xcodebuild", ["-version"]);
add(
  "Xcode (iOS, from milestone 1)",
  xcode ? "ok" : "later",
  xcode ?? "not found; CI uses Xcode 26.6",
);

const swift = run("swift", ["--version"]);
add("Swift (iOS, from milestone 1)", swift ? "ok" : "later", swift ?? "not found");

const java = run("java", ["-version"]);
add("JDK (Android, from milestone 1)", java ? "ok" : "later", java ?? "not found");

const sdk = process.env.ANDROID_HOME ?? join(homedir(), "Library/Android/sdk");
add(
  "Android SDK (from milestone 1)",
  existsSync(sdk) ? "ok" : "later",
  existsSync(sdk) ? sdk : "not found",
);

const label = { ok: "ok     ", later: "later  ", missing: "MISSING" };
for (const check of checks) console.log(`${label[check.status]}  ${check.name}: ${check.detail}`);

const missing = checks.filter((check) => check.status === "missing");
if (missing.length > 0) {
  console.error(`\n${missing.length} required tool(s) missing or at the wrong version.`);
  process.exit(1);
}
console.log(
  '\nEverything needed today is present. "later" items are needed from the milestone named.',
);
