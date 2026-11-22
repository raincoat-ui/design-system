// Tests for the Swift emitter. Whether the emitted values are right is decided by the Swift
// contract test in packages/ios, which compiles them; these tests cover the emitter's own rules.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { canonical, expectedSwift, themeSwift, tokenSetSwift } from "../src/emit/swift.js";
import { compose, loadSource } from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const files = loadSource(repoRoot);
const tokens = compose(files, { mode: "light", density: "comfortable" }).tokens;
const exposed = [...tokens.values()].filter((token) => token.tier !== "primitive");
const schema = tokenSetSwift(files);
const theme = themeSwift(files, "base");
const expected = expectedSwift(files, "base");

const srgb = (hex, alpha) => ({
  colorSpace: "srgb",
  components: [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255),
  hex,
  ...(alpha === undefined ? {} : { alpha }),
});

test("canonical text matches the format of TokenFormat in the Swift package", () => {
  assert.equal(canonical("color", srgb("#f7d22a")), "#f7d22a");
  assert.equal(canonical("color", srgb("#ffffff", 0.5)), "#ffffff80");
  assert.equal(canonical("dimension", { value: 16, unit: "px" }), "16.0000");
  assert.equal(canonical("dimension", { value: 0.875, unit: "rem" }), "14.0000");
  assert.equal(canonical("duration", { value: 100, unit: "ms" }), "0.1000");
  assert.equal(canonical("number", 1.4), "1.4000");
  assert.equal(canonical("fontWeight", "semi-bold"), "600");
  assert.equal(
    canonical("fontFamily", ["Be Vietnam Pro", "system-ui"]),
    "Be Vietnam Pro, system-ui",
  );
  assert.equal(canonical("cubicBezier", [0.2, 0, 0, 1]), "0.2000,0.0000,0.0000,1.0000");
});

test("every semantic and component token is exposed, and no primitive is", () => {
  const flattened = [...schema.matchAll(/^\s+"([a-z0-9.-]+)": TokenFormat\.string\(/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(flattened.sort(), exposed.map((token) => token.id).sort());
  assert.ok(flattened.length > 80);
  for (const id of flattened) {
    assert.notEqual(tokens.get(id).tier, "primitive", `${id} is a primitive`);
  }
  assert.ok(!schema.includes("ColorNeutralTokens"), "primitive ramps must not become Swift types");
});

test("names are valid Swift: keywords are escaped and digits are prefixed", () => {
  assert.match(schema, /public let `default`: TokenColor/);
  assert.match(schema, /self\.default = `default`/);
  assert.match(schema, /public let _4: Double/);
  assert.match(schema, /"color\.fg\.default": TokenFormat\.string\(color\.fg\.default\)/);
  assert.match(schema, /"space\.4": TokenFormat\.string\(space\._4\)/);
  assert.match(schema, /public let onAccent: TokenColor/);
  assert.match(schema, /public let borderWidth: BorderWidthTokens/);
});

test("token descriptions become documentation comments", () => {
  assert.match(schema, /\/\/\/ The page background\.\n\s+public let canvas: TokenColor/);
});

test("a theme provides a token set for every mode and density", () => {
  for (const name of [
    "lightComfortable",
    "lightCompact",
    "darkComfortable",
    "darkCompact",
    "lightHighContrastComfortable",
    "lightHighContrastCompact",
    "darkHighContrastComfortable",
    "darkHighContrastCompact",
  ]) {
    assert.ok(theme.includes(`static let ${name} = RaincoatTokenSet(`), name);
    assert.ok(theme.includes(`BaseThemeValues.${name}`), name);
  }
  assert.match(theme, /public static let base = RaincoatTheme\(id: "base"\)/);
});

test("the expected values cover every exposed token in each of the eight combinations", () => {
  assert.equal([...expected.matchAll(/^ {4}"[a-z-]+\/[a-z]+": \[$/gm)].length, 8);
  const rows = [...expected.matchAll(/^ {8}"[a-z0-9.-]+": "/gm)].length;
  assert.equal(rows, exposed.length * 8);
});

test("output is deterministic", () => {
  assert.equal(tokenSetSwift(files), schema);
  assert.equal(themeSwift(files, "base"), theme);
});
