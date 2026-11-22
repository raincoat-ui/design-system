// The token linter: everything about the token source that a JSON Schema cannot express.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { compose, DENSITIES, loadSource, MODES } from "./load.js";
import { aliasesIn, aliasTarget, ResolveError, resolvedType, resolveToken } from "./resolve.js";
import { BASE_ID, THEME_ID } from "./theme.js";
import { checkValue } from "./values.js";

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
// Color tokens under these path segments are drawn over something and must state their contrast.
const NEEDS_CONTRAST = ["fg", "border", "focus-ring"];
// The tier each tier may reference. Primitives hold literal values only.
const MAY_REFERENCE = { primitive: null, semantic: "primitive", component: "semantic" };

const camelCase = (name) => name.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());

function literalLeaves(value) {
  if (aliasTarget(value)) return [];
  if (Array.isArray(value)) return value.flatMap(literalLeaves);
  if (value !== null && typeof value === "object")
    return Object.values(value).flatMap(literalLeaves);
  return typeof value === "boolean" ? [] : [value];
}

function sameIds(files, label, problems) {
  if (files.length === 0) return;
  const reference = files[0];
  const expected = new Set(reference.tokens.map((token) => token.id));
  for (const entry of files.slice(1)) {
    const actual = new Set(entry.tokens.map((token) => token.id));
    for (const id of expected) {
      if (!actual.has(id)) {
        problems.add(
          entry.file,
          `${label}: ${id} is defined in ${reference.file} but missing here`,
        );
      }
    }
    for (const id of actual) {
      if (!expected.has(id)) {
        problems.add(
          entry.file,
          `${label}: ${id} is defined here but missing in ${reference.file}`,
        );
      }
    }
  }
}

/** A list of problems that reports each one once. */
function collector() {
  const seen = new Set();
  const list = [];
  return {
    list,
    add(file, message) {
      const key = `${file}\n${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ file, message });
      }
    },
  };
}

function compileSchema(path) {
  const Ajv = Ajv2020.default ?? Ajv2020;
  return new Ajv({ allErrors: true, strict: false }).compile(
    JSON.parse(readFileSync(path, "utf8")),
  );
}

/** Reports what a JSON Schema found wrong with one parsed file. */
function schemaProblems(validate, data, file, problems) {
  if (validate(data)) return;
  for (const error of validate.errors) {
    if (["if", "allOf"].includes(error.keyword)) continue;
    const where = error.instancePath.replaceAll("/", ".").replace(/^\./, "") || "(file root)";
    const detail =
      error.keyword === "additionalProperties"
        ? `unexpected property "${error.params.additionalProperty}" (names are lowercase letters, digits, and hyphens)`
        : error.message;
    problems.add(file, `${where}: ${detail}`);
  }
}

const VARIANT_NAMES = `a dotted name must be color.<${MODES.join("|")}> or density.<${DENSITIES.join("|")}>`;

/** Every value of an axis defines the same tokens: four color modes, two densities. */
function checkAxes(files, problems, where) {
  for (const [axis, values, label] of [
    ["mode", MODES, "color modes"],
    ["density", DENSITIES, "densities"],
  ]) {
    const axisFiles = files.filter((entry) => entry.variant?.axis === axis && !entry.error);
    if (axisFiles.length === 0) continue;
    for (const value of values) {
      if (!axisFiles.some((entry) => entry.variant.value === value)) {
        problems.add(where, `${label}: no file for "${value}"`);
      }
    }
    sameIds(axisFiles, label, problems);
  }
}

/**
 * Checks each combination of mode and density, as that is what gets built: names, tiers,
 * types, values, references, and contrast declarations.
 */
function checkComposition(files, problems) {
  for (const mode of MODES) {
    for (const density of DENSITIES) {
      const { tokens, duplicates } = compose(files, { mode, density });
      for (const duplicate of duplicates) problems.add("tokens/", duplicate);

      const names = new Map();
      const camelNames = new Map();
      for (const token of tokens.values()) {
        const at = `${token.id}:`;

        if (!NAME.test(token.name)) {
          problems.add(token.file, `${at} the flat name "${token.name}" must match ${NAME.source}`);
        }
        for (const [index, key] of [
          [names, token.name],
          [camelNames, camelCase(token.name)],
        ]) {
          const other = index.get(key);
          if (other && other !== token.id) {
            problems.add(token.file, `${at} its name "${key}" collides with ${other}`);
          }
          index.set(key, token.id);
        }

        // Tier direction.
        const allowed = MAY_REFERENCE[token.tier];
        for (const target of aliasesIn(token.value)) {
          const targetToken = tokens.get(target);
          if (!targetToken) continue; // reported by the resolver below
          if (targetToken.tier !== allowed) {
            problems.add(
              token.file,
              allowed
                ? `${at} a ${token.tier} token may only reference ${allowed} tokens, but {${target}} is ${targetToken.tier}`
                : `${at} a primitive token must hold a literal value, not a reference`,
            );
          }
        }
        if (token.tier !== "primitive" && literalLeaves(token.value).length > 0) {
          problems.add(
            token.file,
            `${at} a ${token.tier} token must reference ${allowed} tokens, not hold literal values`,
          );
        }

        // Type and value.
        const type = resolvedType(token.id, tokens);
        const target = aliasTarget(token.value);
        if (!type) {
          problems.add(
            token.file,
            `${at} no $type on the token, its groups, or what it references`,
          );
          continue;
        }
        if (target && tokens.has(target)) {
          const targetType = resolvedType(target, tokens);
          if (targetType && targetType !== type) {
            problems.add(
              token.file,
              `${at} is a ${type} but references {${target}}, a ${targetType}`,
            );
            continue;
          }
        }
        let resolved;
        try {
          resolved = resolveToken(token.id, tokens);
        } catch (error) {
          if (!(error instanceof ResolveError)) throw error;
          problems.add(token.file, `${at} ${error.message}`);
          continue;
        }
        for (const problem of checkValue(type, resolved)) {
          problems.add(token.file, `${at} ${problem}`);
        }

        // Contrast declarations.
        const { on, contrast } = token.extension;
        if ((on || contrast) && type !== "color") {
          problems.add(token.file, `${at} "on" and "contrast" apply to color tokens only`);
        }
        if (
          type === "color" &&
          token.tier !== "primitive" &&
          !contrast &&
          token.path.some((segment) => NEEDS_CONTRAST.includes(segment))
        ) {
          problems.add(
            token.file,
            `${at} a text, border, or focus color must declare "contrast" (and "on"), or be marked exempt with a note`,
          );
        }
        for (const background of on ?? []) {
          if (!tokens.has(background)) {
            problems.add(token.file, `${at} "on" names ${background}, which does not exist`);
          } else if (resolvedType(background, tokens) !== "color") {
            problems.add(token.file, `${at} "on" names ${background}, which is not a color`);
          } else {
            try {
              if ((resolveToken(background, tokens).alpha ?? 1) < 1) {
                problems.add(token.file, `${at} "on" names ${background}, which is translucent`);
              }
            } catch {
              // The background's own problem is reported on that token.
            }
          }
        }
      }
    }
  }
}

/**
 * Lints the token source under `<root>/tokens`.
 * @returns {{file: string, message: string}[]} problems, empty when the source is valid.
 */
export function lint(root, { schemaPath = join(root, "schemas/tokens.schema.json") } = {}) {
  const problems = collector();
  const files = loadSource(root);
  if (files.length === 0) problems.add("tokens/", "no token files found");

  // 1. Structure, by JSON Schema.
  const validate = compileSchema(schemaPath);
  for (const entry of files) {
    if (entry.error) {
      problems.add(entry.file, `not valid JSON: ${entry.error}`);
      continue;
    }
    if (entry.variant?.axis === "unknown") {
      problems.add(entry.file, `unrecognized file name: ${VARIANT_NAMES}`);
    }
    schemaProblems(validate, entry.tree, entry.file, problems);
  }

  // 2. Every value of an axis defines the same tokens.
  checkAxes(files, problems, "tokens/semantic/");

  // 3. Every combination of mode and density.
  checkComposition(files, problems);

  return problems.list;
}

/**
 * Lints one overlay theme loaded by loadTheme: its theme.json, its override files, and then the
 * whole token set it produces, with every rule the base source is held to.
 *
 * @param schemaDir the directory holding theme.schema.json and theme-tokens.schema.json
 * @param inRepo whether the theme is in the Raincoat repository, which names its packages
 *   itself and requires a brand.md
 * @returns {{file: string, message: string}[]}
 */
export function lintTheme(theme, { schemaDir, inRepo = true }) {
  const problems = collector();
  const meta = `${theme.label}/theme.json`;

  // 1. The id, theme.json, and brand.md.
  if (!THEME_ID.test(theme.id)) {
    problems.add(
      theme.label,
      `"${theme.id}" is not a theme id: lowercase letters and digits, words joined by hyphens`,
    );
  } else if (theme.id === BASE_ID) {
    problems.add(theme.label, `"${BASE_ID}" is the token source itself and cannot be a theme`);
  }
  if (theme.metaError === "missing") {
    problems.add(meta, "missing: every theme has a theme.json with its name and description");
  } else if (theme.metaError) {
    problems.add(meta, theme.metaError);
  } else {
    schemaProblems(compileSchema(join(schemaDir, "theme.schema.json")), theme.meta, meta, problems);
    if (inRepo && theme.meta.packages) {
      problems.add(
        meta,
        '"packages" is for themes outside this repository; here package names follow ADR 0012',
      );
    }
  }
  if (inRepo && !existsSync(join(theme.dir, "brand.md"))) {
    problems.add(`${theme.label}/brand.md`, "missing: a theme describes its voice and usage");
  }

  // 2. Each override file mirrors a base file and replaces only overridable tokens.
  const validate = compileSchema(join(schemaDir, "theme-tokens.schema.json"));
  const baseFiles = new Map(
    theme.files.map((entry) => [`${entry.tier}/${entryName(entry)}`, entry]),
  );
  const baseIds = new Map(
    theme.files.flatMap((entry) => entry.tokens.map((token) => [token.id, entry])),
  );
  const ownFiles = [];
  for (const entry of theme.overrides) {
    if (!entry.tier) {
      problems.add(
        entry.file,
        `not a tier: override files go in tokens/${TIERS_LIST}/, mirroring the base source`,
      );
      continue;
    }
    if (!entry.name.endsWith(".tokens.json")) {
      problems.add(entry.file, "not a token file: override files are named <name>.tokens.json");
      continue;
    }
    if (entry.error) {
      problems.add(entry.file, `not valid JSON: ${entry.error}`);
      continue;
    }
    if (entry.variant?.axis === "unknown") {
      problems.add(entry.file, `unrecognized file name: ${VARIANT_NAMES}`);
    }
    const target = baseFiles.get(`${entry.tier}/${entry.name}`);
    if (!target) {
      problems.add(
        entry.file,
        `the base has no tokens/${entry.tier}/${entry.name}: a theme's files mirror the base source`,
      );
      continue;
    }
    schemaProblems(validate, entry.tree, entry.file, problems);
    ownFiles.push(entry);
    const targetIds = new Set(target.tokens.map((token) => token.id));
    for (const token of entry.tokens) {
      const at = `${token.id}:`;
      const home = baseIds.get(token.id);
      if (!targetIds.has(token.id)) {
        problems.add(
          entry.file,
          home
            ? `${at} belongs in tokens/${home.tier}/${entryName(home)}, as in the base`
            : `${at} the base has no such token, and a theme cannot add one`,
        );
        continue;
      }
      const original = target.tokens.find((candidate) => candidate.id === token.id);
      if (!original.extension.overridable) {
        problems.add(
          entry.file,
          `${at} is locked; a theme may only override tokens the base marks overridable`,
        );
      }
    }
  }

  // 3. A token the theme changes in one color mode or density, it changes in all of them, so
  //    that no mode silently keeps the base's value.
  checkAxes(ownFiles, problems, `${theme.label}/tokens/semantic/`);

  // 4. The token set the theme produces, with every rule of the base.
  checkComposition(theme.files, problems);

  return problems.list;
}

const TIERS_LIST = "<primitive|semantic|component>";
const entryName = (entry) => entry.file.split("/").at(-1);
