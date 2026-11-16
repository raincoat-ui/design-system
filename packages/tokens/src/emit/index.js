// Generates every platform's output from the token source.
// Generated files are committed; `check` reports the ones that are out of date instead of
// writing them, which is how CI detects drift and hand edits.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildThemeCss } from "./css.js";
import { expectedKotlin, themeKotlin, tokenSetKotlin } from "./kotlin.js";
import { expectedSwift, themeSwift, tokenSetSwift } from "./swift.js";

// The base theme is the token source itself. Overlay themes join this list in milestone 2.
const THEMES = [{ id: "base" }];

const pascal = (id) => id[0].toUpperCase() + id.slice(1);

/** Every generated file and its content. */
function outputs(root) {
  const kotlin = "src/main/kotlin/io/github/raincoatui";
  const kotlinTest = "src/test/kotlin/io/github/raincoatui";
  const files = [
    {
      file: "packages/ios/Sources/RaincoatTokens/Generated/TokenSet.swift",
      content: tokenSetSwift(root),
    },
    {
      file: `packages/android/tokens/${kotlin}/tokens/generated/TokenSet.kt`,
      content: tokenSetKotlin(root),
    },
  ];
  for (const { id } of THEMES) {
    const name = pascal(id);
    const module = `packages/android/theme-${id}`;
    const kotlinPackage = `theme/${id.replaceAll("-", "")}/generated`;
    files.push(
      { file: `packages/web-themes/${id}/theme.css`, content: buildThemeCss(root) },
      {
        file: `packages/ios/Sources/RaincoatTheme${name}/Generated/${name}Theme.swift`,
        content: themeSwift(root, id),
      },
      {
        file: `packages/ios/Tests/RaincoatTheme${name}Tests/Generated/Expected${name}Tokens.swift`,
        content: expectedSwift(root, id),
      },
      {
        file: `${module}/${kotlin}/${kotlinPackage}/${name}Theme.kt`,
        content: themeKotlin(root, id),
      },
      {
        file: `${module}/${kotlinTest}/${kotlinPackage}/Expected${name}Tokens.kt`,
        content: expectedKotlin(root, id),
      },
    );
  }
  return files;
}

/**
 * @returns {Promise<{file: string, status: "written" | "unchanged" | "stale"}[]>}
 */
export async function build(root, { check = false } = {}) {
  return outputs(root).map(({ file, content }) => {
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
}
