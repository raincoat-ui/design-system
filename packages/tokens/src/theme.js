// Themes. The base theme is the token source itself. Every other theme is a directory of
// overrides on top of it (ADR 0010, ADR 0018):
//
//   themes/<id>/theme.json                          its name and a one-line description
//   themes/<id>/tokens/<tier>/<name>.tokens.json    new values for tokens of the base file
//                                                   tokens/<tier>/<name>.tokens.json
//   themes/<id>/brand.md                            voice and usage
//
// An override replaces a token's value and nothing else. Types, descriptions, and contrast
// declarations stay the base's, so every rule and every check applies to every theme alike.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { flatten, loadSource, TIERS, variantOf } from "./load.js";

/** A theme id: lowercase letters and digits, in words joined by hyphens. */
export const THEME_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const BASE_ID = "base";

const posix = (path) => path.split(sep).join("/");

function readMeta(file) {
  try {
    return { meta: JSON.parse(readFileSync(file, "utf8")), metaError: null };
  } catch (error) {
    return {
      meta: null,
      metaError: error.code === "ENOENT" ? "missing" : `not valid JSON: ${error.message}`,
    };
  }
}

/** The base theme: the token source under `<root>/tokens`. */
export function baseTheme(root) {
  return {
    id: BASE_ID,
    base: true,
    dir: join(root, "tokens"),
    label: "tokens",
    ...readMeta(join(root, "tokens/theme.json")),
    files: loadSource(root),
    overrides: [],
  };
}

/** The directories under `<root>/themes`, one per theme, sorted by name. */
export function themeDirs(root) {
  const dir = join(root, "themes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith(".") && statSync(join(dir, name)).isDirectory())
    .sort()
    .map((name) => join(dir, name));
}

/** Every override file under `<dir>/tokens`, flattened like the base source. */
function loadOverrides(dir, root) {
  const entries = [];
  const tokensDir = join(dir, "tokens");
  if (!existsSync(tokensDir)) return entries;
  for (const tier of readdirSync(tokensDir).sort()) {
    const tierDir = join(tokensDir, tier);
    if (!statSync(tierDir).isDirectory()) {
      entries.push({ file: posix(relative(root, tierDir)), tier: null, name: tier, tokens: [] });
      continue;
    }
    for (const name of readdirSync(tierDir).sort()) {
      const path = join(tierDir, name);
      const entry = {
        file: posix(relative(root, path)),
        tier: TIERS.includes(tier) ? tier : null,
        tierName: tier,
        name,
        variant: name.endsWith(".tokens.json")
          ? variantOf(name.slice(0, -".tokens.json".length))
          : null,
        tree: null,
        tokens: [],
        error: null,
      };
      if (name.endsWith(".tokens.json")) {
        try {
          entry.tree = JSON.parse(readFileSync(path, "utf8"));
          entry.tokens = flatten(entry.tree, { tier, file: entry.file });
        } catch (error) {
          entry.error = error.message;
        }
      }
      entries.push(entry);
    }
  }
  return entries;
}

/**
 * Loads one theme directory over the base token source.
 *
 * `files` is the base source with the theme's values in place: what every check and emitter
 * reads. A token the theme replaced carries `overridden: true`, `baseValue`, and the theme's
 * file as its `file`. Overrides the base does not allow are left out of `files` and reported by
 * lintTheme.
 *
 * @param baseRoot the directory that holds the base `tokens/`
 * @param dir the theme's directory
 * @param root the directory file names are given relative to
 */
export function loadTheme(baseRoot, dir, { root = baseRoot } = {}) {
  const base = loadSource(baseRoot);
  const files = base.map((entry) => ({
    ...entry,
    tokens: entry.tokens.map((token) => ({ ...token })),
  }));
  const byFile = new Map(files.map((entry) => [entry.file, entry]));
  const overrides = loadOverrides(dir, root);
  for (const entry of overrides) {
    const target = entry.tier && byFile.get(`tokens/${entry.tier}/${entry.name}`);
    if (!target) continue;
    const tokens = new Map(target.tokens.map((token) => [token.id, token]));
    for (const override of entry.tokens) {
      const token = tokens.get(override.id);
      if (!token?.extension.overridable) continue;
      token.baseValue = token.value;
      token.value = override.value;
      token.file = entry.file;
      token.overridden = true;
    }
  }
  return {
    id: basename(dir),
    base: false,
    dir,
    label: posix(relative(root, dir)),
    ...readMeta(join(dir, "theme.json")),
    files,
    overrides,
  };
}

/** Every theme of a project: the base theme when the project holds it, then each overlay. */
export function loadThemes({ root, baseRoot, inRepo }) {
  return [
    ...(inRepo ? [baseTheme(baseRoot)] : []),
    ...themeDirs(root).map((dir) => loadTheme(baseRoot, dir, { root })),
  ];
}
