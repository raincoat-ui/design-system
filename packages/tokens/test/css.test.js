// Contract test for the web output. The stylesheet comes from the emitter in src/emit; the
// expected values are worked out here, separately, from the loader and resolver. The two must
// agree on every token, in every color mode and density.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildThemeCss } from "../src/emit/css.js";
import { build } from "../src/emit/index.js";
import { compose, hexOf, loadSource, MODES, resolvedType, resolveToken } from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const files = loadSource(repoRoot);
const css = await buildThemeCss(repoRoot);

/** Parses the generated stylesheet into a Map from block selector to its declarations. */
function parse(text) {
  const blocks = new Map();
  let media = null;
  let current = null;
  let selector = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("/*")) continue;
    if (line.startsWith("@media")) {
      media = line.slice(0, -1).trim();
    } else if (line.endsWith("{")) {
      selector.push(line.slice(0, -1).trim());
      current = new Map();
      blocks.set([media, selector.join(" ")].filter(Boolean).join(" "), current);
      selector = [];
    } else if (line.endsWith(",")) {
      selector.push(line);
    } else if (line === "}") {
      if (current) current = null;
      else media = null;
    } else {
      const match = /^(--[\w-]+):\s*(.+);$/.exec(line);
      assert.ok(match && current, `unexpected line in the stylesheet: ${raw}`);
      current.set(match[1], match[2]);
    }
  }
  return blocks;
}

const blocks = parse(css);
const BASE = ':root, [data-theme="light"]';
const base = blocks.get(BASE);
const blockFor = (mode) => (mode === "light" ? new Map() : blocks.get(`[data-theme="${mode}"]`));

/** The value a property ends up with inside a scope, following var() references. */
function effective(name, scope, seen = []) {
  assert.ok(!seen.includes(name), `circular var() reference at ${name}`);
  const value = scope.get(name) ?? base.get(name);
  assert.ok(value !== undefined, `${name} is referenced but never declared`);
  return value.replace(/var\((--[\w-]+)\)/g, (_, inner) =>
    effective(inner, scope, [...seen, name]),
  );
}

const FIELD = {
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  letterSpacing: "letter-spacing",
  lineHeight: "line-height",
};
const TYPE_OF_FIELD = {
  fontFamily: "fontFamily",
  fontSize: "dimension",
  fontWeight: "fontWeight",
  letterSpacing: "dimension",
  lineHeight: "number",
};

/** How a resolved token value is written in CSS. */
function cssValue(type, value) {
  switch (type) {
    case "color":
      assert.equal(value.alpha ?? 1, 1, "translucent colors need their own expectation");
      return hexOf(value);
    case "dimension":
      return `${value.value}${value.unit}`;
    case "duration":
      return `${value.value}${value.unit}`;
    case "fontFamily":
      return []
        .concat(value)
        .map((name) => (/^[a-z-]+$/.test(name) ? name : `"${name}"`))
        .join(", ");
    case "cubicBezier":
      return `cubic-bezier(${value.join(", ")})`;
    default:
      return String(value);
  }
}

/** The properties a token must produce: one, or one per field for typography. */
function expected(token, tokens) {
  const type = resolvedType(token.id, tokens);
  const value = resolveToken(token.id, tokens);
  if (type !== "typography") return [[`--${token.name}`, cssValue(type, value)]];
  return Object.entries(FIELD).map(([field, suffix]) => [
    `--${token.name}-${suffix}`,
    cssValue(TYPE_OF_FIELD[field], value[field]),
  ]);
}

const expectedFor = (mode, density) => {
  const { tokens } = compose(files, { mode, density });
  return new Map([...tokens.values()].flatMap((token) => expected(token, tokens)));
};

test("the stylesheet has the expected blocks", () => {
  assert.deepEqual(
    [...blocks.keys()],
    [
      BASE,
      '[data-theme="dark"]',
      '[data-theme="light-hc"]',
      '[data-theme="dark-hc"]',
      '[data-density="compact"]',
      "@media (prefers-color-scheme: dark) :root:not([data-theme])",
      "@media (prefers-contrast: more) :root:not([data-theme])",
      "@media (prefers-color-scheme: dark) and (prefers-contrast: more) :root:not([data-theme])",
    ],
  );
});

test("the base block declares every token, and nothing else", () => {
  const want = [...expectedFor("light", "comfortable").keys()].sort();
  assert.deepEqual([...base.keys()].sort(), want);
  assert.ok(want.length > 150, "expected the full token set");
});

for (const mode of MODES) {
  test(`${mode}: every property resolves to the value in the token source`, () => {
    const scope = blockFor(mode);
    for (const [name, value] of expectedFor(mode, "comfortable")) {
      assert.equal(effective(name, scope), value, `${name} in ${mode}`);
    }
  });
}

test("compact density: every property resolves to the value in the token source", () => {
  const scope = blocks.get('[data-density="compact"]');
  for (const [name, value] of expectedFor("light", "compact")) {
    assert.equal(effective(name, scope), value, `${name} at compact density`);
  }
  assert.ok(scope.size > 0 && [...scope.keys()].every((name) => /height|size-control/.test(name)));
});

test("a mode block redeclares every property whose value differs, so modes can be nested", () => {
  const light = expectedFor("light", "comfortable");
  for (const mode of MODES.slice(1)) {
    const scope = blockFor(mode);
    const differing = [...expectedFor(mode, "comfortable")]
      .filter(([name, value]) => light.get(name) !== value)
      .map(([name]) => name)
      .sort();
    assert.deepEqual([...scope.keys()].sort(), differing, mode);
    // Component tokens are among them: they are what a nested scope would otherwise get wrong.
    assert.ok(differing.some((name) => name.startsWith("--button-")));
  }
});

test("the system-preference blocks mirror the explicit mode blocks", () => {
  const unset = ":root:not([data-theme])";
  for (const [query, mode] of [
    ["(prefers-color-scheme: dark)", "dark"],
    ["(prefers-contrast: more)", "light-hc"],
    ["(prefers-color-scheme: dark) and (prefers-contrast: more)", "dark-hc"],
  ]) {
    assert.deepEqual(
      [...blocks.get(`@media ${query} ${unset}`)],
      [...blockFor(mode)],
      `${query} should match ${mode}`,
    );
  }
});

test("colors are written as six-digit hex, with no functions that older tools cannot read", () => {
  for (const [name, value] of base) {
    if (name.startsWith("--color-") && !value.startsWith("var(")) {
      assert.match(value, /^#[0-9a-f]{6}$/, name);
    }
  }
  assert.ok(!/color-mix|oklch|rgb\(/.test(css));
});

test("the committed stylesheet is up to date with the token source", async () => {
  const results = await build(repoRoot, { check: true });
  assert.deepEqual(
    results.filter((result) => result.status !== "unchanged"),
    [],
    "run `pnpm tokens:build` and commit the result",
  );
});
