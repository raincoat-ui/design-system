// Static renditions of the Card, for its page under Components: an interactive card in each of its
// states, and a static card with media and a footer action. The generator loads
// renditions/<id>.mjs for the spec with that id.
//
// The renditions carry no colors or sizes of their own: every value in `styles` is a custom
// property of the theme stylesheet, so each plate shows its color mode through data-theme. The
// titles are paragraphs, not headings, so that they stay out of the page's outline, and nothing
// here is a link or a button.
import { code, platesInEveryMode } from "../markdown.mjs";

const picture = `<svg class="rc-card-picture" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><rect width="400" height="120" class="rc-card-sky" /><path d="M0 120 L0 70 Q100 20 200 70 T400 60 L400 120 Z" class="rc-card-hills" /></svg>`;

const card = ({ state = "rest", title, body, media = false, action }) =>
  `<div class="rc-card" data-state="${state}">${
    media ? `<div class="rc-card-media">${picture}</div>` : ""
  }<p class="rc-card-title">${title}</p><p class="rc-card-body">${body}</p>${
    action
      ? `<div class="rc-card-footer"><span class="rc-button" data-variant="primary">${action}</span></div>`
      : ""
  }</div>`;

const specimens = [
  card({ title: "At rest", body: "As a static card" }),
  card({ state: "hover", title: "Hovered", body: "The outline steps to strong" }),
  card({ state: "pressed", title: "Pressed", body: "The fill changes too" }),
  card({ state: "focus", title: "Keyboard focus", body: "The ring is around the whole card" }),
  card({
    title: "Summer trip",
    body: "48 photos, shared with 3 people",
    media: true,
    action: "Open album",
  }),
].join("");

const styles = `
.rc-stage:has(.rc-card) {
  align-items: stretch;
}
.rc-card {
  display: flex;
  flex: 1 1 calc(var(--rc-size-panel-sm) / 2);
  flex-direction: column;
  gap: var(--rc-card-gap);
  box-sizing: border-box;
  padding: var(--rc-card-padding);
  border: var(--rc-card-border-width) solid var(--rc-card-border-default);
  border-radius: var(--rc-card-radius);
  background: var(--rc-card-bg-default);
  box-shadow: var(--rc-card-shadow);
  color: var(--rc-color-fg-default);
}
.rc-card[data-state="hover"] {
  border-color: var(--rc-card-border-hover);
}
.rc-card[data-state="pressed"] {
  border-color: var(--rc-card-border-hover);
  background: var(--rc-card-bg-pressed);
}
.rc-card[data-state="focus"] {
  outline: var(--rc-card-focus-ring-width) solid var(--rc-card-focus-ring-color);
  outline-offset: var(--rc-card-focus-ring-offset);
}
.rc-card-media {
  margin: calc(0px - var(--rc-card-padding)) calc(0px - var(--rc-card-padding)) 0;
  overflow: hidden;
  border-radius: max(0px, calc(var(--rc-card-radius) - var(--rc-card-border-width)))
    max(0px, calc(var(--rc-card-radius) - var(--rc-card-border-width))) 0 0;
}
.rc-card-picture {
  display: block;
  inline-size: 100%;
  block-size: auto;
}
.rc-card-sky {
  fill: var(--rc-color-bg-subtle);
}
.rc-card-hills {
  fill: var(--rc-color-accent-default);
}
.rc-stage .rc-card > p {
  margin: 0;
}
.rc-card-title {
  font-family: var(--rc-type-heading-sm-font-family);
  font-size: var(--rc-type-heading-sm-font-size);
  font-weight: var(--rc-type-heading-sm-font-weight);
  line-height: var(--rc-type-heading-sm-line-height);
}
.rc-card-body {
  color: var(--rc-color-fg-muted);
  font-family: var(--rc-type-body-md-font-family);
  font-size: var(--rc-type-body-md-font-size);
  line-height: var(--rc-type-body-md-line-height);
}
.rc-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-block-start: auto;
}
`;

/**
 * @param {{spec: object}} _context
 * @returns {{note: string, sections: {heading: string, body: string}[], styles: string}}
 */
export default function renditions(_context) {
  return {
    note: `The panels under "In every color mode" are static renditions, not the component: each
interactive card is drawn in one state, and nothing in them can be activated. They are styled
only with the custom properties of the generated theme stylesheet, and each panel selects its
mode with a ${code("data-theme")} attribute.`,
    sections: [{ heading: "In every color mode", body: platesInEveryMode(specimens) }],
    styles,
  };
}
