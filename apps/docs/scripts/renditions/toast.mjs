// Static renditions of the Toast, for its page under Components: a toast without an action, one
// with an action and a close button, and one whose message is too long for one line beside its
// action. The generator loads renditions/<id>.mjs for the spec with that id.
//
// The renditions carry no colors or sizes of their own: every value in `styles` is a custom
// property of the theme stylesheet, so each plate shows its color mode through data-theme. The
// action and the cross take the look of a small ghost Button. They are pictures, not controls.
import { code, platesInEveryMode } from "../markdown.mjs";

const cross = `<svg class="rc-toast-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>`;

const toast = (message, action) =>
  `<div class="rc-toast"><div class="rc-toast-content"><span class="rc-toast-message">${message}</span>${
    action ? `<span class="rc-toast-button rc-toast-action">${action}</span>` : ""
  }</div>${action ? `<span class="rc-toast-button rc-toast-close">${cross}</span>` : ""}</div>`;

const specimens = [
  toast("Message archived"),
  toast("Address deleted", "Undo"),
  toast("Messages older than one year were moved from Archive to the Deleted folder", "Undo"),
].join("");

const styles = `
.rc-stage:has(.rc-toast) {
  flex-direction: column;
  align-items: center;
}
.rc-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--rc-toast-gap);
  box-sizing: border-box;
  max-width: min(100%, var(--rc-toast-max-width));
  padding: var(--rc-toast-padding-block) var(--rc-toast-padding-inline);
  border: var(--rc-toast-border-width) solid var(--rc-toast-border-color);
  border-radius: var(--rc-toast-radius);
  background: var(--rc-toast-bg);
  box-shadow: var(--rc-toast-shadow);
  color: var(--rc-toast-fg);
}
.rc-toast-content {
  display: flex;
  flex: auto;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--rc-toast-gap);
  min-width: 0;
}
.rc-toast-message {
  flex: auto;
  min-width: 0;
  padding-block: calc((var(--rc-button-height-sm) - 1lh) / 2);
  font-family: var(--rc-toast-message-font-family);
  font-size: var(--rc-toast-message-font-size);
  font-weight: var(--rc-toast-message-font-weight);
  line-height: var(--rc-toast-message-line-height);
}
.rc-toast-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: var(--rc-button-height-sm);
  min-width: var(--rc-button-height-sm);
  border-radius: var(--rc-button-radius);
  color: var(--rc-button-ghost-fg);
  font-family: var(--rc-button-label-sm-font-family);
  font-size: var(--rc-button-label-sm-font-size);
  font-weight: var(--rc-button-label-sm-font-weight);
  line-height: var(--rc-button-label-sm-line-height);
}
.rc-toast-action {
  margin-inline-start: auto;
  padding-inline: var(--rc-button-padding-inline-sm);
}
.rc-toast-cross {
  width: var(--rc-button-icon-size-sm);
  height: var(--rc-button-icon-size-sm);
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
}
`;

export default function renditions(_context) {
  return {
    note: `The panels under "In every color mode" are static renditions of a toast standing still,
not the component: they are not announced, do not close, and their buttons are pictures. They are
styled only with the custom properties of the generated theme stylesheet, and each panel selects
its mode with a ${code("data-theme")} attribute.`,
    sections: [{ heading: "In every color mode", body: platesInEveryMode(specimens) }],
    styles,
  };
}
