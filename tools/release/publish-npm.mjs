#!/usr/bin/env node
// Publishes the staged npm tarballs:
//
//   node tools/release/publish-npm.mjs <tarball-dir> <dist-tag>
//
// A version that is already on the registry is skipped, so the step can be run again.
//
// Credentials. Normally there are none: npm trusts this workflow (trusted publishing), which
// is set up per package on npmjs.com. npm cannot set that up for a package that does not exist
// yet, so the very first publish of a new name needs a token, in NPM_TOKEN. Without one, a new
// package is reported as pending and the other packages are still published.
//
// Outputs for GitHub Actions: `published`, `skipped`, and `pending`, each a list of names.
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [directory, tag] = process.argv.slice(2);
if (!directory || !tag) {
  console.error("usage: publish-npm.mjs <tarball-dir> <dist-tag>");
  process.exit(2);
}
const token = process.env.NPM_TOKEN ?? "";

function npm(args, { env = process.env } = {}) {
  return spawnSync("npm", args, { encoding: "utf8", env, shell: process.platform === "win32" });
}
/** What the registry knows: "version" (this version exists), "package" (others do), or "none". */
function known(name, version) {
  if (npm(["view", `${name}@${version}`, "version", "--json"]).stdout.includes(version))
    return "version";
  return npm(["view", name, "name", "--json"]).status === 0 ? "package" : "none";
}
function manifestOf(tarball) {
  const result = spawnSync("tar", ["-xzOf", tarball, "package/package.json"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`could not read ${tarball}`);
  return JSON.parse(result.stdout);
}

// The token is given to npm through a config file of its own, so that when there is no token
// npm has no credentials at all and uses trusted publishing.
const config = mkdtempSync(join(tmpdir(), "raincoat-npm-"));
// npm itself replaces the variable when it reads the file, so the token is never written out.
const authLine = ["//registry.npmjs.org/:_authToken=$", "{NPM_TOKEN}\n"].join("");
writeFileSync(join(config, "npmrc"), authLine, { mode: 0o600 });
const withToken = ["--userconfig", join(config, "npmrc")];

const outcome = { published: [], skipped: [], pending: [] };
let failed = false;
try {
  console.log(
    `npm ${npm(["--version"]).stdout.trim()}; ${token ? "using NPM_TOKEN" : "no token: trusted publishing"}`,
  );
  for (const file of readdirSync(resolve(directory))
    .filter((name) => name.endsWith(".tgz"))
    .sort()) {
    const tarball = join(resolve(directory), file);
    const { name, version } = manifestOf(tarball);
    const state = known(name, version);
    if (state === "version") {
      console.log(`skipped    ${name}@${version} is already published`);
      outcome.skipped.push(name);
      continue;
    }
    if (state === "none" && !token) {
      console.log(`pending    ${name} does not exist on npm yet, and creating it needs a token`);
      outcome.pending.push(name);
      continue;
    }
    const result = npm([
      "publish",
      tarball,
      "--tag",
      tag,
      "--access",
      "public",
      "--provenance",
      ...(token ? withToken : []),
    ]);
    if (result.status === 0) {
      console.log(`published  ${name}@${version} with the tag "${tag}"`);
      outcome.published.push(name);
    } else {
      failed = true;
      console.error(`FAILED     ${name}@${version}\n${result.stdout}${result.stderr}`);
    }
  }
} finally {
  rmSync(config, { recursive: true, force: true });
}

if (process.env.GITHUB_OUTPUT) {
  for (const [key, names] of Object.entries(outcome)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${names.join(" ")}\n`);
  }
}
if (outcome.pending.length > 0) {
  const message = `Not on npm yet: ${outcome.pending.join(", ")}. A new package name needs a one-time token; see "The first publish of an npm package" in docs/maintaining/runbook.md.`;
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : message);
}
process.exit(failed ? 1 : 0);
