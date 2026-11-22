// What the command line works on. Either the Raincoat repository, which holds the base token
// source in tokens/ and its themes in themes/, or a theme pack: any other directory with a
// themes/ directory, whose themes are built on the base source that ships inside this package.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadThemes } from "./theme.js";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * The directory that holds the base `tokens/` and `schemas/` this package was released with.
 * A published package carries a copy in `base/` (scripts/bundle.mjs); inside the repository
 * it is the repository itself.
 */
export function bundledBase() {
  for (const candidate of [join(packageRoot, "base"), join(packageRoot, "../..")]) {
    if (existsSync(join(candidate, "tokens/theme.json"))) return candidate;
  }
  throw new Error(`no base token source found next to ${packageRoot}`);
}

/** The version of this package, which is the version of every Raincoat package. */
export function raincoatVersion() {
  return JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version;
}

/**
 * @param root the directory the command runs in
 * @returns {{root, inRepo, baseRoot, schemaDir, themes: object[]}}
 */
export function openProject(root) {
  const inRepo = existsSync(join(root, "tokens/theme.json"));
  const baseRoot = inRepo ? root : bundledBase();
  return {
    root,
    inRepo,
    baseRoot,
    schemaDir: join(baseRoot, "schemas"),
    themes: loadThemes({ root, baseRoot, inRepo }),
  };
}
