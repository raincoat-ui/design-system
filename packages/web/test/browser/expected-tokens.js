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
  const channel = (at) => Number.parseInt(hex.slice(at, at + 2), 16);
  const channels = `${channel(1)}, ${channel(3)}, ${channel(5)}`;
  // The stylesheet writes alpha as a byte. The browser reports the shortest decimal, of two or
  // three places, that gives back the same byte.
  const alpha = Math.round((value.alpha ?? 1) * 255);
  if (alpha === 255) return `rgb(${channels})`;
  const short = Math.round((alpha / 255) * 100) / 100;
  const decimal =
    Math.round(short * 255) === alpha ? short : Math.round((alpha / 255) * 1000) / 1000;
  return `rgba(${channels}, ${decimal})`;
}

/** A shadow as the browser reports a computed box-shadow: color first, inset last. */
const shadow = (value) =>
  []
    .concat(value)
    .map((layer) =>
      [
        rgb(layer.color),
        ...["offsetX", "offsetY", "blur", "spread"].map((field) => `${px(layer[field])}px`),
        ...(layer.inset ? ["inset"] : []),
      ].join(" "),
    )
    .join(", ");

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
    case "shadow":
      return [[id, shadow(value)]];
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
  // The theme the project provides: a theme's touch project is named after it, not as it.
  const id = project.config.provide.theme;
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
