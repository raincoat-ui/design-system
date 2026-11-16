#!/usr/bin/env node
// Builds the npm packages and packs each into a tarball, exactly as it will be published:
//
//   node tools/release/pack-npm.mjs <out-dir>
//
// Each tarball is then opened and checked, because a mistake in "files" or "exports" is
// otherwise found only by the first person who installs the package.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NPM_PACKAGES, readJson, repoRoot } from "./lib.mjs";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout;
}

/** The files a package's manifest promises: every "exports" target, and the license files. */
export function promisedFiles(manifest) {
  const targets = Object.values(manifest.exports ?? {}).flatMap((target) =>
    typeof target === "string" ? [target] : Object.values(target),
  );
  return [
    ...new Set([
      ...targets.map((target) => target.replace(/^\.\//, "")),
      "package.json",
      "LICENSE",
      "NOTICE",
      "README.md",
    ]),
  ];
}

/** Problems with a packed tarball, given its file list and the manifest inside it. */
export function tarballProblems(files, manifest) {
  const problems = promisedFiles(manifest)
    .filter((file) => !files.includes(file))
    .map((file) => `${file} is missing from the tarball`);
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (/^(workspace|link|file):/.test(range)) {
        problems.push(`${field}.${name} is "${range}", which only resolves inside this repository`);
      }
    }
  }
  if (manifest.private) problems.push("the package is private");
  for (const file of files) {
    if (
      /(^|\/)(test|tests|scripts|\.shadcn-upstream)\//.test(file) ||
      /\.test\.[jt]sx?$/.test(file)
    ) {
      problems.push(`${file} should not ship`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ? resolve(process.argv[2]) : null;
  if (!out) {
    console.error("usage: pack-npm.mjs <out-dir>");
    process.exit(2);
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  let failed = false;
  for (const dir of NPM_PACKAGES) {
    const cwd = join(repoRoot, dir);
    const source = readJson(`${dir}/package.json`);
    if (source.scripts?.build) run("pnpm", ["run", "build"], cwd);
    run("pnpm", ["pack", "--pack-destination", out], cwd);
    const tarball = readdirSync(out).find((name) =>
      name.startsWith(source.name.replace("@", "").replace("/", "-")),
    );
    const files = run("tar", ["-tzf", join(out, tarball)])
      .trim()
      .split("\n")
      .map((file) => file.replace(/^package\//, ""));
    const manifest = JSON.parse(run("tar", ["-xzOf", join(out, tarball), "package/package.json"]));
    const problems = tarballProblems(files, manifest);
    console.log(`${tarball}: ${files.length} files`);
    for (const problem of problems) {
      failed = true;
      console.error(`  ${problem}`);
    }
  }
  if (failed) process.exit(1);
}
