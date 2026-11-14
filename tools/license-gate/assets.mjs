#!/usr/bin/env node
// Fails when a committed font or brand asset is not covered by licenses/assets.yml.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { checkAssets } from "./assets-lib.mjs";
import { loadAllowlist } from "./lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowlist = loadAllowlist(join(repoRoot, "licenses/allowlist.yml"));
const manifest = parseYaml(readFileSync(join(repoRoot, "licenses/assets.yml"), "utf8")) ?? {};

// Tracked files plus untracked files that are not ignored, so the check also works before a commit.
const listing = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: repoRoot,
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});
if (listing.status !== 0) {
  console.error(listing.stderr);
  process.exit(2);
}
const files = listing.stdout.split("\0").filter(Boolean);

const problems = checkAssets({
  files,
  manifest,
  shipLicenses: allowlist.ship,
  fontLicenses: allowlist.fonts,
});

if (problems.length > 0) {
  console.error(`${problems.length} asset license problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Asset licenses: ${files.length} file(s) scanned, all fonts and brand assets covered.`);
