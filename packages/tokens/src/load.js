// Reads the token source from disk and flattens it into a list of tokens.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TIERS = ["primitive", "semantic", "component"];
export const MODES = ["light", "dark", "light-hc", "dark-hc"];
export const DENSITIES = ["comfortable", "compact"];

/**
 * A file named `<family>.<variant>.tokens.json` belongs to one value of an axis:
 * `color.<mode>` to a color mode, `density.<density>` to a density. Any other file applies always.
 */
export function variantOf(stem) {
  const parts = stem.split(".");
  if (parts.length === 1) return null;
  const [family, value] = parts;
  if (parts.length === 2 && family === "color" && MODES.includes(value)) {
    return { axis: "mode", value };
  }
  if (parts.length === 2 && family === "density" && DENSITIES.includes(value)) {
    return { axis: "density", value };
  }
  return { axis: "unknown", value: stem };
}

/** Flattens one token tree. A group's `$type` is inherited by the tokens beneath it. */
export function flatten(tree, { tier, file }) {
  const tokens = [];
  const walk = (node, path, inheritedType) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || child === null || typeof child !== "object") continue;
      const childPath = [...path, key];
      if (Object.hasOwn(child, "$value")) {
        tokens.push({
          path: childPath,
          id: childPath.join("."),
          name: childPath.join("-"),
          value: child.$value,
          type: child.$type ?? inheritedType,
          description: child.$description,
          extension: child.$extensions?.raincoat ?? {},
          deprecated: child.$deprecated,
          tier,
          file,
        });
      } else {
        walk(child, childPath, child.$type ?? inheritedType);
      }
    }
  };
  walk(tree, [], tree.$type);
  return tokens;
}

/**
 * Loads every token file under `<root>/tokens/<tier>/`.
 * @returns {{file: string, tier: string, variant: object|null, tree: object, tokens: object[]}[]}
 */
export function loadSource(root) {
  const files = [];
  for (const tier of TIERS) {
    const dir = join(root, "tokens", tier);
    let names = [];
    try {
      names = readdirSync(dir)
        .filter((name) => name.endsWith(".tokens.json"))
        .sort();
    } catch {
      continue;
    }
    for (const name of names) {
      const file = `tokens/${tier}/${name}`;
      const entry = {
        file,
        tier,
        variant: variantOf(name.slice(0, -".tokens.json".length)),
        tree: null,
        tokens: [],
        error: null,
      };
      try {
        entry.tree = JSON.parse(readFileSync(join(dir, name), "utf8"));
        entry.tokens = flatten(entry.tree, { tier, file });
      } catch (error) {
        entry.error = error.message;
      }
      files.push(entry);
    }
  }
  return files;
}

/**
 * Selects the tokens for one color mode and density.
 * @returns {{tokens: Map<string, object>, duplicates: string[]}}
 */
export function compose(files, { mode, density }) {
  const tokens = new Map();
  const duplicates = [];
  for (const entry of files) {
    const { variant } = entry;
    if (variant?.axis === "mode" && variant.value !== mode) continue;
    if (variant?.axis === "density" && variant.value !== density) continue;
    if (variant?.axis === "unknown") continue;
    for (const token of entry.tokens) {
      const existing = tokens.get(token.id);
      if (existing) {
        duplicates.push(`${token.id} is defined in both ${existing.file} and ${token.file}`);
      } else {
        tokens.set(token.id, token);
      }
    }
  }
  return { tokens, duplicates };
}
