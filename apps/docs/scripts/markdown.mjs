// What the generated pages are written with: Markdown and HTML snippets, shared by the
// generator and the renditions of each component (renditions/<id>.mjs).
import { MODES } from "@raincoat-ui/tokens";

export const MODE_LABEL = {
  light: "Light",
  dark: "Dark",
  "light-hc": "Light, high contrast",
  "dark-hc": "Dark, high contrast",
};

export const code = (text) => `\`${text}\``;

export const swatch = (hex) => `<span class="rc-swatch" style="background:${hex}"></span>`;

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
