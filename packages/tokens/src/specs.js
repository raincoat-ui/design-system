// Component specs: the platform-neutral contract of each component, in
// specs/components/<id>/spec.yaml. This module loads them and checks what a schema cannot.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";
import { compose, DENSITIES, loadSource, MODES } from "./load.js";
import { lintSnapshots } from "./snapshots.js";

/**
 * Loads every component spec.
 * @returns {{id: string, file: string, spec: object|null, error: string|null}[]}
 */
export function loadSpecs(root) {
  const dir = join(root, "specs/components");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((id) => {
      const file = `specs/components/${id}/spec.yaml`;
      try {
        return { id, file, spec: parseYaml(readFileSync(join(root, file), "utf8")), error: null };
      } catch (error) {
        return { id, file, spec: null, error: error.message };
      }
    });
}

/** The properties of a spec that have a fixed set of values, such as variant and size. */
export function enumerations(spec) {
  return Object.entries(spec.properties)
    .filter(([, property]) => property.values)
    .map(([name, property]) => ({
      name,
      description: property.description,
      default: property.default,
      values: Object.entries(property.values).map(([value, description]) => ({
        value,
        description,
      })),
    }));
}

/**
 * Lints the component specs under `<root>/specs/components`, the text of their examples, and
 * the snapshot matrix.
 * @returns {{file: string, message: string}[]} problems, empty when every spec is valid.
 */
export function lintSpecs(
  root,
  { schemaPath = join(root, "schemas/component-spec.schema.json") } = {},
) {
  const problems = [];
  const specs = loadSpecs(root);
  if (specs.length === 0) return problems;

  const Ajv = Ajv2020.default ?? Ajv2020;
  const validate = new Ajv({ allErrors: true, strict: false }).compile(
    JSON.parse(readFileSync(schemaPath, "utf8")),
  );
  const tokens = compose(loadSource(root), { mode: MODES[0], density: DENSITIES[0] }).tokens;
  const tokenIds = [...tokens.keys()];
  const rfcs = existsSync(join(root, "rfcs")) ? readdirSync(join(root, "rfcs")) : [];
  const valid = [];

  for (const { id, file, spec, error } of specs) {
    const add = (message) => problems.push({ file, message });
    if (error) {
      add(`not valid YAML: ${error}`);
      continue;
    }
    if (!validate(spec)) {
      for (const issue of validate.errors) {
        if (issue.keyword === "oneOf") {
          add(
            `${issue.instancePath.slice(1).replaceAll("/", ".")}: needs either "values" or "type"`,
          );
        } else {
          const where = issue.instancePath.slice(1).replaceAll("/", ".") || "(spec root)";
          const extra = issue.params?.additionalProperty
            ? ` "${issue.params.additionalProperty}"`
            : "";
          add(`${where}: ${issue.message}${extra}`);
        }
      }
      continue;
    }
    valid.push({ id, spec });

    if (spec.id !== id) add(`id is "${spec.id}" but the directory is "${id}"`);
    if (!existsSync(join(root, `specs/components/${id}/guidelines.md`))) {
      add("guidelines.md is missing beside the spec");
    }

    // The RFC that proposed the component must exist and be accepted.
    const number = String(spec.rfc).padStart(4, "0");
    const rfcFile = rfcs.find((name) => name.startsWith(`${number}-`) && name.endsWith(".md"));
    if (!rfcFile) {
      add(`rfc ${spec.rfc}: no file rfcs/${number}-*.md`);
    } else if (!/^- Status: accepted\b/m.test(readFileSync(join(root, "rfcs", rfcFile), "utf8"))) {
      add(`rfc ${spec.rfc}: rfcs/${rfcFile} is not accepted`);
    }

    // Defaults are among the allowed values.
    for (const [name, property] of Object.entries(spec.properties)) {
      if (property.values && !Object.hasOwn(property.values, property.default)) {
        add(`properties.${name}: the default "${property.default}" is not one of its values`);
      }
      if (property.type === "boolean" && typeof property.default !== "boolean") {
        add(`properties.${name}: the default of a boolean must be true or false`);
      }
    }

    // Token references point at real tokens. "x.*" means every token under x.
    for (const [part, { tokens: references = [] }] of Object.entries(spec.anatomy)) {
      for (const reference of references) {
        const found = reference.endsWith(".*")
          ? tokenIds.some((tokenId) => tokenId.startsWith(reference.slice(0, -1)))
          : tokens.has(reference);
        if (!found) add(`anatomy.${part}: no token matches "${reference}"`);
      }
    }

    // Every variant has tokens of its own.
    for (const variant of Object.keys(spec.properties.variant?.values ?? {})) {
      if (!tokenIds.some((tokenId) => tokenId.startsWith(`${id}.${variant}.`))) {
        add(`properties.variant: no tokens under "${id}.${variant}."`);
      }
    }

    // Examples use real properties and values.
    const seen = new Set();
    for (const example of spec.examples) {
      if (seen.has(example.id)) add(`examples: "${example.id}" is used twice`);
      seen.add(example.id);
      const check = (name, value) => {
        const property = spec.properties[name];
        if (!property) {
          add(`examples.${example.id}: "${name}" is not a property`);
        } else if (property.values && !Object.hasOwn(property.values, value)) {
          add(`examples.${example.id}: "${value}" is not a value of ${name}`);
        } else if (property.type === "boolean" && typeof value !== "boolean") {
          add(`examples.${example.id}: ${name} must be true or false`);
        }
      };
      for (const [name, value] of Object.entries(example.properties ?? {})) check(name, value);
      for (const [name, values] of Object.entries(example.matrix ?? {})) {
        for (const value of values) check(name, value);
      }
    }
  }
  problems.push(...lintSnapshots(root, valid, { schemaDir: dirname(schemaPath) }));
  return problems;
}
