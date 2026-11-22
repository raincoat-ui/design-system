#!/usr/bin/env node
// Fails when a committed font or brand asset is not covered by licenses/assets.yml, or by the
// assets.yml of the theme that carries it.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { checkAssets, mergeManifests } from "./assets-lib.mjs";
import { loadAllowlist } from "./lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowlist = loadAllowlist(join(repoRoot, "licenses/allowlist.yml"));
const themesDir = join(repoRoot, "themes");
const themeManifests = (existsSync(themesDir) ? readdirSync(themesDir) : [])
  .filter((id) => existsSync(join(themesDir, id, "assets.yml")))
  .map((id) => ({
    id,
    manifest: parseYaml(readFileSync(join(themesDir, id, "assets.yml"), "utf8")) ?? {},
  }));
const merged = mergeManifests(
  parseYaml(readFileSync(join(repoRoot, "licenses/assets.yml"), "utf8")) ?? {},
  themeManifests,
);
const manifest = merged.manifest;

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

const problems = [
  ...merged.problems,
  ...checkAssets({
    files,
    manifest,
    shipLicenses: allowlist.ship,
    fontLicenses: allowlist.fonts,
  }),
];

if (problems.length > 0) {
  console.error(`${problems.length} asset license problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Asset licenses: ${files.length} file(s) scanned, all fonts and brand assets covered.`);
