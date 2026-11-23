// Shared by the release scripts: where things are, and the one version every package has.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Every theme: the base theme, which is the token source in tokens/, then each directory under
 * themes/ that has a theme.json. The token build generates each one's packages, so every list
 * below follows this one and a new theme needs no edit here.
 */
export function themeIds(root = repoRoot) {
  const dir = join(root, "themes");
  const overlays = existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => existsSync(join(dir, name, "theme.json")))
        .sort()
    : [];
  return ["base", ...overlays];
}

/** The packages whose version Changesets manages as one group, by directory. */
export const versioned = (root = repoRoot) => [
  "packages/web",
  ...themeIds(root).map((id) => `packages/web-themes/${id}`),
  "packages/tokens",
  "packages/ios",
  "packages/android",
];

/** The npm packages that are published, by directory. The others are private. */
export const npmPackages = (root = repoRoot) => [
  "packages/web",
  ...themeIds(root).map((id) => `packages/web-themes/${id}`),
  "packages/tokens",
];

/** The Gradle modules that are published, as Maven artifact ids. */
export const mavenArtifacts = (root = repoRoot) => [
  "tokens",
  ...themeIds(root).map((id) => `theme-${id}`),
  "ui",
];

export const VERSIONED = versioned();
export const NPM_PACKAGES = npmPackages();
export const MAVEN_ARTIFACTS = mavenArtifacts();
export const MAVEN_GROUP = "io.github.raincoat-ui";

export const readJson = (file, root = repoRoot) =>
  JSON.parse(readFileSync(join(root, file), "utf8"));

/**
 * The version shared by every package.
 * @throws when the packages disagree, which means a version was edited by hand.
 */
export function releaseVersion(root = repoRoot) {
  const versions = new Map(
    versioned(root).map((dir) => [dir, readJson(`${dir}/package.json`, root).version]),
  );
  const distinct = new Set(versions.values());
  if (distinct.size !== 1) {
    const list = [...versions].map(([dir, version]) => `  ${dir}: ${version}`).join("\n");
    throw new Error(`the packages do not share one version:\n${list}`);
  }
  return [...distinct][0];
}

/** The version in gradle.properties. */
/**
 * The places that name Raincoat's version but that Changesets does not write: Gradle's
 * properties file, and the install commands in the READMEs. In each pattern, the second group
 * is the version.
 */
export const VERSION_MENTIONS = [
  { file: "gradle.properties", pattern: /^(version=)(.+)$/gm },
  {
    file: "packages/android/README.md",
    pattern: /(the prerelease `|io\.github\.raincoat-ui:ui:)([^`"\s]+)/g,
  },
  { file: "packages/tokens/README.md", pattern: /(@raincoat-ui\/tokens@)([^`"\s]+)/g },
];

/**
 * Each place that names the version, with the versions it names.
 * @returns {{ file: string, pattern: RegExp, versions: string[] }[]}
 */
export function versionMentions(root = repoRoot) {
  return VERSION_MENTIONS.map(({ file, pattern }) => ({
    file,
    pattern,
    versions: [...readFileSync(join(root, file), "utf8").matchAll(pattern)].map((match) =>
      match[2].trim(),
    ),
  }));
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

/**
 * What a release is built from: the files that reach npm, the Maven repository, or the Swift
 * mirror, or that decide what does. Tests of the web and Android packages, and documents that
 * are not shipped, are not here. These are git pathspecs.
 */
export const SHIPPED = [
  "LICENSE",
  "NOTICE",
  "tokens",
  "themes",
  "specs",
  "schemas",
  // npm
  "packages/tokens/src",
  "packages/tokens/scripts",
  "packages/tokens/package.json",
  "packages/tokens/README.md",
  "packages/web/src",
  "packages/web/scripts",
  "packages/web/package.json",
  "packages/web/tsconfig.json",
  "packages/web/tsconfig.build.json",
  "packages/web/README.md",
  "packages/web/LICENSE",
  "packages/web/NOTICE",
  "packages/web-themes",
  // Maven
  ":(glob)packages/android/*/src/main/**",
  ":(glob)packages/android/*/build.gradle.kts",
  "gradle/libs.versions.toml",
  "gradle.properties",
  "build.gradle.kts",
  "settings.gradle.kts",
  // The Swift mirror, which carries the tests and the documents too
  "packages/ios/Package.swift",
  "packages/ios/Sources",
  "packages/ios/Tests",
  "packages/ios/README.md",
  "packages/ios/CHANGELOG.md",
];

/**
 * The shipped files that differ between a tag and the current commit.
 * @returns {string[]} their paths; empty when a release of that tag can still be finished.
 */
export function shippedChangesSince(tag, root = repoRoot) {
  const result = spawnSync("git", ["diff", "--name-only", tag, "HEAD", "--", ...SHIPPED], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`could not compare with ${tag}:\n${result.stderr}`);
  return result.stdout.split("\n").filter(Boolean);
}

/** Whether a version is a prerelease, such as 0.1.0-next.0. */
export const isPrerelease = (version) => version.includes("-");
