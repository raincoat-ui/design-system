#!/usr/bin/env node
// Switches the iOS reference app to another theme, as an app selects its theme: by linking that
// theme's product and applying it (ADR 0010):
//
//   node tools/reference/ios-theme.mjs <id>
//
// It changes the Xcode project's theme product, the app's import and .raincoatTheme(...), and
// the UI tests' import and theme, from the base theme to <id>. CI runs it on a fresh checkout,
// once per theme; with "base" it changes nothing. To go back, restore those files with git.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const IOS_FILES = {
  project: "apps/reference-ios/ReferenceApp.xcodeproj/project.pbxproj",
  app: "apps/reference-ios/ReferenceApp/ReferenceApp.swift",
  tests: "apps/reference-ios/ReferenceAppUITests/ButtonTests.swift",
};

const pascal = (id) =>
  id
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
const camel = (id) => pascal(id)[0].toLowerCase() + pascal(id).slice(1);

/** Each file's text with the base theme replaced by `id`. Throws if a file is not as expected. */
export function switchTheme(files, id) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) throw new Error(`"${id}" is not a theme id`);
  if (id === "base") return { ...files };
  const module = `RaincoatTheme${pascal(id)}`;
  const replace = (text, file, pairs) =>
    pairs.reduce((result, [from, to]) => {
      if (!result.includes(from)) throw new Error(`${file} has no ${from}`);
      return result.replaceAll(from, to);
    }, text);
  return {
    project: replace(files.project, IOS_FILES.project, [
      ["/* RaincoatThemeBase in Frameworks */", `/* ${module} in Frameworks */`],
      ["/* RaincoatThemeBase */", `/* ${module} */`],
      ["productName = RaincoatThemeBase;", `productName = ${module};`],
    ]),
    app: replace(files.app, IOS_FILES.app, [
      ["import RaincoatThemeBase", `import ${module}`],
      [".raincoatTheme(.base)", `.raincoatTheme(.${camel(id)})`],
    ]),
    tests: replace(files.tests, IOS_FILES.tests, [
      ["import RaincoatThemeBase", `import ${module}`],
      ["RaincoatTheme.base", `RaincoatTheme.${camel(id)}`],
    ]),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: ios-theme.mjs <theme id>");
    process.exit(2);
  }
  if (!existsSync(join(repoRoot, `packages/ios/Sources/RaincoatTheme${pascal(id)}`))) {
    console.error(`No theme "${id}" in packages/ios.`);
    process.exit(1);
  }
  const read = (file) => readFileSync(join(repoRoot, file), "utf8");
  const before = Object.fromEntries(
    Object.entries(IOS_FILES).map(([key, file]) => [key, read(file)]),
  );
  const after = switchTheme(before, id);
  for (const [key, file] of Object.entries(IOS_FILES))
    writeFileSync(join(repoRoot, file), after[key]);
  console.log(`The iOS reference app now links and applies the ${id} theme.`);
}
