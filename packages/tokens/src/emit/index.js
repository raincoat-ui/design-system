// Generates every platform's output from the token source.
// Generated files are committed; `check` reports the ones that are out of date instead of
// writing them, which is how CI detects drift and hand edits.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildThemeCss } from "./css.js";

// The base theme is the token source itself. Overlay themes join this list in milestone 2.
const THEMES = [{ id: "raincoat" }];

/**
 * @returns {Promise<{file: string, status: "written" | "unchanged" | "stale"}[]>}
 */
export async function build(root, { check = false } = {}) {
  const outputs = [];
  for (const theme of THEMES) {
    outputs.push({
      file: `packages/web-themes/${theme.id}/theme.css`,
      content: await buildThemeCss(root),
    });
  }

  return outputs.map(({ file, content }) => {
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
