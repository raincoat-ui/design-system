// Emits Swift for the iOS package: the structure of a token set, each theme's values, and the
// expected values the Swift contract test compares against.
import { compose, DENSITIES, loadSource, MODES } from "../load.js";
import {
  camel,
  expectedEntries,
  families,
  groupsOf,
  HEADER,
  hexParts,
  indent,
  pascal,
  permutations,
  points,
  seconds,
  tidy,
  tree,
  weight,
} from "./shared.js";

export { canonical } from "./shared.js";

const SWIFT_TYPE = {
  color: "TokenColor",
  dimension: "Double",
  duration: "Double",
  number: "Double",
  fontWeight: "Int",
  fontFamily: "[String]",
  cubicBezier: "TokenEasing",
  typography: "TokenTextStyle",
};

// Words that need backticks when declared as a property or parameter name.
const KEYWORDS = new Set(
  "as associatedtype break case catch class continue default defer deinit do else enum extension fallthrough false fileprivate for func guard if import in init inout internal is let nil operator private protocol public repeat rethrows return self static struct subscript super switch throw throws true try typealias var where while".split(
    " ",
  ),
);

const MODE_CASE = {
  light: "light",
  dark: "dark",
  "light-hc": "lightHighContrast",
  "dark-hc": "darkHighContrast",
};

/** A token path segment as a Swift member name: `on-accent` -> onAccent, `4` -> _4. */
const member = (segment) => (/^[0-9]/.test(segment) ? `_${segment}` : camel(segment));
const declared = (segment) =>
  KEYWORDS.has(member(segment)) ? `\`${member(segment)}\`` : member(segment);
const typeName = (path) => `${path.map(pascal).join("")}Tokens`;
const qualified = (path) =>
  path.length === 0 ? "RaincoatTokenSet" : `RaincoatTokenSet.${typeName(path)}`;
const number = (value) => String(tidy(value));

function swiftTypeOf(type) {
  if (!SWIFT_TYPE[type]) {
    throw new Error(`the Swift emitter does not support the type "${type}" yet`);
  }
  return SWIFT_TYPE[type];
}

/** A resolved value as a Swift expression. */
function literal(type, value) {
  switch (type) {
    case "color": {
      const { rgb, alpha } = hexParts(value);
      return alpha < 1
        ? `TokenColor(hex: 0x${rgb}, alpha: ${number(alpha)})`
        : `TokenColor(hex: 0x${rgb})`;
    }
    case "dimension":
      return number(points(value));
    case "duration":
      return number(seconds(value));
    case "number":
      return number(value);
    case "fontWeight":
      return String(weight(value));
    case "fontFamily":
      return `[${families(value)
        .map((name) => JSON.stringify(name))
        .join(", ")}]`;
    case "cubicBezier":
      return `TokenEasing(x1: ${number(value[0])}, y1: ${number(value[1])}, x2: ${number(value[2])}, y2: ${number(value[3])})`;
    case "typography":
      return `TokenTextStyle(families: ${literal("fontFamily", value.fontFamily)}, size: ${number(points(value.fontSize))}, weight: ${weight(value.fontWeight)}, letterSpacing: ${number(points(value.letterSpacing))}, lineHeight: ${number(value.lineHeight)})`;
    default:
      throw new Error(`the Swift emitter does not support the type "${type}" yet`);
  }
}

/** The members of a group: nested groups first, then tokens, in source order. */
const members = (node) => [
  ...[...node.groups.entries()].map(([segment, child]) => ({
    segment,
    swiftType: typeName(child.path),
  })),
  ...node.leaves.map((leaf) => ({
    segment: leaf.segment,
    swiftType: swiftTypeOf(leaf.type),
    description: leaf.token.description,
  })),
];

function structBody(node) {
  const list = members(node);
  const properties = list.flatMap(({ segment, swiftType, description }) => [
    ...(description ? [`/// ${description}`] : []),
    `public let ${declared(segment)}: ${swiftType}`,
  ]);
  const parameters = list.map(({ segment, swiftType }) => `${declared(segment)}: ${swiftType}`);
  const assignments = list.map(({ segment }) => `self.${member(segment)} = ${declared(segment)}`);
  return [
    ...properties,
    "",
    `public init(${parameters.join(", ")}) {`,
    indent(assignments.join("\n"), 1),
    "}",
  ].join("\n");
}

/** RaincoatTokens/Generated/TokenSet.swift: the structure of a token set. */
export function tokenSetSwift(root) {
  const tokens = compose(loadSource(root), { mode: MODES[0], density: DENSITIES[0] }).tokens;
  const top = tree(tokens);
  const nested = [...groupsOf(top)]
    .slice(1)
    .map((node) =>
      [
        `public struct ${typeName(node.path)}: Hashable, Sendable {`,
        indent(structBody(node), 1),
        "}",
      ].join("\n"),
    );
  const flattened = [...groupsOf(top)]
    .flatMap((node) => node.leaves)
    .map(({ token }) => `"${token.id}": TokenFormat.string(${token.path.map(member).join(".")}),`);

  return `${HEADER}

/// Every semantic and component token, for one color mode and density.
public struct RaincoatTokenSet: Hashable, Sendable {
${indent(structBody(top), 1)}

${indent(nested.join("\n\n"), 1)}
}

extension RaincoatTokenSet {
    /// Every token as text, keyed by its id in the token source. Used by the contract tests.
    public func flattened() -> [String: String] {
        [
${indent(flattened.join("\n"), 3)}
        ]
    }
}
`;
}

function setLiteral(node) {
  const args = [
    ...[...node.groups.entries()].map(
      ([segment, child]) => `${member(segment)}: ${setLiteral(child)}`,
    ),
    ...node.leaves.map((leaf) => `${member(leaf.segment)}: ${literal(leaf.type, leaf.value)}`),
  ];
  return `${qualified(node.path)}(\n${indent(args.join(",\n"), 1)}\n)`;
}

const constant = ({ mode, density }) => `${MODE_CASE[mode]}${pascal(density)}`;

/** RaincoatTheme<Id>/Generated/<Id>Theme.swift: a theme's values in every mode and density. */
export function themeSwift(root, themeId) {
  const files = loadSource(root);
  const name = pascal(themeId);
  const sets = permutations().map(
    (permutation) =>
      `static let ${constant(permutation)} = ${setLiteral(tree(compose(files, permutation).tokens))}`,
  );
  const cases = permutations().map(
    (permutation) =>
      `case (.${MODE_CASE[permutation.mode]}, .${permutation.density}): ${name}ThemeValues.${constant(permutation)}`,
  );

  return `${HEADER}

import RaincoatTokens

extension RaincoatTheme {
    /// The "${themeId}" theme.
    public static let ${camel(themeId)} = RaincoatTheme(id: "${themeId}") { mode, density in
        switch (mode, density) {
${indent(cases.join("\n"), 2)}
        }
    }
}

enum ${name}ThemeValues {
${indent(sets.join("\n\n"), 1)}
}
`;
}

/** The expected value of every token in every mode and density, for the Swift contract test. */
export function expectedSwift(root, themeId) {
  const files = loadSource(root);
  const entries = permutations().map((permutation) => {
    const rows = expectedEntries(compose(files, permutation).tokens).map(
      ([id, value]) => `${JSON.stringify(id)}: ${JSON.stringify(value)},`,
    );
    return `"${permutation.mode}/${permutation.density}": [\n${indent(rows.join("\n"), 1)}\n],`;
  });

  return `${HEADER}

/// What the token source resolves to, keyed by "mode/density" and then by token id.
let expected${pascal(themeId)}Tokens: [String: [String: String]] = [
${indent(entries.join("\n"), 1)}
]
`;
}
