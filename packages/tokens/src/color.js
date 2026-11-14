// Color conversion and WCAG 2.x contrast for DTCG color values.
import { converter, displayable, formatHex } from "culori";

const toRgb = converter("rgb");

/** The color spaces Raincoat accepts in the token source. */
export const COLOR_SPACES = ["srgb", "hsl", "oklch"];

function toCulori({ colorSpace, components }) {
  const [a, b, c] = components;
  if (colorSpace === "srgb") return { mode: "rgb", r: a, g: b, b: c };
  if (colorSpace === "hsl") return { mode: "hsl", h: a, s: b / 100, l: c / 100 };
  if (colorSpace === "oklch") return { mode: "oklch", l: a, c: b, h: c };
  throw new Error(`unsupported color space "${colorSpace}"`);
}

/** Whether the color can be shown in sRGB without clipping. */
export function inGamut(value) {
  return displayable(toCulori(value));
}

/** The six-digit hex form of the color in sRGB. */
export function hexOf(value) {
  return formatHex(toRgb(toCulori(value)));
}

const clamp = (n) => Math.min(1, Math.max(0, n));

/** The color as sRGB channels in 0..1, plus alpha. */
export function rgba(value) {
  const { r, g, b } = toRgb(toCulori(value));
  return { r: clamp(r), g: clamp(g), b: clamp(b), a: value.alpha ?? 1 };
}

function luminance({ r, g, b }) {
  const linear = (channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * WCAG 2.x contrast ratio of a foreground drawn on an opaque background.
 * A translucent foreground is blended onto the background first.
 */
export function contrastRatio(foreground, background) {
  const fg = rgba(foreground);
  const bg = rgba(background);
  const blended = {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
  const [lighter, darker] = [luminance(blended), luminance(bg)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
