// Contrast checks: every color that declares what it is drawn on must meet WCAG 2.x contrast
// against each of those backgrounds, in every color mode.
import { contrastRatio } from "./color.js";
import { compose, loadSource, MODES } from "./load.js";
import { resolvedType, resolveToken } from "./resolve.js";

/** Required ratios. High-contrast modes raise text to WCAG AAA. */
export const REQUIRED = {
  standard: { text: 4.5, "large-text": 3, graphic: 3 },
  "high-contrast": { text: 7, "large-text": 4.5, graphic: 3 },
};

export const levelOf = (mode) => (mode.endsWith("-hc") ? "high-contrast" : "standard");

/**
 * @param source the root of a token source, or the files of a theme (see loadTheme)
 * @returns {{mode, token, on, kind, ratio, required, pass}[]} one row per pair and mode.
 */
export function checkContrast(source) {
  const files = typeof source === "string" ? loadSource(source) : source;
  const rows = [];
  for (const mode of MODES) {
    const { tokens } = compose(files, { mode, density: "comfortable" });
    for (const token of tokens.values()) {
      const { on, contrast: kind } = token.extension;
      if (!on || !kind || kind === "exempt") continue;
      if (resolvedType(token.id, tokens) !== "color") continue;
      const foreground = resolveToken(token.id, tokens);
      const required = REQUIRED[levelOf(mode)][kind];
      for (const background of on) {
        const ratio = contrastRatio(foreground, resolveToken(background, tokens));
        rows.push({
          mode,
          token: token.id,
          on: background,
          kind,
          ratio,
          required,
          // Compare at the two decimals people read, so 4.499 is not reported as 4.50 and passing.
          pass: Math.floor(ratio * 100) / 100 >= required,
        });
      }
    }
  }
  return rows;
}
