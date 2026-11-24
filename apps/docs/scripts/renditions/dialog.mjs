// Static renditions of the Dialog, the alert dialog, and the Sheet, for their page under
// Components. The generator loads renditions/<id>.mjs for the spec with that id, when the file
// exists.
//
// The renditions carry no values of their own. Each panel is a small window: the scrim fills it,
// and the dialog sits on it, styled only with the custom properties of the theme stylesheet. Each
// plate sets data-theme, so the page shows every mode from the tokens alone. The buttons are the
// Button's renditions, which site.css styles.
import { code, platesInEveryMode } from "../markdown.mjs";

/** The close button's cross, in the ghost button's color. */
const CLOSE =
  '<span class="rc-dialog-close" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>';

/** A dialog's parts: its title (a paragraph, so that it stays out of the page's outline). */
const panel = ({ kind, size = "md", title, description, body, actions = [], close = false }) =>
  `<div class="rc-dialog" data-kind="${kind}" data-size="${size}">` +
  `<div class="rc-dialog-header"><div class="rc-dialog-titles">` +
  `<p class="rc-dialog-title">${title}</p>` +
  (description ? `<p class="rc-dialog-description">${description}</p>` : "") +
  `</div>${close ? CLOSE : ""}</div>` +
  (body ? `<div class="rc-dialog-body">${body}</div>` : "") +
  (actions.length > 0
    ? `<div class="rc-dialog-footer">${actions
        .map(
          ([variant, label]) => `<span class="rc-button" data-variant="${variant}">${label}</span>`,
        )
        .join("")}</div>`
    : "") +
  `</div>`;

/** A small window with the scrim over it, and a dialog on the scrim. */
const window = (kind, dialog) =>
  `<div class="rc-dialog-window" data-kind="${kind}">${dialog}</div>`;

const rename = panel({
  kind: "dialog",
  title: "Rename file",
  description: "Everyone the file is shared with sees the new name.",
  actions: [
    ["secondary", "Cancel"],
    ["primary", "Rename"],
  ],
});
const alert = panel({
  kind: "alert",
  size: "sm",
  title: "Delete this address?",
  description: "It is removed from your account. This cannot be undone.",
  actions: [
    ["secondary", "Cancel"],
    ["danger", "Delete address"],
  ],
});
const shortcuts = (size) =>
  panel({
    kind: "dialog",
    size,
    title: `Keyboard shortcuts (${size})`,
    body: "Press N to start a new file, and S to share it.",
    close: true,
  });
const sheet = (edge) =>
  panel({
    kind: "sheet",
    title: "Filters",
    body: "Show files shared with you in the last 30 days.",
    actions: [["primary", "Show results"]],
    close: true,
  }).replace('data-kind="sheet"', `data-kind="sheet" data-edge="${edge}"`);

/**
 * @param {{spec: object}} _context
 * @returns {{note: string, sections: {heading: string, body: string}[], styles: string}}
 */
export default function renditions(_context) {
  const kinds = [window("dialog", rename), window("alert", alert)].join("");
  return {
    note: `The panels on this page are static renditions, not the component: a small window, with
the scrim filling it and a dialog on it. They are styled only with the custom properties of the
generated theme stylesheet, and each panel under "In every color mode" selects its mode with a
${code("data-theme")} attribute. A real dialog covers the whole window, and on iOS dialogs and
sheets are the system sheet and an alert dialog the system alert.`,
    sections: [
      {
        heading: "Sizes",
        body: `The ${code("sm")}, ${code("md")}, and ${code("lg")} widths, each with a close button and no footer. On a narrower window, a dialog spans the window less a margin.\n\n<div class="rc-stage rc-dialog-stage">${[
          "sm",
          "md",
          "lg",
        ]
          .map((size) => window("dialog", shortcuts(size)))
          .join("")}</div>`,
      },
      {
        heading: "Sheets",
        body: `A sheet from the bottom edge, and one from the end edge.\n\n<div class="rc-stage rc-dialog-stage">${window("sheet-bottom", sheet("bottom"))}${window("sheet-end", sheet("end"))}</div>`,
      },
      { heading: "In every color mode", body: platesInEveryMode(kinds) },
    ],
    styles: [
      `.rc-dialog-stage {
  flex-direction: column;
  align-items: stretch;
}`,
      `.rc-dialog-window {
  display: flex;
  box-sizing: border-box;
  inline-size: 100%;
  padding: var(--rc-dialog-margin);
  background: var(--rc-dialog-scrim);
}`,
      `.rc-dialog-window[data-kind="sheet-bottom"] {
  padding-block-end: 0;
}`,
      `.rc-dialog-window[data-kind="sheet-end"] {
  padding-block: 0;
  padding-inline-end: 0;
}`,
      `.rc-dialog {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  inline-size: 100%;
  margin-inline: auto;
  border: var(--rc-dialog-border-width) solid var(--rc-dialog-border-color);
  border-radius: var(--rc-dialog-radius);
  background: var(--rc-dialog-bg);
  box-shadow: var(--rc-dialog-shadow);
  color: var(--rc-dialog-fg);
  font-family: var(--rc-dialog-description-font-family);
  font-size: var(--rc-dialog-description-font-size);
  line-height: var(--rc-dialog-description-line-height);
}`,
      ...["sm", "md", "lg"].map(
        (size) => `.rc-dialog[data-size="${size}"] {
  max-inline-size: var(--rc-dialog-width-${size});
}`,
      ),
      `.rc-dialog[data-edge="bottom"] {
  max-inline-size: var(--rc-sheet-max-width-bottom);
  border-block-end: 0;
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}`,
      `.rc-dialog[data-edge="end"] {
  max-inline-size: var(--rc-sheet-width-end);
  margin-inline: auto 0;
  border-block: 0;
  border-inline-end: 0;
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}`,
      `.rc-dialog > * {
  padding: calc(var(--rc-dialog-gap) / 2) var(--rc-dialog-padding);
}`,
      `.rc-dialog > :first-child {
  padding-block-start: var(--rc-dialog-padding);
}`,
      `.rc-dialog > :last-child {
  padding-block-end: var(--rc-dialog-padding);
}`,
      `.rc-dialog-header {
  display: flex;
  align-items: flex-start;
  gap: var(--rc-dialog-gap);
}`,
      `.rc-dialog-titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--rc-space-2);
}`,
      `.rc-dialog-titles > p {
  margin: 0;
}`,
      `.rc-dialog-title {
  font-family: var(--rc-dialog-title-font-family);
  font-size: var(--rc-dialog-title-font-size);
  font-weight: var(--rc-dialog-title-font-weight);
  line-height: var(--rc-dialog-title-line-height);
  letter-spacing: var(--rc-dialog-title-letter-spacing);
}`,
      `.rc-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--rc-button-height-sm);
  block-size: var(--rc-button-height-sm);
  color: var(--rc-button-ghost-fg);
}`,
      `.rc-dialog-close svg {
  inline-size: var(--rc-button-icon-size-sm);
  block-size: var(--rc-button-icon-size-sm);
}`,
      `.rc-dialog-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--rc-dialog-footer-gap);
}`,
    ].join("\n\n"),
  };
}
