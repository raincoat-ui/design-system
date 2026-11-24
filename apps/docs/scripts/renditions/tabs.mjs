// Static renditions of the Tabs, for their page under Components. The generator loads
// renditions/<id>.mjs for the spec with that id, when the file exists.
//
// The renditions carry no colors or sizes of their own: the styles below take every one from the
// custom properties of the theme stylesheet, and each plate sets data-theme (or data-density).
import { code, platesInEveryMode } from "../markdown.mjs";

/** A row of tabs, the first selected, over the hairline. */
const row = (labels) =>
  `<div class="rc-tabs-specimen">${labels
    .map(
      (label, index) =>
        `<span class="rc-tabs-specimen-tab"${index === 0 ? " data-selected" : ""}>${label}</span>`,
    )
    .join("")}</div>`;

export default function renditions(_context) {
  return {
    note: `The panels under "In every color mode" are static renditions, not the component: a row of
three tabs, the first selected. They are styled only with the custom properties of the generated
theme stylesheet, and each panel selects its mode with a ${code("data-theme")} attribute.`,
    sections: [
      {
        heading: "In every color mode",
        body: platesInEveryMode(row(["Details", "Reviews", "Shipping"])),
      },
    ],
    styles: `
.rc-tabs-specimen {
  display: flex;
  inline-size: 100%;
  border-block-end: var(--rc-tabs-divider-width) solid var(--rc-tabs-divider-color);
}

.rc-tabs-specimen-tab {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-block-size: var(--rc-tabs-height);
  margin-block-end: calc(0px - var(--rc-tabs-divider-width));
  padding-inline: var(--rc-tabs-padding-inline);
  border-block-end: var(--rc-tabs-indicator-width) solid transparent;
  color: var(--rc-tabs-fg-default);
  font-family: var(--rc-tabs-label-font-family);
  font-size: var(--rc-tabs-label-font-size);
  font-weight: var(--rc-tabs-label-font-weight);
  line-height: var(--rc-tabs-label-line-height);
  white-space: nowrap;
}

.rc-tabs-specimen-tab[data-selected] {
  border-block-end-color: var(--rc-tabs-indicator-color);
  color: var(--rc-tabs-fg-selected);
}
`,
  };
}
