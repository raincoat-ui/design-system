// Static renditions of Typography, for its page under Components. The generator loads
// renditions/<id>.mjs for the spec with that id, when the file exists.
//
// The renditions carry no values of their own. Each text style and color is read from the
// custom properties of the theme stylesheet, and each plate sets data-theme, so the page shows
// every style and every mode from the tokens alone.
import { code, platesInEveryMode } from "../markdown.mjs";

/** "heading-xl" is the style whose properties are --rc-type-heading-xl-*. */
const styleRule = (variant) => {
  const name = `--rc-type-${variant}`;
  return `.rc-type[data-variant="${variant}"] {
  font-family: var(${name}-font-family);
  font-size: var(${name}-font-size);
  font-weight: var(${name}-font-weight);
  letter-spacing: var(${name}-letter-spacing);
  line-height: var(${name}-line-height);
}`;
};

const COLORS = ["default", "muted", "danger"];

/** One line of text in a style and a color, as a paragraph: a rendition is not in the outline. */
const specimen = (variant, color, text) =>
  `<p class="rc-type" data-variant="${variant}" data-color="${color}">${text}</p>`;

const column = (specimens) => `<div class="rc-type-column">${specimens.join("")}</div>`;

/**
 * @param {{spec: object}} context
 * @returns {{note: string, sections: {heading: string, body: string}[], styles: string}}
 */
export default function renditions({ spec }) {
  const headings = Object.keys(spec.parts.heading.properties.variant.values);
  const texts = Object.keys(spec.parts.text.properties.variant.values);
  const describe = (part, variant) => spec.parts[part].properties.variant.values[variant];

  const styles = column([
    ...headings.map((variant) => specimen(variant, "default", describe("heading", variant))),
    ...texts.map((variant) => specimen(variant, "default", describe("text", variant))),
  ]);
  const modes = column([
    specimen("heading-md", "default", "Notifications"),
    specimen("body-md", "default", "Changes reach your other devices the next time they connect."),
    specimen("caption", "muted", "Synced 2 minutes ago"),
    specimen("body-sm", "danger", "This file could not be opened."),
  ]);

  return {
    note: `The text on this page under "Text styles" and "In every color mode" is a static
rendition, not the component. Each line is styled only with the custom properties of the
generated theme stylesheet, and each panel under "In every color mode" selects its mode with a
${code("data-theme")} attribute. The lines are paragraphs, not headings, so that they stay out of
the page's outline.`,
    sections: [
      {
        heading: "Text styles",
        body: `Each style, with the use the spec gives it.\n\n<div class="rc-stage">${styles}</div>`,
      },
      { heading: "In every color mode", body: platesInEveryMode(modes) },
    ],
    styles: [
      `.rc-type-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--rc-space-3);
}`,
      `.rc-type-column > .rc-type {
  margin: 0;
  text-align: start;
}`,
      ...[...headings, ...texts].map(styleRule),
      ...COLORS.map(
        (color) => `.rc-type[data-color="${color}"] {
  color: var(--rc-color-fg-${color});
}`,
      ),
    ].join("\n\n"),
  };
}
