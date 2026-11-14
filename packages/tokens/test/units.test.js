import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aliasesIn,
  aliasTarget,
  checkValue,
  contrastRatio,
  flatten,
  hexOf,
  resolvedType,
  resolveToken,
} from "../src/index.js";

const srgb = (hex) => ({
  colorSpace: "srgb",
  components: [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255),
  hex,
});

test("aliasTarget recognizes only a whole curly-brace reference", () => {
  assert.equal(aliasTarget("{color.bg.canvas}"), "color.bg.canvas");
  assert.equal(aliasTarget("color.bg.canvas"), null);
  assert.equal(aliasTarget("{a} and {b}"), null);
  assert.equal(aliasTarget(16), null);
});

test("aliasesIn finds references nested in composite values", () => {
  const value = { fontFamily: "{font.family.sans}", fontSize: "{font.size.16}", lineHeight: 1.5 };
  assert.deepEqual(aliasesIn(value), ["font.family.sans", "font.size.16"]);
  assert.deepEqual(aliasesIn([{ color: "{c.a}" }, { color: "{c.b}" }]), ["c.a", "c.b"]);
});

test("flatten inherits $type from groups and builds ids and flat names", () => {
  const tree = {
    color: {
      $type: "color",
      bg: { canvas: { $value: "{color.neutral.0}", $description: "Page background." } },
    },
    space: { 4: { $type: "dimension", $value: { value: 16, unit: "px" }, $description: "x" } },
  };
  const tokens = flatten(tree, { tier: "semantic", file: "f.json" });
  assert.deepEqual(
    tokens.map((token) => [token.id, token.name, token.type]),
    [
      ["color.bg.canvas", "color-bg-canvas", "color"],
      ["space.4", "space-4", "dimension"],
    ],
  );
});

test("resolveToken follows chains and resolves inside composites", () => {
  const tokens = new Map(
    Object.entries({
      "size.base": { value: { value: 1, unit: "rem" }, type: "dimension" },
      "size.body": { value: "{size.base}" },
      "type.body": {
        value: { fontSize: "{size.body}", lineHeight: 1.5 },
        type: "typography",
      },
    }).map(([id, token]) => [id, { id, ...token }]),
  );
  assert.deepEqual(resolveToken("type.body", tokens), {
    fontSize: { value: 1, unit: "rem" },
    lineHeight: 1.5,
  });
  assert.equal(resolvedType("size.body", tokens), "dimension");
  assert.throws(() => resolveToken("size.missing", tokens), /does not exist/);
});

test("contrastRatio matches known WCAG values", () => {
  assert.equal(contrastRatio(srgb("#000000"), srgb("#ffffff")).toFixed(2), "21.00");
  assert.equal(contrastRatio(srgb("#767676"), srgb("#ffffff")).toFixed(2), "4.54");
  assert.equal(contrastRatio(srgb("#ffffff"), srgb("#767676")).toFixed(2), "4.54");
});

test("a translucent foreground is blended onto its background first", () => {
  const halfBlack = { ...srgb("#000000"), alpha: 0.5 };
  const blended = contrastRatio(halfBlack, srgb("#ffffff"));
  assert.ok(blended > 3.9 && blended < 4.0, `got ${blended}`);
});

test("hexOf converts oklch and hsl to sRGB hex", () => {
  assert.equal(hexOf({ colorSpace: "oklch", components: [1, 0, 0] }), "#ffffff");
  assert.equal(hexOf({ colorSpace: "hsl", components: [0, 100, 50] }), "#ff0000");
});

test("checkValue accepts valid values of each supported type", () => {
  const valid = [
    ["color", srgb("#336699")],
    ["dimension", { value: 0, unit: "px" }],
    ["duration", { value: 200, unit: "ms" }],
    ["fontFamily", ["Be Vietnam Pro", "sans-serif"]],
    ["fontFamily", "system-ui"],
    ["fontWeight", 350],
    ["fontWeight", "semi-bold"],
    ["number", 1.5],
    ["cubicBezier", [0.2, -0.5, 0, 1.5]],
    [
      "typography",
      {
        fontFamily: "Inter",
        fontSize: { value: 1, unit: "rem" },
        fontWeight: 400,
        letterSpacing: { value: 0, unit: "px" },
        lineHeight: 1.5,
      },
    ],
    [
      "shadow",
      [
        {
          color: { ...srgb("#000000"), alpha: 0.2 },
          offsetX: { value: 0, unit: "px" },
          offsetY: { value: 2, unit: "px" },
          blur: { value: 4, unit: "px" },
          spread: { value: 0, unit: "px" },
          inset: true,
        },
      ],
    ],
  ];
  for (const [type, value] of valid) {
    assert.deepEqual(checkValue(type, value), [], `${type}: ${JSON.stringify(value)}`);
  }
});

test("checkValue rejects invalid values with a reason", () => {
  const invalid = [
    ["color", "#336699", /must be an object/],
    ["color", { colorSpace: "srgb", components: [1, "none", 1], hex: "#ffffff" }, /three numbers/],
    ["color", { colorSpace: "srgb", components: [1, 1, 1] }, /hex is required/],
    ["color", { ...srgb("#336699"), alpha: 2 }, /alpha/],
    ["dimension", { value: 1, unit: "em" }, /dimension must be/],
    ["dimension", 16, /dimension must be/],
    ["duration", { value: 1, unit: "min" }, /duration must be/],
    ["fontWeight", "Bold", /fontWeight must be/],
    ["fontWeight", 0, /fontWeight must be/],
    ["cubicBezier", [1.2, 0, 0, 1], /x values between 0 and 1/],
    ["typography", { fontFamily: "Inter" }, /missing "fontSize"/],
    ["shadow", [], /at least one layer/],
    ["gradient", [], /unsupported type "gradient"/],
  ];
  for (const [type, value, pattern] of invalid) {
    const problems = checkValue(type, value);
    assert.ok(
      problems.some((problem) => pattern.test(problem)),
      `${type} ${JSON.stringify(value)}: expected ${pattern}, got ${problems.join("; ")}`,
    );
  }
});
