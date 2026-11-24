// The visual snapshot matrix, in specs/snapshots.yaml, and the text each component's examples
// show in its locales, in specs/components/<id>/strings.yaml. This module loads both, checks
// what a schema cannot, derives the expanded pseudo-locale from English, and gives the emitters
// the matrix and each component's examples in the form every platform's tests use.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";
import { MODES } from "./load.js";

export const MATRIX_FILE = "specs/snapshots.yaml";
export const stringsFile = (id) => `specs/components/${id}/strings.yaml`;

// The expanded pseudo-locale. Each letter takes an accent, above or below, so that text which
// clips its ascenders or descenders shows it; whole words are added until the text is about 40%
// longer, the brackets included, as many translations are; and the brackets show where a text
// that was cut short ends.
const ACCENTED = Object.fromEntries(
  [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter, index) => [
    letter,
    [..."åƀçðéƒĝĥîĵķļɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŢÛṼŴẊÝŽ"][index],
  ]),
);
const FILLER = "one two three four five six seven eight nine ten".split(" ");
const EXPANSION = 1.4;

/** English, accented, about 40% longer, and in brackets: "[Šåṽé çĥåñĝéš one]". */
export function expandText(english) {
  const length = (text) => [...text].length;
  const target = Math.ceil(length(english) * EXPANSION);
  let text = [...english].map((character) => ACCENTED[character] ?? character).join("");
  for (let word = 0; length(text) + 2 < target; word++) text += ` ${FILLER[word % FILLER.length]}`;
  return `[${text}]`;
}

const PSEUDO = { expanded: expandText };

function readYaml(root, file) {
  try {
    return { data: parseYaml(readFileSync(join(root, file), "utf8")), error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

function compile(schemaDir, name) {
  const Ajv = Ajv2020.default ?? Ajv2020;
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(JSON.parse(readFileSync(join(schemaDir, name), "utf8")));
}

const schemaProblems = (validate) =>
  validate.errors.map((issue) => {
    const where = issue.instancePath.slice(1).replaceAll("/", ".") || "(file root)";
    const extra = issue.params?.additionalProperty ? ` "${issue.params.additionalProperty}"` : "";
    return `${where}: ${issue.message}${extra}`;
  });

/** Reads specs/snapshots.yaml. Throws when it is missing or not YAML; lint says why first. */
export function loadMatrix(root) {
  const { data, error } = readYaml(root, MATRIX_FILE);
  if (error) throw new Error(`${MATRIX_FILE}: ${error}. Run \`pnpm tokens:lint\`.`);
  return data;
}

/** The locales whose text is written by hand: every locale but a pseudo-locale. */
export const writtenLocales = (matrix) =>
  Object.keys(matrix.locales).filter((locale) => !matrix.locales[locale].pseudo);

/**
 * Every snapshot, with each dimension resolved:
 * {id, description, mode, locale, direction, textSize: {id, web, ios, android}}.
 */
export function resolveSnapshots(matrix) {
  return matrix.snapshots.map((snapshot) => {
    const locale = snapshot.locale ?? matrix.defaults.locale;
    const textSize = snapshot["text-size"] ?? matrix.defaults["text-size"];
    return {
      id: snapshot.id,
      description: snapshot.description,
      mode: snapshot.mode ?? matrix.defaults.mode,
      locale,
      direction: matrix.locales[locale]?.direction ?? "ltr",
      textSize: { id: textSize, ...matrix["text-sizes"][textSize] },
    };
  });
}

/** Every combination of the values in an example's matrix, in the order the spec lists them. */
function combinations(matrix = {}) {
  return Object.entries(matrix).reduce(
    (partial, [name, values]) =>
      partial.flatMap((combination) => values.map((value) => ({ ...combination, [name]: value }))),
    [{}],
  );
}

/**
 * The examples of a spec, each with its instances and its text in every locale of the matrix:
 * {id, description, instances: [{<property>: value}], text: {<locale>: {<content>: text}}}.
 * An instance sets every property of the spec: the example's value, or else the default.
 */
export function componentExamples(root, spec, matrix) {
  const file = stringsFile(spec.id);
  const { data: strings, error } = readYaml(root, file);
  if (error) throw new Error(`${file}: ${error}. Run \`pnpm tokens:lint\`.`);
  const defaults = Object.fromEntries(
    Object.entries(spec.properties).map(([name, property]) => [name, property.default]),
  );
  return spec.examples.map((example) => {
    const written = strings.examples?.[example.id];
    if (!written) throw new Error(`${file}: no text for the example "${example.id}"`);
    const text = Object.fromEntries(
      Object.entries(matrix.locales).map(([locale, { pseudo }]) => [
        locale,
        Object.fromEntries(
          Object.entries(written).map(([content, byLocale]) => [
            content,
            pseudo ? PSEUDO[pseudo](byLocale.en) : byLocale[locale],
          ]),
        ),
      ]),
    );
    return {
      id: example.id,
      description: example.description,
      instances: combinations(example.matrix).map((combination) => ({
        ...defaults,
        ...example.properties,
        ...combination,
      })),
      text,
    };
  });
}

/**
 * Lints the snapshot matrix and the strings of each component.
 * @param specs the specs that are otherwise valid: [{id, spec}]
 * @returns {{file: string, message: string}[]}
 */
export function lintSnapshots(root, specs, { schemaDir = join(root, "schemas") } = {}) {
  const problems = [];
  const report = (file) => (message) => problems.push({ file, message });

  const add = report(MATRIX_FILE);
  if (!existsSync(join(root, MATRIX_FILE))) {
    add("missing: it lists the visual snapshots every component has");
    return problems;
  }
  const { data: matrix, error } = readYaml(root, MATRIX_FILE);
  if (error) {
    add(`not valid YAML: ${error}`);
    return problems;
  }
  const validateMatrix = compile(schemaDir, "snapshots.schema.json");
  if (!validateMatrix(matrix)) {
    for (const message of schemaProblems(validateMatrix)) add(message);
    return problems;
  }

  const locales = matrix.locales;
  const textSizes = matrix["text-sizes"];
  const checkDimensions = (where, { mode, locale, "text-size": textSize }) => {
    if (mode !== undefined && !MODES.includes(mode)) {
      add(`${where}: "${mode}" is not a color mode (${MODES.join(", ")})`);
    }
    if (locale !== undefined && !Object.hasOwn(locales, locale)) {
      add(`${where}: "${locale}" is not one of the locales`);
    }
    if (textSize !== undefined && !Object.hasOwn(textSizes, textSize)) {
      add(`${where}: "${textSize}" is not one of the text sizes`);
    }
  };
  checkDimensions("defaults", matrix.defaults);
  if (locales[matrix.defaults.locale]?.pseudo) {
    add(`defaults: the default locale cannot be a pseudo-locale`);
  }
  if (Object.values(locales).some(({ pseudo }) => pseudo) && !locales.en) {
    add(`locales: a pseudo-locale is derived from English, so "en" must be a locale`);
  }
  const seen = new Map();
  for (const snapshot of matrix.snapshots) {
    const where = `snapshots.${snapshot.id}`;
    checkDimensions(where, snapshot);
    if (seen.has(snapshot.id)) add(`snapshots: "${snapshot.id}" is used twice`);
    seen.set(snapshot.id, snapshot);
  }
  if (problems.length > 0) return problems;
  const drawn = new Map();
  for (const snapshot of resolveSnapshots(matrix)) {
    const key = `${snapshot.mode} ${snapshot.locale} ${snapshot.textSize.id}`;
    if (drawn.has(key)) add(`snapshots.${snapshot.id}: draws the same as "${drawn.get(key)}"`);
    drawn.set(key, snapshot.id);
  }

  const written = writtenLocales(matrix);
  const validateStrings = compile(schemaDir, "component-strings.schema.json");
  for (const { id, spec } of specs) {
    const file = stringsFile(id);
    const problem = report(file);
    if (!existsSync(join(root, file))) {
      problem("missing: it holds the text of the spec's examples, for the snapshots");
      continue;
    }
    const { data: strings, error } = readYaml(root, file);
    if (error) {
      problem(`not valid YAML: ${error}`);
      continue;
    }
    if (!validateStrings(strings)) {
      for (const message of schemaProblems(validateStrings)) problem(message);
      continue;
    }

    const examples = new Map(spec.examples.map((example) => [example.id, example]));
    for (const exampleId of examples.keys()) {
      if (!Object.hasOwn(strings.examples, exampleId)) {
        problem(`examples: no text for the example "${exampleId}" of spec.yaml`);
      }
    }
    for (const [exampleId, contents] of Object.entries(strings.examples)) {
      const example = examples.get(exampleId);
      if (!example) {
        problem(`examples.${exampleId}: spec.yaml has no example "${exampleId}"`);
        continue;
      }
      for (const [content, byLocale] of Object.entries(contents)) {
        const where = `examples.${exampleId}.${content}`;
        if (!Object.hasOwn(spec.content ?? {}, content)) {
          problem(`${where}: "${content}" is not content of the spec`);
        }
        for (const locale of written) {
          if (!Object.hasOwn(byLocale, locale)) problem(`${where}: no text in "${locale}"`);
        }
        for (const [locale, text] of Object.entries(byLocale)) {
          if (locales[locale]?.pseudo) {
            problem(`${where}.${locale}: a pseudo-locale is derived from English; remove it`);
          } else if (!Object.hasOwn(locales, locale)) {
            problem(`${where}.${locale}: "${locale}" is not a locale of ${MATRIX_FILE}`);
          }
          if (text !== text.trim()) problem(`${where}.${locale}: starts or ends with a space`);
          if (text !== text.normalize("NFC")) {
            problem(`${where}.${locale}: not in Unicode's composed form (NFC)`);
          }
        }
        // An example that names its label in the spec shows that label in English.
        if (content === "label" && example.label !== undefined && byLocale.en !== example.label) {
          problem(`${where}.en: spec.yaml gives this example the label "${example.label}"`);
        }
      }
    }
  }
  return problems;
}
