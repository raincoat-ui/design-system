// Tests for the Kotlin emitter. Whether the emitted values are right is decided by the Kotlin
// contract test in packages/android/theme-base, which compiles them; these tests cover the
// emitter's own rules.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { expectedKotlin, themeKotlin, tokenSetKotlin } from "../src/emit/kotlin.js";
import { compose, loadSource } from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const files = loadSource(repoRoot);
const tokens = compose(files, { mode: "light", density: "comfortable" }).tokens;
const exposed = [...tokens.values()].filter((token) => token.tier !== "primitive");
const schema = tokenSetKotlin(files);
const theme = themeKotlin(files, "base");
const expected = expectedKotlin(files, "base");

test("every semantic and component token is exposed, and no primitive is", () => {
  const flattened = [...schema.matchAll(/^\s+"([a-z0-9.-]+)" to TokenFormat\.\w+\(/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(flattened.sort(), exposed.map((token) => token.id).sort());
  assert.ok(!schema.includes("ColorNeutralTokens"), "primitive ramps must not become classes");
});

test("each token type is written with its own formatter", () => {
  assert.match(schema, /"color\.bg\.canvas" to TokenFormat\.color\(color\.bg\.canvas\)/);
  assert.match(schema, /"space\.4" to TokenFormat\.number\(space\._4\)/);
  assert.match(
    schema,
    /"motion\.duration\.fast" to TokenFormat\.milliseconds\(motion\.duration\.fast\)/,
  );
  assert.match(schema, /"type\.label\.md" to TokenFormat\.textStyle\(type\.label\.md\)/);
  assert.match(
    schema,
    /"motion\.easing\.interactive" to TokenFormat\.easing\(motion\.easing\.interactive\)/,
  );
  assert.match(schema, /"card\.shadow" to TokenFormat\.shadow\(card\.shadow\)/);
  assert.match(schema, /public val raised: TokenShadow,/);
});

test("names and types are valid Kotlin", () => {
  assert.match(schema, /public val default: TokenColor,/);
  assert.match(schema, /public val _4: Double,/);
  assert.match(schema, /public val onAccent: TokenColor,/);
  assert.match(schema, /public val borderWidth: BorderWidthTokens,/);
  assert.match(schema, /public val fast: Int,/);
  assert.match(schema, /^package io\.github\.raincoatui\.tokens$/m);
});

test("values are written as Kotlin literals of the right type", () => {
  assert.match(theme, /canvas = TokenColor\(0xFFFFFFFF\)/);
  assert.match(theme, /md = 44\.0,/);
  assert.match(theme, /fast = 100,/);
  assert.match(theme, /TokenEasing\(0\.2, 0\.0, 0\.0, 1\.0\)/);
  assert.match(
    theme,
    /TokenTextStyle\(families = listOf\("Be Vietnam Pro", "system-ui", "sans-serif"\), size = 16\.0, weight = 600, letterSpacing = 0\.0, lineHeight = 1\.4\)/,
  );
  // Translucent colors carry their alpha in the top byte.
  assert.match(theme, /scrim = TokenColor\(0x66000000\)/);
  assert.match(
    theme,
    /raised = TokenShadow\(layers = listOf\(TokenShadowLayer\(color = TokenColor\(0x00000000\), offsetX = 0\.0, offsetY = 0\.0, blur = 0\.0, spread = 0\.0, inset = false\)\)\)/,
  );
  assert.match(theme, /^import io\.github\.raincoatui\.tokens\.TokenShadowLayer$/m);
});

test("a theme provides a lazily built token set for every mode and density", () => {
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
    assert.ok(theme.includes(`val ${name}: RaincoatTokenSet by lazy {`), name);
    assert.ok(theme.includes(`BaseThemeValues.${name}`), name);
  }
  assert.match(theme, /public val BaseTheme: RaincoatTheme = RaincoatTheme\(id = "base"\)/);
  assert.match(theme, /^package io\.github\.raincoatui\.theme\.base$/m);
});

test("the expected values cover every exposed token in each of the eight combinations", () => {
  assert.equal([...expected.matchAll(/^ {4}"[a-z-]+\/[a-z]+" to \w+\(\),$/gm)].length, 8);
  const rows = [...expected.matchAll(/^ {4}"[a-z0-9.-]+" to "/gm)].length;
  assert.equal(rows, exposed.length * 8);
});

test("output is deterministic", () => {
  assert.equal(tokenSetKotlin(files), schema);
  assert.equal(themeKotlin(files, "base"), theme);
});
