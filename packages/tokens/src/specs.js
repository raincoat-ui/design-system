// Component specs: the platform-neutral contract of each component, in
// specs/components/<id>/spec.yaml. This module loads them and checks what a schema cannot.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";
import { compose, DENSITIES, loadSource, MODES } from "./load.js";
import { lintSnapshots } from "./snapshots.js";

/** The language of each platform's components, which an implementation's file must be in. */
const SOURCE_LANGUAGES = {
  web: { language: "TypeScript", extensions: [".tsx", ".ts"] },
  ios: { language: "Swift", extensions: [".swift"] },
  android: { language: "Kotlin", extensions: [".kt"] },
};

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

const pascal = (name) =>
  name
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");

/**
 * The properties of a spec, in groups: the component's own, or, for a spec with parts, each
 * part's. `name` is what the group's types are named after: the component, or the part.
 * @returns {{part: string|null, name: string, properties: object}[]}
 */
export function propertyGroups(spec) {
  if (spec.parts) {
    return Object.entries(spec.parts).map(([part, { name, properties }]) => ({
      part,
      name,
      properties,
    }));
  }
  return [{ part: null, name: spec.name, properties: spec.properties }];
}

/**
 * The properties of a spec that have a fixed set of values, such as variant and size, each
 * with the name of the type generated for it: the component's or part's name, then the
 * property's. A default that depends on another property is given as `defaultBy`:
 * {property, keyType, values: {<that property's value>: <this property's value>}}, where
 * `keyType` is "integer" for a whole number, or else the type generated for that property.
 */
export function enumerations(spec) {
  return propertyGroups(spec).flatMap(({ part, name: owner, properties }) =>
    Object.entries(properties)
      .filter(([, property]) => property.values)
      .map(([name, property]) => {
        const [by] = typeof property.default === "object" ? Object.entries(property.default) : [];
        const keyType = by && (properties[by[0]]?.values ? `${owner}${pascal(by[0])}` : "integer");
        return {
          name,
          part,
          component: owner,
          type: `${owner}${pascal(name)}`,
          description: property.description,
          default: by ? undefined : property.default,
          defaultBy: by ? { property: by[0], keyType, values: by[1] } : undefined,
          values: Object.entries(property.values).map(([value, description]) => ({
            value,
            description,
          })),
        };
      }),
  );
}

/** The values a property can take, as text: those of its list, or each whole number in range. */
function valuesOf(property) {
  if (property.values) return Object.keys(property.values);
  if (property.type === "integer" && property.maximum !== undefined) {
    const count = property.maximum - property.minimum + 1;
    return Array.from({ length: Math.max(0, count) }, (_, index) =>
      String(property.minimum + index),
    );
  }
  return undefined;
}

/** Problems with the properties of one group, each as [where, message]. */
function propertyProblems(properties, prefix) {
  const problems = [];
  const add = (name, message) => problems.push(`${prefix}${name}: ${message}`);
  for (const [name, property] of Object.entries(properties)) {
    const integer = property.type === "integer";
    for (const field of ["minimum", "maximum", "required"]) {
      if (!integer && property[field] !== undefined) {
        add(name, `only a whole number has "${field}"`);
      }
    }
    if (property.values) {
      const standard = property.default;
      if (standard === undefined) {
        add(name, "needs a default");
      } else if (typeof standard === "object") {
        const entries = Object.entries(standard);
        const other = entries.length === 1 ? properties[entries[0][0]] : undefined;
        const keys = other && entries[0][0] !== name ? valuesOf(other) : undefined;
        if (!keys) {
          add(
            name,
            "a default that depends on another property names one property of the same part, whose values are listed or bounded",
          );
          continue;
        }
        const [by, map] = entries[0];
        const missing = keys.filter((key) => !Object.hasOwn(map, key));
        const extra = Object.keys(map).filter((key) => !keys.includes(key));
        if (missing.length > 0)
          add(name, `the default gives no value for ${by} ${missing.join(", ")}`);
        if (extra.length > 0)
          add(name, `the default maps ${extra.join(", ")}, which ${by} cannot be`);
        for (const value of Object.values(map)) {
          if (!Object.hasOwn(property.values, value)) {
            add(name, `the default "${value}" is not one of its values`);
          }
        }
      } else if (!Object.hasOwn(property.values, standard)) {
        add(name, `the default "${standard}" is not one of its values`);
      }
    } else if (property.type === "boolean") {
      if (typeof property.default !== "boolean") {
        add(name, "the default of a boolean must be true or false");
      }
    } else if (integer) {
      const { minimum, maximum, default: standard, required } = property;
      if (minimum === undefined) add(name, "a whole number needs a minimum");
      if (maximum !== undefined && minimum !== undefined && maximum < minimum) {
        add(name, "the maximum is less than the minimum");
      }
      if (standard !== undefined) {
        if (required) add(name, "a required property has no default");
        if (!Number.isInteger(standard)) add(name, "the default must be a whole number");
        else if (standard < minimum || (maximum !== undefined && standard > maximum)) {
          add(name, `the default ${standard} is out of range`);
        }
      }
    }
  }
  return problems;
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
        if (issue.keyword === "oneOf" && issue.instancePath === "") {
          add(`(spec root): needs either "properties" or "parts", not both`);
        } else if (issue.keyword === "oneOf") {
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

    // Defaults are among the allowed values, and whole numbers have a range.
    const groups = propertyGroups(spec);
    for (const { part, properties } of groups) {
      for (const message of propertyProblems(
        properties,
        part ? `parts.${part}.properties.` : "properties.",
      )) {
        add(message);
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

    // Every variant of a component has tokens of its own. (The variants of a part, such as
    // Typography's, name the semantic text styles it sets text in.)
    for (const variant of Object.keys(spec.properties?.variant?.values ?? {})) {
      if (!tokenIds.some((tokenId) => tokenId.startsWith(`${id}.${variant}.`))) {
        add(`properties.variant: no tokens under "${id}.${variant}."`);
      }
    }

    // Examples use real properties and values, and give every required property.
    const seen = new Set();
    for (const example of spec.examples) {
      if (seen.has(example.id)) add(`examples: "${example.id}" is used twice`);
      seen.add(example.id);
      const where = `examples.${example.id}`;
      let properties = spec.properties;
      if (spec.parts) {
        properties = spec.parts[example.part]?.properties;
        if (!properties) {
          add(
            example.part === undefined
              ? `${where}: needs a part, one of ${Object.keys(spec.parts).join(", ")}`
              : `${where}: "${example.part}" is not a part`,
          );
          continue;
        }
      } else if (example.part !== undefined) {
        add(`${where}: the spec has no parts`);
      }
      const check = (name, value) => {
        const property = properties[name];
        if (!property) {
          add(`${where}: "${name}" is not a property`);
        } else if (property.values && !Object.hasOwn(property.values, value)) {
          add(`${where}: "${value}" is not a value of ${name}`);
        } else if (property.type === "boolean" && typeof value !== "boolean") {
          add(`${where}: ${name} must be true or false`);
        } else if (
          property.type === "integer" &&
          (!Number.isInteger(value) ||
            value < property.minimum ||
            (property.maximum !== undefined && value > property.maximum))
        ) {
          add(`${where}: ${name} must be a whole number in its range, not ${value}`);
        }
      };
      for (const [name, value] of Object.entries(example.properties ?? {})) check(name, value);
      for (const [name, values] of Object.entries(example.matrix ?? {})) {
        for (const value of values) check(name, value);
      }
      for (const [name, property] of Object.entries(properties)) {
        const given =
          Object.hasOwn(example.properties ?? {}, name) ||
          Object.hasOwn(example.matrix ?? {}, name);
        if (property.required && !given) add(`${where}: needs ${name}, which is required`);
      }
    }

    // Each implementation is a file in the repository, in its platform's language, that
    // mentions every name the spec gives the component there.
    for (const [platform, { file: source, name }] of Object.entries(spec.implementations ?? {})) {
      const where = `implementations.${platform}`;
      const path = resolve(root, source);
      const inside = relative(root, path);
      if (isAbsolute(source) || inside === ".." || inside.startsWith(`..${sep}`)) {
        add(`${where}: ${source} is not a path inside the repository`);
        continue;
      }
      const { language, extensions } = SOURCE_LANGUAGES[platform];
      if (!extensions.some((extension) => source.endsWith(extension))) {
        add(`${where}: ${source} is not a ${language} file`);
      }
      if (!existsSync(path) || !statSync(path).isFile()) {
        add(`${where}: ${source} does not exist`);
        continue;
      }
      const text = readFileSync(path, "utf8");
      const identifiers = [name].flat().flatMap((each) => each.match(/[A-Za-z]\w*/g) ?? []);
      for (const identifier of identifiers) {
        if (!new RegExp(`\\b${identifier}\\b`).test(text)) {
          add(`${where}: ${source} does not mention "${identifier}"`);
        }
      }
    }
  }
  problems.push(...lintSnapshots(root, valid, { schemaDir: dirname(schemaPath) }));
  return problems;
}
