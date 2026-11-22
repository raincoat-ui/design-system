// Gives the browser tests the value every Button token should have, in each color mode and
// density, in the form the browser reports a computed style. Each Vitest project tests one
// theme (vitest.config.ts) and gets that theme's values.
//
// The values are resolved here from the token source. They do not come from the generated
// stylesheet, so a test that compares a rendered button with them checks the whole path:
// token source, stylesheet, class names, browser.
import { fileURLToPath } from "node:url";
import {
  compose,
  DENSITIES,
  hexOf,
  MODES,
  openProject,
  resolvedType,
  resolveToken,
} from "@raincoat-ui/tokens";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

const px = ({ value, unit }) => (unit === "rem" ? value * 16 : value);
const seconds = ({ value, unit }) => (unit === "ms" ? value / 1000 : value);

function rgb(value) {
  const hex = hexOf(value);
  if (hex.length !== 7) throw new Error(`the tests expect opaque colors, got ${hex}`);
  const channel = (at) => Number.parseInt(hex.slice(at, at + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
}

/** The entries one token contributes: a typography token becomes one entry per field. */
function entries(id, type, value) {
  switch (type) {
    case "color":
      return [[id, rgb(value)]];
    case "dimension":
      return [[id, px(value)]];
    case "duration":
      return [[id, seconds(value)]];
    case "cubicBezier":
      return [[id, `cubic-bezier(${value.join(", ")})`]];
    case "typography":
      return [
        [`${id}.font-family`, [].concat(value.fontFamily)[0]],
        [`${id}.font-size`, px(value.fontSize)],
        [`${id}.font-weight`, String(value.fontWeight)],
        [`${id}.letter-spacing`, px(value.letterSpacing)],
        [`${id}.line-height`, value.lineHeight * px(value.fontSize)],
      ];
    default:
      throw new Error(`${id}: the tests do not know the token type "${type}"`);
  }
}

export default function setup(project) {
  const id = project.name;
  const theme = openProject(repoRoot).themes.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(`no theme "${id}" in the token source`);
  const source = theme.files;
  const expected = {};
  for (const mode of MODES) {
    for (const density of DENSITIES) {
      const { tokens } = compose(source, { mode, density });
      expected[`${mode}/${density}`] = Object.fromEntries(
        [...tokens.values()]
          .filter((token) => token.tier !== "primitive")
          .flatMap((token) =>
            entries(token.id, resolvedType(token.id, tokens), resolveToken(token.id, tokens)),
          ),
      );
    }
  }
  project.provide("tokens", expected);
}
