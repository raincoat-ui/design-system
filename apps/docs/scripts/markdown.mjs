// What the generated pages are written with: Markdown and HTML snippets, shared by the
// generator and the renditions of each component (renditions/<id>.mjs).
import { hexOf, MODES } from "@raincoat-ui/tokens";

export const MODE_LABEL = {
  light: "Light",
  dark: "Dark",
  "light-hc": "Light, high contrast",
  "dark-hc": "Dark, high contrast",
};

export const code = (text) => `\`${text}\``;

const alphaOf = (color) => color.alpha ?? 1;

/** " at 40%" for a translucent color, nothing for an opaque one. */
export const opacity = (color) =>
  alphaOf(color) < 1 ? ` at ${Math.round(alphaOf(color) * 100)}%` : "";

/**
 * A swatch of a color value, or a ramp chip with `kind` "rc-chip". A translucent color is
 * drawn over hatching in the text color, which shows through it (site.css, .rc-translucent).
 */
export const swatch = (color, kind = "rc-swatch") => {
  if (alphaOf(color) === 1)
    return `<span class="${kind}" style="background:${hexOf(color)}"></span>`;
  const alpha = Math.round(alphaOf(color) * 255)
    .toString(16)
    .padStart(2, "0");
  return `<span class="${kind} rc-translucent" style="--rc-fill:${hexOf(color)}${alpha}"></span>`;
};

/** A color value as a table cell: its swatch, its hex, and its opacity when translucent. */
export const colorCell = (color) => `${swatch(color)}${code(hexOf(color))}${opacity(color)}`;

const lengths = ({ offsetX, offsetY, blur, spread }) => [offsetX, offsetY, blur, spread];

/** Whether a shadow draws anything: a layer with some opacity, and an offset, blur, or spread. */
export const draws = (shadow) =>
  []
    .concat(shadow)
    .some(
      (layer) => alphaOf(layer.color) > 0 && lengths(layer).some((length) => length.value !== 0),
    );

/** A shadow value: "None" when it draws nothing, else each layer's x, y, blur, spread, and color. */
export const shadowCell = (shadow) => {
  if (!draws(shadow)) return "None";
  return []
    .concat(shadow)
    .map(
      (layer) =>
        `${code(
          lengths(layer)
            .map(({ value, unit }) => `${value}${unit}`)
            .join(" "),
        )} ${colorCell(layer.color)}`,
    )
    .join("<br>");
};

// A cell is one line, and a pipe in it is text, not a column break.
const cell = (text) =>
  String(text)
    .replace(/\s*\n\s*/g, " ")
    .replaceAll("|", "\\|");

export const table = (head, rows) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`]
    .concat(rows.map((row) => `| ${row.map(cell).join(" | ")} |`))
    .join("\n");

export const dimension = ({ value, unit }) =>
  unit === "rem" ? `${value}rem (${value * 16}px)` : `${value}${unit}`;

/** "focus-visible" becomes "Focus visible". */
export const readable = (key) => `${key[0].toUpperCase()}${key.slice(1).replaceAll("-", " ")}`;

/** "a", "a and b", "a, b, and c"; or with "or". */
export const list = (items, conjunction = "and") =>
  items.length < 3
    ? items.join(` ${conjunction} `)
    : `${items.slice(0, -1).join(", ")}, ${conjunction} ${items.at(-1)}`;

/**
 * The same specimens on a plate per color mode, then on one at compact density. Each plate
 * sets data-theme (and data-density) and nothing else, so specimens styled only with the theme
 * stylesheet's custom properties show every mode, and that a mode works on a nested element.
 */
export const platesInEveryMode = (specimens) =>
  MODES.map(
    (mode) =>
      `### ${MODE_LABEL[mode]}\n\n<div class="rc-stage" data-theme="${mode}">${specimens}</div>`,
  )
    .concat(
      `### Compact density\n\n<div class="rc-stage" data-theme="light" data-density="compact">${specimens}</div>`,
    )
    .join("\n\n");
