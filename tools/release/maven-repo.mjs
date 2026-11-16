#!/usr/bin/env node
// Adds a staged release to a static Maven repository:
//
//   node tools/release/maven-repo.mjs add <staged-dir> <repository-dir>
//
// <staged-dir> is what Gradle wrote (build/release/maven). <repository-dir> is the maven/
// directory of the gh-pages branch. Each artifact's version directory is copied in, and the
// artifact's maven-metadata.xml is rewritten to list every version now present.
//
// A version that is already in the repository is never replaced: published files are
// permanent. Such a version is skipped, so that a release can be run again after a failure.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { compareVersions } from "./lib.mjs";

const CHECKSUMS = ["md5", "sha1", "sha256", "sha512"];
const directories = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

/** Every artifact in a repository: {group, artifact, dir}, where dir holds the versions. */
export function artifacts(repository) {
  const found = [];
  const walk = (dir) => {
    const children = directories(dir);
    // An artifact directory is one whose children are version directories holding a POM.
    const versions = children.filter((name) =>
      existsSync(join(dir, name, `${dir.split("/").at(-1)}-${name}.pom`)),
    );
    if (versions.length > 0) {
      const parts = relative(repository, dir).split("/");
      found.push({ group: parts.slice(0, -1).join("."), artifact: parts.at(-1), dir, versions });
    } else {
      for (const child of children) walk(join(dir, child));
    }
  };
  if (existsSync(repository)) walk(repository);
  return found;
}

/** The maven-metadata.xml of an artifact with these versions. */
export function metadata({ group, artifact, versions, now = new Date() }) {
  const sorted = [...versions].sort(compareVersions);
  const stamp = now.toISOString().replaceAll(/[-:T]/g, "").slice(0, 14);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<metadata>",
    `  <groupId>${group}</groupId>`,
    `  <artifactId>${artifact}</artifactId>`,
    "  <versioning>",
    `    <latest>${sorted.at(-1)}</latest>`,
    `    <release>${sorted.at(-1)}</release>`,
    "    <versions>",
    ...sorted.map((version) => `      <version>${version}</version>`),
    "    </versions>",
    `    <lastUpdated>${stamp}</lastUpdated>`,
    "  </versioning>",
    "</metadata>",
    "",
  ].join("\n");
}

function writeWithChecksums(file, content) {
  writeFileSync(file, content);
  for (const algorithm of CHECKSUMS) {
    writeFileSync(`${file}.${algorithm}`, createHash(algorithm).update(content).digest("hex"));
  }
}

/**
 * Copies every staged version into the repository and rewrites the metadata.
 * @returns {{coordinates: string, status: "added" | "kept"}[]}
 */
export function add(staged, repository, { now = new Date() } = {}) {
  const results = [];
  for (const { group, artifact, dir, versions } of artifacts(staged)) {
    const target = join(repository, ...group.split("."), artifact);
    mkdirSync(target, { recursive: true });
    for (const version of versions) {
      const coordinates = `${group}:${artifact}:${version}`;
      if (existsSync(join(target, version))) {
        results.push({ coordinates, status: "kept" });
      } else {
        cpSync(join(dir, version), join(target, version), { recursive: true });
        results.push({ coordinates, status: "added" });
      }
    }
    const present = directories(target).filter((name) =>
      existsSync(join(target, name, `${artifact}-${name}.pom`)),
    );
    writeWithChecksums(
      join(target, "maven-metadata.xml"),
      metadata({ group, artifact, versions: present, now }),
    );
  }
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, staged, repository] = process.argv.slice(2);
  if (command !== "add" || !staged || !repository) {
    console.error("usage: maven-repo.mjs add <staged-dir> <repository-dir>");
    process.exit(2);
  }
  const results = add(staged, repository);
  if (results.length === 0) {
    console.error(`no artifacts found in ${staged}`);
    process.exit(1);
  }
  for (const { coordinates, status } of results) {
    console.log(`${status === "added" ? "added" : "kept (already published)"}  ${coordinates}`);
  }
}
