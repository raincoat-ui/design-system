// Generates every platform's output from the token source and its themes.
// Generated files are committed; `check` reports the ones that are out of date instead of
// writing them, which is how CI detects drift and hand edits.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { openProject, raincoatVersion } from "../project.js";
import { buildThemeCss } from "./css.js";
import {
  expectedKotlin,
  themeKotlin,
  themePackage,
  themesKotlin,
  themeTestKotlin,
  tokenSetKotlin,
} from "./kotlin.js";
import {
  packageSwift,
  themeGradle,
  webThemeNotice,
  webThemePackage,
  webThemeReadme,
} from "./scaffold.js";
import { pascal } from "./shared.js";
import {
  snapshotsKotlin,
  snapshotsSwift,
  snapshotsTypeScript,
  specsKotlin,
  specsSwift,
  specsTypeScript,
} from "./spec.js";
import {
  expectedSwift,
  swiftTheme,
  themeSwift,
  themesSwift,
  themeTestsSwift,
  tokenSetSwift,
} from "./swift.js";

const KOTLIN = "src/main/kotlin/io/github/raincoatui";
const KOTLIN_TEST = "src/test/kotlin/io/github/raincoatui";

/** The generated files of one theme, on every platform. */
function themeOutputs(theme, { root, version }) {
  const { files, id } = theme;
  const name = pascal(id);
  const { module } = swiftTheme(id);
  const gradle = `packages/android/theme-${id}`;
  const kotlinDir = themePackage(id).split(".").slice(3).join("/");
  const web = `packages/web-themes/${id}`;
  return [
    { file: `${web}/theme.css`, content: buildThemeCss(files) },
    { file: `${web}/package.json`, content: webThemePackage(theme, { version }) },
    { file: `${web}/README.md`, content: webThemeReadme(theme) },
    { file: `${web}/NOTICE`, content: webThemeNotice(theme) },
    { file: `${web}/LICENSE`, content: readFileSync(join(root, "LICENSE"), "utf8") },
    {
      file: `packages/ios/Sources/${module}/Generated/${name}Theme.swift`,
      content: themeSwift(files, id),
    },
    {
      file: `packages/ios/Tests/${module}Tests/Generated/Expected${name}Tokens.swift`,
      content: expectedSwift(files, id),
    },
    {
      file: `packages/ios/Tests/${module}Tests/Generated/${name}ThemeTests.swift`,
      content: themeTestsSwift(id),
    },
    { file: `${gradle}/build.gradle.kts`, content: themeGradle(theme) },
    {
      file: `${gradle}/${KOTLIN}/${kotlinDir}/generated/${name}Theme.kt`,
      content: themeKotlin(files, id),
    },
    {
      file: `${gradle}/${KOTLIN_TEST}/${kotlinDir}/generated/Expected${name}Tokens.kt`,
      content: expectedKotlin(files, id),
    },
    {
      file: `${gradle}/${KOTLIN_TEST}/${kotlinDir}/generated/${name}ThemeTest.kt`,
      content: themeTestKotlin(id),
    },
  ];
}

/** Every generated file of this repository and its content. */
export function outputs(root) {
  const project = openProject(root);
  if (!project.inRepo) throw new Error(`${root} has no tokens/: it is not the Raincoat repository`);
  const [base] = project.themes;
  const ids = project.themes.map((theme) => theme.id);
  const version = raincoatVersion();
  return [
    {
      file: "packages/ios/Sources/RaincoatTokens/Generated/TokenSet.swift",
      content: tokenSetSwift(base.files),
    },
    {
      file: `packages/android/tokens/${KOTLIN}/tokens/generated/TokenSet.kt`,
      content: tokenSetKotlin(base.files),
    },
    {
      file: "packages/ios/Sources/RaincoatTokens/Generated/ComponentSpecs.swift",
      content: specsSwift(root),
    },
    {
      file: `packages/android/tokens/${KOTLIN}/tokens/generated/ComponentSpecs.kt`,
      content: specsKotlin(root),
    },
    { file: "packages/web/src/generated/specs.ts", content: specsTypeScript(root) },
    // The snapshot matrix and the examples' text, for each platform's snapshot tests.
    {
      file: "packages/web/test/snapshots/generated/snapshots.ts",
      content: snapshotsTypeScript(root),
    },
    {
      file: "packages/ios/Tests/RaincoatTests/Generated/Snapshots.swift",
      content: snapshotsSwift(root),
    },
    {
      file: `packages/android/ui/${KOTLIN_TEST}/ui/generated/Snapshots.kt`,
      content: snapshotsKotlin(root),
    },
    { file: "packages/ios/Package.swift", content: packageSwift(ids) },
    { file: "packages/ios/Tests/RaincoatTests/Generated/Themes.swift", content: themesSwift(ids) },
    {
      file: `packages/android/ui/${KOTLIN_TEST}/ui/generated/Themes.kt`,
      content: themesKotlin(ids),
    },
    ...project.themes.flatMap((theme) => themeOutputs(theme, { root, version })),
  ];
}

/**
 * Generated directories of a theme that no longer exists. The build never deletes them by
 * itself; it reports them, so that removing a theme is a decision someone makes.
 */
export function orphans(root, ids) {
  const found = [];
  const under = (dir, pattern) =>
    existsSync(join(root, dir))
      ? readdirSync(join(root, dir))
          .map((name) => [name, pattern.exec(name)?.[1]])
          .filter(([, id]) => id !== undefined)
      : [];
  const known = new Set(ids.map((id) => id));
  const knownSwift = new Set(ids.map((id) => swiftTheme(id).module));
  for (const [name, id] of under("packages/web-themes", /^(.+)$/)) {
    if (!known.has(id)) found.push(`packages/web-themes/${name}`);
  }
  for (const [name, id] of under("packages/android", /^theme-(.+)$/)) {
    if (!known.has(id)) found.push(`packages/android/${name}`);
  }
  for (const [name] of under("packages/ios/Sources", /^(RaincoatTheme.+)$/)) {
    if (!knownSwift.has(name)) found.push(`packages/ios/Sources/${name}`);
  }
  return found;
}

/**
 * @returns {Promise<{file: string, status: "written" | "unchanged" | "stale" | "orphaned"}[]>}
 */
export async function build(root, { check = false } = {}) {
  const list = outputs(root);
  const ids = openProject(root).themes.map((theme) => theme.id);
  const results = list.map(({ file, content }) => {
    const path = join(root, file);
    let current = null;
    try {
      current = readFileSync(path, "utf8");
    } catch {}
    if (current === content) return { file, status: "unchanged" };
    if (check) return { file, status: "stale" };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { file, status: "written" };
  });
  return [...results, ...orphans(root, ids).map((file) => ({ file, status: "orphaned" }))];
}
