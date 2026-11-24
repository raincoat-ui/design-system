// Static renditions of the Button, for its page under Components. The generator loads
// renditions/<id>.mjs for the spec with that id, when the file exists.
//
// The renditions carry no colors of their own. Each plate sets data-theme (or data-density),
// and site.css styles the buttons with the custom properties from the theme stylesheet, so the
// page also shows that a color mode works on a nested element. The Themes page uses the same
// buttons on its plates.
import { code, platesInEveryMode } from "../markdown.mjs";

const VARIANTS = ["primary", "secondary", "ghost", "danger", "disabled"];

/** One button of each variant, and a disabled one, labeled by `label(variant)`. */
export const buttonRow = (label = (variant) => `${variant[0].toUpperCase()}${variant.slice(1)}`) =>
  VARIANTS.map(
    (variant) => `<span class="rc-button" data-variant="${variant}">${label(variant)}</span>`,
  ).join("");

/**
 * What every renditions file exports: a function the generator calls with the component's spec.
 * @param {{spec: object}} context
 * @returns {{note?: string, sections: {heading: string, body: string}[], styles?: string}}
 *   `note` explains the renditions at the top of the page; each section is a level-2 section
 *   placed after the properties and content; `styles`, if given, is CSS put on the page, for
 *   specimens that site.css does not style.
 */
export default function renditions(_context) {
  return {
    note: `The panels under "In every color mode" are static renditions, not the component.
They are styled only with the custom properties of the generated theme stylesheet, and each panel
selects its mode with a ${code("data-theme")} attribute.`,
    sections: [{ heading: "In every color mode", body: platesInEveryMode(buttonRow()) }],
  };
}
