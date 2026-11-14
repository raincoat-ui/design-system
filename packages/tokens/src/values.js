// Checks that a fully resolved token value has the shape its type requires (DTCG 2025.10,
// restricted to what Raincoat supports). Each checker returns a list of problems.
import { COLOR_SPACES, hexOf, inGamut } from "./color.js";

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const FONT_WEIGHT_NAMES = [
  "thin",
  "hairline",
  "extra-light",
  "ultra-light",
  "light",
  "normal",
  "regular",
  "book",
  "medium",
  "semi-bold",
  "demi-bold",
  "bold",
  "extra-bold",
  "ultra-bold",
  "black",
  "heavy",
  "extra-black",
  "ultra-black",
];

const RANGES = {
  srgb: [
    [0, 1],
    [0, 1],
    [0, 1],
  ],
  hsl: [
    [0, 360],
    [0, 100],
    [0, 100],
  ],
  oklch: [
    [0, 1],
    [0, 0.5],
    [0, 360],
  ],
};

function color(value) {
  if (!isObject(value)) return ["a color must be an object with colorSpace and components"];
  const problems = [];
  const extra = Object.keys(value).filter(
    (key) => !["colorSpace", "components", "alpha", "hex"].includes(key),
  );
  if (extra.length > 0) problems.push(`unknown color properties: ${extra.join(", ")}`);
  if (!COLOR_SPACES.includes(value.colorSpace)) {
    return [...problems, `colorSpace must be one of ${COLOR_SPACES.join(", ")}`];
  }
  const { components } = value;
  if (!Array.isArray(components) || components.length !== 3 || !components.every(isNumber)) {
    return [...problems, "components must be three numbers (the keyword none is not supported)"];
  }
  RANGES[value.colorSpace].forEach(([low, high], index) => {
    if (components[index] < low || components[index] > high) {
      problems.push(`component ${index + 1} must be between ${low} and ${high}`);
    }
  });
  if (
    value.alpha !== undefined &&
    !(isNumber(value.alpha) && value.alpha >= 0 && value.alpha <= 1)
  ) {
    problems.push("alpha must be a number between 0 and 1");
  }
  if (problems.length > 0) return problems;
  if (!inGamut(value)) problems.push("the color is outside the sRGB gamut; reduce its chroma");
  if (typeof value.hex !== "string" || !/^#[0-9a-f]{6}$/.test(value.hex)) {
    problems.push("hex is required, as six lowercase hex digits");
  } else if (value.hex !== hexOf(value)) {
    problems.push(`hex ${value.hex} does not match the components, which give ${hexOf(value)}`);
  }
  return problems;
}

const unitValue = (units, label) => (value) =>
  isObject(value) &&
  isNumber(value.value) &&
  units.includes(value.unit) &&
  Object.keys(value).length === 2
    ? []
    : [`a ${label} must be {"value": number, "unit": ${units.map((u) => `"${u}"`).join(" or ")}}`];

const dimension = unitValue(["px", "rem"], "dimension");
const duration = unitValue(["ms", "s"], "duration");

function fontFamily(value) {
  const names = Array.isArray(value) ? value : [value];
  return names.length > 0 && names.every((name) => typeof name === "string" && name.trim() !== "")
    ? []
    : ["a fontFamily must be a font name or a non-empty list of font names"];
}

function fontWeight(value) {
  if (isNumber(value) && value >= 1 && value <= 1000) return [];
  if (FONT_WEIGHT_NAMES.includes(value)) return [];
  return ["a fontWeight must be a number from 1 to 1000 or a DTCG weight name"];
}

const number = (value) => (isNumber(value) ? [] : ["a number token must be a JSON number"]);

function cubicBezier(value) {
  const valid =
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(isNumber) &&
    [value[0], value[2]].every((x) => x >= 0 && x <= 1);
  return valid ? [] : ["a cubicBezier must be four numbers, with both x values between 0 and 1"];
}

function composite(fields, optional = {}) {
  return (value) => {
    if (!isObject(value)) return ["must be an object"];
    const problems = [];
    for (const [key, check] of Object.entries(fields)) {
      if (!Object.hasOwn(value, key)) problems.push(`missing "${key}"`);
      else problems.push(...check(value[key]).map((problem) => `${key}: ${problem}`));
    }
    for (const [key, check] of Object.entries(optional)) {
      if (Object.hasOwn(value, key)) {
        problems.push(...check(value[key]).map((problem) => `${key}: ${problem}`));
      }
    }
    const known = [...Object.keys(fields), ...Object.keys(optional)];
    const extra = Object.keys(value).filter((key) => !known.includes(key));
    if (extra.length > 0) problems.push(`unknown properties: ${extra.join(", ")}`);
    return problems;
  };
}

const typography = composite({
  fontFamily,
  fontSize: dimension,
  fontWeight,
  letterSpacing: dimension,
  lineHeight: number,
});

const oneShadow = composite(
  { color, offsetX: dimension, offsetY: dimension, blur: dimension, spread: dimension },
  { inset: (value) => (typeof value === "boolean" ? [] : ["must be true or false"]) },
);

function shadow(value) {
  const layers = Array.isArray(value) ? value : [value];
  if (layers.length === 0) return ["a shadow needs at least one layer"];
  return layers.flatMap((layer, index) =>
    oneShadow(layer).map((problem) =>
      layers.length > 1 ? `layer ${index + 1}: ${problem}` : problem,
    ),
  );
}

export const CHECKERS = {
  color,
  dimension,
  duration,
  fontFamily,
  fontWeight,
  number,
  cubicBezier,
  typography,
  shadow,
};

/** Problems with a resolved value of the given type; empty when it is valid. */
export function checkValue(type, value) {
  const check = CHECKERS[type];
  return check ? check(value) : [`unsupported type "${type}"`];
}
