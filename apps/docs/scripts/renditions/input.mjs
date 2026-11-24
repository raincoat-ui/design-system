// Static renditions of the Input, for its page under Components. The generator loads
// renditions/<id>.mjs for the spec with that id, when the file exists.
//
// The renditions carry no colors or sizes of their own. Each plate sets data-theme (or
// data-density), and the styles below draw the fields with the custom properties from the theme
// stylesheet. They are pictures of fields, not fields: nothing in them takes text.
import { code, platesInEveryMode } from "../markdown.mjs";

/** One field of each state of the spec, with its label and, where it has them, its other parts. */
const FIELDS = [
  { state: "rest", label: "Full name", value: "Ana Lima" },
  {
    state: "rest",
    label: "Email",
    description: "We send the receipt here.",
    placeholder: "name@example.com",
  },
  {
    state: "invalid",
    label: "Username",
    value: "ana lima",
    error: "Remove the space, for example: ana.lima",
  },
  { state: "disabled", label: "Company", value: "Harbour Supplies" },
  { state: "read-only", label: "Account number", value: "DE89 3704 0044" },
];

const field = ({ state, label, description, value, placeholder, error }) =>
  [
    `<span class="rc-input" data-state="${state}">`,
    `<span class="rc-input-label">${label}</span>`,
    description ? `<span class="rc-input-description">${description}</span>` : "",
    placeholder
      ? `<span class="rc-input-field" data-placeholder>${placeholder}</span>`
      : `<span class="rc-input-field">${value}</span>`,
    error ? `<span class="rc-input-error">${error}</span>` : "",
    "</span>",
  ].join("");

const STYLES = `
.rc-stage:has(> .rc-input) {
  align-items: flex-start;
}

.rc-input {
  display: flex;
  flex-direction: column;
  gap: var(--rc-input-gap);
  inline-size: var(--rc-size-panel-sm);
  max-inline-size: 100%;
}

.rc-input-label {
  color: var(--rc-input-label-fg);
  font-family: var(--rc-input-label-md-font-family);
  font-size: var(--rc-input-label-md-font-size);
  font-weight: var(--rc-input-label-md-font-weight);
  line-height: var(--rc-input-label-md-line-height);
}

.rc-input-description,
.rc-input-error {
  font-family: var(--rc-input-description-type-font-family);
  font-size: var(--rc-input-description-type-font-size);
  font-weight: var(--rc-input-description-type-font-weight);
  line-height: var(--rc-input-description-type-line-height);
  color: var(--rc-input-description-fg);
}

.rc-input-error {
  color: var(--rc-input-error-fg);
}

.rc-input-field {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-block-size: var(--rc-input-height-md);
  padding-inline: var(--rc-input-padding-inline-md);
  border: var(--rc-input-border-width) solid var(--rc-input-border-default);
  border-radius: var(--rc-input-radius);
  background: var(--rc-input-bg-default);
  color: var(--rc-input-fg-default);
  font-family: var(--rc-input-value-md-font-family);
  font-size: var(--rc-input-value-md-font-size);
  line-height: var(--rc-input-value-md-line-height);
}

.rc-input-field[data-placeholder] {
  color: var(--rc-input-placeholder);
}

.rc-input[data-state="invalid"] .rc-input-field {
  border-color: var(--rc-input-border-invalid);
}

.rc-input[data-state="disabled"] .rc-input-field {
  background: var(--rc-input-bg-disabled);
  border-color: var(--rc-input-border-disabled);
  color: var(--rc-input-fg-disabled);
}

.rc-input[data-state="read-only"] .rc-input-field {
  background: var(--rc-input-bg-read-only);
  border-color: var(--rc-input-border-read-only);
}
`;

/** See renditions/button.mjs for what a renditions file exports. */
export default function renditions(_context) {
  return {
    note: `The panels under "In every color mode" are static renditions, not the component: they
take no text. They are styled only with the custom properties of the generated theme stylesheet,
and each panel selects its mode with a ${code("data-theme")} attribute.`,
    sections: [
      { heading: "In every color mode", body: platesInEveryMode(FIELDS.map(field).join("")) },
    ],
    styles: STYLES,
  };
}
