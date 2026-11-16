// Emits Kotlin for the Android modules: the structure of a token set, each theme's values, and
// the expected values the Kotlin contract test compares against.
import { compose, DENSITIES, loadSource, MODES } from "../load.js";
import {
  camel,
  expectedEntries,
  families,
  groupsOf,
  HEADER,
  hexParts,
  indent,
  milliseconds,
  pascal,
  permutations,
  points,
  tidy,
  tree,
  weight,
} from "./shared.js";

const TOKENS_PACKAGE = "io.github.raincoatui.tokens";
const themePackage = (themeId) => `io.github.raincoatui.theme.${themeId.replaceAll("-", "")}`;

// The Kotlin type of each token type, and the TokenFormat function that writes it as text.
const KOTLIN = {
  color: { type: "TokenColor", format: "color" },
  dimension: { type: "Double", format: "number" },
  duration: { type: "Int", format: "milliseconds" },
  number: { type: "Double", format: "number" },
  fontWeight: { type: "Int", format: "integer" },
  fontFamily: { type: "List<String>", format: "families" },
  cubicBezier: { type: "TokenEasing", format: "easing" },
  typography: { type: "TokenTextStyle", format: "textStyle" },
};

// Kotlin's hard keywords need backticks when used as a name.
const KEYWORDS = new Set(
  "as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while".split(
    " ",
  ),
);

const MODE_ENTRY = {
  light: "Light",
  dark: "Dark",
  "light-hc": "LightHighContrast",
  "dark-hc": "DarkHighContrast",
};

/** A token path segment as a Kotlin property name: `on-accent` -> onAccent, `4` -> _4. */
function member(segment) {
  const name = /^[0-9]/.test(segment) ? `_${segment}` : camel(segment);
  return KEYWORDS.has(name) ? `\`${name}\`` : name;
}
const typeName = (path) => `${path.map(pascal).join("")}Tokens`;
const qualified = (path) =>
  path.length === 0 ? "RaincoatTokenSet" : `RaincoatTokenSet.${typeName(path)}`;

function kotlinOf(type) {
  if (!KOTLIN[type]) {
    throw new Error(`the Kotlin emitter does not support the type "${type}" yet`);
  }
  return KOTLIN[type];
}

/** A Double literal: Kotlin needs the decimal point. */
const double = (value) => {
  const text = String(tidy(value));
  return /[.e]/.test(text) ? text : `${text}.0`;
};
const strings = (value) =>
  `listOf(${families(value)
    .map((name) => JSON.stringify(name).replaceAll("$", "\\$"))
    .join(", ")})`;

/** A resolved value as a Kotlin expression. */
function literal(type, value) {
  switch (type) {
    case "color": {
      const { rgb, alphaByte } = hexParts(value);
      return `TokenColor(0x${alphaByte.toUpperCase()}${rgb.toUpperCase()})`;
    }
    case "dimension":
      return double(points(value));
    case "duration":
      return String(Math.round(milliseconds(value)));
    case "number":
      return double(value);
    case "fontWeight":
      return String(weight(value));
    case "fontFamily":
      return strings(value);
    case "cubicBezier":
      return `TokenEasing(${value.map(double).join(", ")})`;
    case "typography":
      return `TokenTextStyle(families = ${strings(value.fontFamily)}, size = ${double(points(value.fontSize))}, weight = ${weight(value.fontWeight)}, letterSpacing = ${double(points(value.letterSpacing))}, lineHeight = ${double(value.lineHeight)})`;
    default:
      throw new Error(`the Kotlin emitter does not support the type "${type}" yet`);
  }
}

function classBody(node) {
  const groups = [...node.groups.entries()].map(
    ([segment, child]) => `public val ${member(segment)}: ${typeName(child.path)},`,
  );
  const leaves = node.leaves.flatMap((leaf) => [
    `/** ${leaf.token.description.replaceAll("*/", "* /")} */`,
    `public val ${member(leaf.segment)}: ${kotlinOf(leaf.type).type},`,
  ]);
  return [...groups, ...leaves].join("\n");
}

/** tokens/.../generated/TokenSet.kt: the structure of a token set. */
export function tokenSetKotlin(root) {
  const tokens = compose(loadSource(root), { mode: MODES[0], density: DENSITIES[0] }).tokens;
  const top = tree(tokens);
  const nested = [...groupsOf(top)]
    .slice(1)
    .map((node) =>
      [`public data class ${typeName(node.path)}(`, indent(classBody(node), 1), ")"].join("\n"),
    );
  const flattened = [...groupsOf(top)]
    .flatMap((node) => node.leaves)
    .map(
      ({ token, type }) =>
        `"${token.id}" to TokenFormat.${kotlinOf(type).format}(${token.path.map(member).join(".")}),`,
    );

  return `${HEADER}

package ${TOKENS_PACKAGE}

/** Every semantic and component token, for one color mode and density. */
public data class RaincoatTokenSet(
${indent(classBody(top), 1)}
) {
${indent(nested.join("\n\n"), 1)}

    /** Every token as text, keyed by its id in the token source. Used by the contract tests. */
    public fun flattened(): Map<String, String> = mapOf(
${indent(flattened.join("\n"), 2)}
    )
}
`;
}

function setLiteral(node) {
  const args = [
    ...[...node.groups.entries()].map(
      ([segment, child]) => `${member(segment)} = ${setLiteral(child)}`,
    ),
    ...node.leaves.map((leaf) => `${member(leaf.segment)} = ${literal(leaf.type, leaf.value)}`),
  ];
  return `${qualified(node.path)}(\n${indent(args.join(",\n"), 1)},\n)`;
}

const constant = ({ mode, density }) => `${camel(MODE_ENTRY[mode])}${pascal(density)}`;

/** theme-<id>/.../generated/<Id>Theme.kt: a theme's values in every mode and density. */
export function themeKotlin(root, themeId) {
  const files = loadSource(root);
  const name = pascal(themeId);
  // Each set is built lazily in its own function, which keeps every method well under the
  // JVM's size limit however many tokens there are.
  const sets = permutations().map(
    (permutation) =>
      `val ${constant(permutation)}: RaincoatTokenSet by lazy {\n${indent(setLiteral(tree(compose(files, permutation).tokens)), 1)}\n}`,
  );
  const branches = MODES.map((mode) =>
    [
      `ColorMode.${MODE_ENTRY[mode]} -> when (density) {`,
      ...DENSITIES.map(
        (density) =>
          `    Density.${pascal(density)} -> ${name}ThemeValues.${constant({ mode, density })}`,
      ),
      "}",
    ].join("\n"),
  );

  return `${HEADER}

package ${themePackage(themeId)}

import ${TOKENS_PACKAGE}.ColorMode
import ${TOKENS_PACKAGE}.Density
import ${TOKENS_PACKAGE}.RaincoatTheme
import ${TOKENS_PACKAGE}.RaincoatTokenSet
import ${TOKENS_PACKAGE}.TokenColor
import ${TOKENS_PACKAGE}.TokenEasing
import ${TOKENS_PACKAGE}.TokenTextStyle

/** The "${themeId}" theme. */
public val ${name}Theme: RaincoatTheme = RaincoatTheme(id = "${themeId}") { mode, density ->
    when (mode) {
${indent(branches.join("\n"), 2)}
    }
}

internal object ${name}ThemeValues {
${indent(sets.join("\n\n"), 1)}
}
`;
}

/** The expected value of every token in every mode and density, for the Kotlin contract test. */
export function expectedKotlin(root, themeId) {
  const files = loadSource(root);
  const name = pascal(themeId);
  const quote = (text) => JSON.stringify(text).replaceAll("$", "\\$");
  const functions = permutations().map((permutation) => {
    const rows = expectedEntries(compose(files, permutation).tokens).map(
      ([id, value]) => `${quote(id)} to ${quote(value)},`,
    );
    return `private fun ${constant(permutation)}(): Map<String, String> = mapOf(\n${indent(rows.join("\n"), 1)}\n)`;
  });
  const entries = permutations().map(
    (permutation) => `"${permutation.mode}/${permutation.density}" to ${constant(permutation)}(),`,
  );

  return `${HEADER}

package ${themePackage(themeId)}

/** What the token source resolves to, keyed by "mode/density" and then by token id. */
internal val expected${name}Tokens: Map<String, Map<String, String>> = mapOf(
${indent(entries.join("\n"), 1)}
)

${functions.join("\n\n")}
`;
}
