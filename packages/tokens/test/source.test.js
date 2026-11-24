// Tests the linter and contrast checker against copies of the real token source, each broken
// in one specific way. If a rule stops firing, the matching test fails.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkContrast, lint, loadSource } from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** Copies the token source to a temp dir and applies `edits`: {file: (json) => void | null}. */
function sourceWith(edits = {}) {
  const dir = mkdtempSync(join(tmpdir(), "raincoat-tokens-"));
  scratch.push(dir);
  cpSync(join(repoRoot, "tokens"), join(dir, "tokens"), { recursive: true });
  cpSync(join(repoRoot, "schemas"), join(dir, "schemas"), { recursive: true });
  for (const [file, edit] of Object.entries(edits)) {
    const path = join(dir, file);
    if (edit === null) {
      rmSync(path);
    } else if (typeof edit === "string") {
      writeFileSync(path, edit);
    } else {
      const json = JSON.parse(readFileSync(path, "utf8"));
      edit(json);
      writeFileSync(path, JSON.stringify(json, null, 2));
    }
  }
  return dir;
}

/** The ids of the tokens whose value is a reference to `id`. */
const followersOf = (id, dir) =>
  loadSource(dir)
    .flatMap((entry) => entry.tokens)
    .filter((token) => token.value === `{${id}}`)
    .map((token) => token.id);

const messages = (edits) => lint(sourceWith(edits)).map((problem) => problem.message);
const assertProblem = (edits, pattern) => {
  const found = messages(edits);
  assert.ok(
    found.some((message) => pattern.test(message)),
    `expected a problem matching ${pattern}, got:\n${found.join("\n") || "(none)"}`,
  );
};

const light = "tokens/semantic/color.light.tokens.json";
const dark = "tokens/semantic/color.dark.tokens.json";
const primitives = "tokens/primitive/color.tokens.json";
const button = "tokens/component/button.tokens.json";

test("the committed token source is valid and meets every contrast requirement", () => {
  assert.deepEqual(lint(repoRoot), []);
  const rows = checkContrast(repoRoot);
  assert.ok(rows.length > 100, "expected the source to declare many color pairs");
  assert.deepEqual(
    rows.filter((row) => !row.pass),
    [],
  );
});

test("a token without a description is rejected", () => {
  assertProblem(
    { [light]: (json) => delete json.color.bg.canvas.$description },
    /color\.bg\.canvas: must have required property '\$description'/,
  );
});

test("a name with uppercase letters or underscores is rejected", () => {
  assertProblem(
    { [light]: (json) => (json.color.bg.Canvas_Alt = json.color.bg.canvas) },
    /unexpected property "Canvas_Alt"/,
  );
});

test("a reference to a missing token is reported", () => {
  assertProblem(
    { [light]: (json) => (json.color.bg.canvas.$value = "{color.neutral.5}") },
    /color\.bg\.canvas: reference to "color\.neutral\.5", which does not exist/,
  );
});

test("a circular reference is reported", () => {
  assertProblem(
    {
      [button]: (json) => {
        json.button.primary.bg.default.$value = "{button.primary.bg.hover}";
        json.button.primary.bg.hover.$value = "{button.primary.bg.default}";
      },
    },
    /circular reference/,
  );
});

test("tiers may only reference the tier below", () => {
  assertProblem(
    { [button]: (json) => (json.button.primary.bg.default.$value = "{color.brand.400}") },
    /a component token may only reference semantic tokens, but \{color\.brand\.400\} is primitive/,
  );
  assertProblem(
    {
      [light]: (json) =>
        (json.color.bg.canvas.$value = {
          colorSpace: "srgb",
          components: [1, 1, 1],
          hex: "#ffffff",
        }),
    },
    /a semantic token must reference primitive tokens, not hold literal values/,
  );
  assertProblem(
    { [primitives]: (json) => (json.color.neutral["50"].$value = "{color.neutral.0}") },
    /a primitive token must hold a literal value, not a reference/,
  );
});

test("color values are checked: hex, gamut, and color space", () => {
  assertProblem(
    { [primitives]: (json) => (json.color.brand["400"].$value.hex = "#123456") },
    /hex #123456 does not match the components/,
  );
  assertProblem(
    { [primitives]: (json) => (json.color.brand["400"].$value.components = [0.87, 0.4, 95]) },
    /outside the sRGB gamut/,
  );
  assertProblem(
    { [primitives]: (json) => (json.color.brand["400"].$value.colorSpace = "display-p3") },
    /colorSpace must be one of srgb, hsl, oklch/,
  );
});

test("dimension units are restricted to px and rem", () => {
  assertProblem(
    {
      "tokens/primitive/dimension.tokens.json": (json) =>
        (json.dimension["16"].$value = { value: 1, unit: "em" }),
    },
    /dimension\.16: a dimension must be/,
  );
});

test("a text style smaller than font.size.12 is rejected", () => {
  const edits = {
    "tokens/primitive/font.tokens.json": (json) => {
      json.font.size["11"] = {
        $value: { value: 0.6875, unit: "rem" },
        $description: "11px equivalent, below the smallest size.",
      };
    },
    "tokens/semantic/type.tokens.json": (json) =>
      (json.type.caption.$value.fontSize = "{font.size.11}"),
  };
  assertProblem(
    edits,
    /type\.caption: its font size, 11px, is below \{font\.size\.12\} \(12px\), the smallest size text may have/,
  );
  // A component style that refers to it is too small as well.
  assertProblem(
    {
      ...edits,
      [button]: (json) => (json.button.label.sm.$value = "{type.caption}"),
    },
    /button\.label\.sm: its font size, 11px, is below/,
  );
  // The smallest size itself is allowed.
  assert.deepEqual(
    messages({
      "tokens/semantic/type.tokens.json": (json) =>
        (json.type.body.sm.$value.fontSize = "{font.size.12}"),
    }),
    [],
  );
});

test("a token may not reference a token of another type", () => {
  assertProblem(
    { [light]: (json) => (json.color.bg.canvas.$value = "{dimension.16}") },
    /color\.bg\.canvas: is a color but references \{dimension\.16\}, a dimension/,
  );
});

test("every color mode and density must define the same tokens", () => {
  assertProblem(
    { [dark]: (json) => delete json.color.fg.muted },
    /color modes: color\.fg\.muted is defined in .* but missing here/,
  );
  assertProblem(
    { "tokens/semantic/color.dark-hc.tokens.json": null },
    /color modes: no file for "dark-hc"/,
  );
  assertProblem(
    { "tokens/semantic/density.compact.tokens.json": null },
    /densities: no file for "compact"/,
  );
});

test("an unrecognized variant file name is reported", () => {
  assertProblem({ "tokens/semantic/color.sepia.tokens.json": "{}" }, /unrecognized file name/);
});

test("two tokens may not share a flat name", () => {
  assertProblem(
    {
      [light]: (json) => {
        json.color["bg-canvas"] = {
          $value: "{color.neutral.0}",
          $description: "Collides with color.bg.canvas once flattened.",
        };
      },
      ...Object.fromEntries(
        ["dark", "light-hc", "dark-hc"].map((mode) => [
          `tokens/semantic/color.${mode}.tokens.json`,
          (json) => {
            json.color["bg-canvas"] = {
              $value: "{color.neutral.0}",
              $description: "Collides with color.bg.canvas once flattened.",
            };
          },
        ]),
      ),
    },
    /its name "color-bg-canvas" collides with/,
  );
});

test("text and border colors must declare their contrast", () => {
  assertProblem(
    { [light]: (json) => delete json.color.fg.muted.$extensions },
    /color\.fg\.muted: a text, border, or focus color must declare "contrast"/,
  );
  assertProblem(
    {
      [light]: (json) => (json.color.fg.muted.$extensions.raincoat.on = ["color.bg.nowhere"]),
    },
    /"on" names color\.bg\.nowhere, which does not exist/,
  );
  assertProblem(
    {
      [light]: (json) =>
        (json.color.fg.disabled.$extensions.raincoat = { overridable: true, contrast: "exempt" }),
    },
    /must have required property 'contrast-note'/,
  );
});

test("a pair below its contrast requirement fails, in the mode where it is too low", () => {
  const dir = sourceWith({
    [light]: (json) => (json.color.fg.muted.$value = "{color.neutral.400}"),
  });
  assert.deepEqual(lint(dir), []);
  const failures = checkContrast(dir).filter((row) => !row.pass);
  assert.ok(failures.length > 0);
  // The role fails, and so does every component token that takes its value.
  const muted = ["color.fg.muted", ...followersOf("color.fg.muted", dir)];
  assert.ok(failures.some((row) => row.token === "color.fg.muted"));
  assert.ok(failures.every((row) => row.mode === "light" && muted.includes(row.token)));
  assert.ok(failures.every((row) => row.ratio < 4.5 && row.required === 4.5));
});

test("high-contrast modes require 7:1 for text", () => {
  const dir = sourceWith({
    "tokens/semantic/color.light-hc.tokens.json": (json) =>
      (json.color.fg.muted.$value = "{color.neutral.600}"),
  });
  const failures = checkContrast(dir).filter((row) => !row.pass);
  assert.ok(failures.length > 0);
  assert.ok(failures.every((row) => row.mode === "light-hc" && row.required === 7));
  assert.ok(
    failures.some((row) => row.ratio >= 4.5),
    "passes AA but must still fail in high contrast",
  );
});
