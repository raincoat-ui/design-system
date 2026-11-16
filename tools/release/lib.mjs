// Shared by the release scripts: where things are, and the one version every package has.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The packages whose version Changesets manages as one group, by directory. */
export const VERSIONED = [
  "packages/web",
  "packages/web-themes/base",
  "packages/tokens",
  "packages/ios",
  "packages/android",
];

/** The npm packages that are published. The others are private. */
export const NPM_PACKAGES = ["packages/web", "packages/web-themes/base"];

/** The Gradle modules that are published, as Maven artifact ids. */
export const MAVEN_ARTIFACTS = ["tokens", "theme-base", "ui"];
export const MAVEN_GROUP = "io.github.raincoat-ui";

export const readJson = (file, root = repoRoot) =>
  JSON.parse(readFileSync(join(root, file), "utf8"));

/**
 * The version shared by every package.
 * @throws when the packages disagree, which means a version was edited by hand.
 */
export function releaseVersion(root = repoRoot) {
  const versions = new Map(
    VERSIONED.map((dir) => [dir, readJson(`${dir}/package.json`, root).version]),
  );
  const distinct = new Set(versions.values());
  if (distinct.size !== 1) {
    const list = [...versions].map(([dir, version]) => `  ${dir}: ${version}`).join("\n");
    throw new Error(`the packages do not share one version:\n${list}`);
  }
  return [...distinct][0];
}

/** The version in gradle.properties. */
export function gradleVersion(root = repoRoot) {
  const match = /^version=(.+)$/m.exec(readFileSync(join(root, "gradle.properties"), "utf8"));
  if (!match) throw new Error("gradle.properties has no version line");
  return match[1].trim();
}

/**
 * Compares two semantic versions, as Array.prototype.sort expects.
 * A prerelease sorts before its release, and numeric prerelease parts compare as numbers.
 */
export function compareVersions(a, b) {
  const parse = (version) => {
    const [core, ...rest] = version.split("-");
    const pre = rest.join("-");
    return { core: core.split(".").map(Number), pre: pre === "" ? null : pre.split(".") };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i += 1) {
    const difference = (left.core[i] ?? 0) - (right.core[i] ?? 0);
    if (difference !== 0) return difference;
  }
  if (left.pre === null || right.pre === null) {
    return left.pre === right.pre ? 0 : left.pre === null ? 1 : -1;
  }
  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i += 1) {
    const [x, y] = [left.pre[i], right.pre[i]];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const numeric = /^\d+$/.test(x) && /^\d+$/.test(y);
    const difference = numeric ? Number(x) - Number(y) : x.localeCompare(y);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** Whether a version is a prerelease, such as 0.1.0-next.0. */
export const isPrerelease = (version) => version.includes("-");
