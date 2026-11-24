// Tests the snapshot matrix and the example text of each spec: the linter, against copies of the
// real files each broken in one specific way; the expanded pseudo-locale; and what the token
// build generates from them for each platform's snapshot tests.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { snapshotsKotlin, snapshotsSwift, snapshotsTypeScript } from "../src/emit/spec.js";
import { lintSpecs, loadSpecs } from "../src/index.js";
import { componentExamples, expandText, loadMatrix, resolveSnapshots } from "../src/snapshots.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const MATRIX = "specs/snapshots.yaml";
const STRINGS = "specs/components/button/strings.yaml";
const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/**
 * Copies what the spec linter reads to a temp dir, then edits one YAML file in it. Of the
 * platform packages, only the files the specs list as implementations are copied.
 */
function withEdit(file, edit, extra = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), "raincoat-snapshots-"));
  scratch.push(dir);
  for (const part of ["specs", "schemas", "tokens", "rfcs"]) {
    cpSync(join(repoRoot, part), join(dir, part), { recursive: true });
  }
  for (const { spec } of loadSpecs(repoRoot)) {
    for (const { file: source } of Object.values(spec?.implementations ?? {})) {
      mkdirSync(dirname(join(dir, source)), { recursive: true });
      cpSync(join(repoRoot, source), join(dir, source));
    }
  }
  const data = parse(readFileSync(join(dir, file), "utf8"));
  edit(data);
  writeFileSync(join(dir, file), stringify(data));
  extra(dir);
  return dir;
}

function assertProblem(file, edit, pattern, extra) {
  const found = lintSpecs(withEdit(file, edit, extra)).map(({ file, message }) =>
    [file, message].join(": "),
  );
  assert.ok(
    found.some((message) => pattern.test(message)),
    `expected a problem matching ${pattern}, got:\n${found.join("\n") || "(none)"}`,
  );
}

const button = () => loadSpecs(repoRoot).find((entry) => entry.id === "button").spec;

test("the committed matrix and strings are valid, and a copy edited without a change is too", () => {
  assert.deepEqual(lintSpecs(repoRoot), []);
  assert.deepEqual(lintSpecs(withEdit(MATRIX, () => {})), []);
  assert.deepEqual(lintSpecs(withEdit(STRINGS, () => {})), []);
});

test("the matrix has 11 snapshots: four color modes, right-to-left, the largest text, and five locales", () => {
  const snapshots = resolveSnapshots(loadMatrix(repoRoot));
  assert.deepEqual(
    snapshots.map(({ id, mode, locale, direction, textSize }) => [
      id,
      mode,
      locale,
      direction,
      textSize.id,
    ]),
    [
      ["light", "light", "en", "ltr", "default"],
      ["dark", "dark", "en", "ltr", "default"],
      ["light-hc", "light-hc", "en", "ltr", "default"],
      ["dark-hc", "dark-hc", "en", "ltr", "default"],
      ["rtl", "light", "ar", "rtl", "default"],
      ["largest-text", "light", "en", "ltr", "largest"],
      ["vi", "light", "vi", "ltr", "default"],
      ["zh-hans", "light", "zh-Hans", "ltr", "default"],
      ["ja", "light", "ja", "ltr", "default"],
      ["ko", "light", "ko", "ltr", "default"],
      ["expanded", "light", "en-XA", "ltr", "default"],
    ],
  );
  const largest = snapshots.find(({ id }) => id === "largest-text").textSize;
  assert.deepEqual([largest.web, largest.ios, largest.android], ["200%", "accessibility5", 2]);
});

test("the matrix may only name color modes, locales, and text sizes that exist", () => {
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.snapshots[1].mode = "sepia";
    },
    /snapshots\.yaml: snapshots\.dark: "sepia" is not a color mode/,
  );
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.snapshots[6].locale = "th";
    },
    /snapshots\.vi: "th" is not one of the locales/,
  );
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.defaults["text-size"] = "huge";
    },
    /defaults: "huge" is not one of the text sizes/,
  );
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.defaults.locale = "en-XA";
    },
    /defaults: the default locale cannot be a pseudo-locale/,
  );
});

test("each snapshot has its own id and draws something no other snapshot draws", () => {
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.snapshots.push({ ...matrix.snapshots[0] });
    },
    /snapshots: "light" is used twice/,
  );
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.snapshots.push({ id: "english", description: "English, in the light mode." });
    },
    /snapshots\.english: draws the same as "light"/,
  );
});

test("the matrix is checked against its schema", () => {
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix["text-sizes"].largest.ios = "huge";
    },
    /text-sizes\.largest\.ios: must be equal to one of the allowed values/,
  );
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.locales.vi.pseudo = "mirrored";
    },
    /locales\.vi\.pseudo: must be equal to one of the allowed values/,
  );
  assertProblem(
    MATRIX,
    () => {},
    /snapshots\.yaml: missing/,
    (dir) => rmSync(join(dir, MATRIX)),
  );
});

test("each spec has strings, with text for every example and nothing else", () => {
  assertProblem(
    STRINGS,
    () => {},
    /button\/strings\.yaml: missing/,
    (dir) => rmSync(join(dir, STRINGS)),
  );
  assertProblem(
    STRINGS,
    (strings) => {
      delete strings.examples.sizes;
    },
    /examples: no text for the example "sizes" of spec\.yaml/,
  );
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples.outlined = strings.examples.sizes;
    },
    /examples\.outlined: spec\.yaml has no example "outlined"/,
  );
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples.sizes.caption = strings.examples.sizes.label;
    },
    /examples\.sizes\.caption: "caption" is not content of the spec/,
  );
});

test("text is written in every locale of the matrix but the pseudo-locale", () => {
  assertProblem(
    STRINGS,
    (strings) => {
      delete strings.examples.variants.label.ko;
    },
    /examples\.variants\.label: no text in "ko"/,
  );
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples.variants.label.th = "บันทึกการเปลี่ยนแปลง";
    },
    /examples\.variants\.label\.th: "th" is not a locale of specs\/snapshots\.yaml/,
  );
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples.variants.label["en-XA"] = "[Šåṽé]";
    },
    /examples\.variants\.label\.en-XA: a pseudo-locale is derived from English; remove it/,
  );
  // A new locale in the matrix needs text in every spec.
  assertProblem(
    MATRIX,
    (matrix) => {
      matrix.locales.th = { name: "Thai" };
    },
    /strings\.yaml: examples\.variants\.label: no text in "th"/,
  );
});

test("text is composed (NFC), without spaces around it, and matches a label the spec gives", () => {
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples.variants.label.vi = "Lưu thay đổi".normalize("NFD");
    },
    /examples\.variants\.label\.vi: not in Unicode's composed form \(NFC\)/,
  );
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples.sizes.label.ja = " 続行";
    },
    /examples\.sizes\.label\.ja: starts or ends with a space/,
  );
  assertProblem(
    STRINGS,
    (strings) => {
      strings.examples["long-label"].label.en = "Save and send";
    },
    /examples\.long-label\.label\.en: spec\.yaml gives this example the label "Save all of these/,
  );
});

test("the expanded pseudo-locale is the English accented, about 40% longer, and in brackets", () => {
  assert.equal(expandText("Save changes"), "[Šåṽé çĥåñĝéš one]");
  const long = "Save all of these changes and send the updated version to every reviewer";
  const expanded = expandText(long);
  assert.match(expanded, /^\[Šåṽé åļļ öƒ ţĥéšé .* one two three four five six\]$/);
  for (const english of ["OK", "Continue", long]) {
    const length = [...expandText(english)].length;
    assert.ok(length >= english.length * 1.4, `${english}: ${length} characters`);
    assert.ok(length <= english.length * 1.4 + 6, `${english}: ${length} characters`);
  }
  // Only letters of the English alphabet change; digits, punctuation, and others stay.
  assert.equal(expandText("Pay 25 €, now!"), "[Þåý 25 €, ñöŵ! one]");
  assert.equal(expandText("Save changes"), expandText("Save changes"));
});

test("each example has its instances, with every property, and its text in every locale", () => {
  const examples = componentExamples(repoRoot, button(), loadMatrix(repoRoot));
  const variants = examples.find(({ id }) => id === "variants");
  assert.deepEqual(
    variants.instances.map(({ variant }) => variant),
    ["primary", "secondary", "ghost", "danger"],
  );
  assert.deepEqual(variants.instances[0], {
    variant: "primary",
    size: "md",
    "full-width": false,
    disabled: false,
    loading: false,
  });
  assert.deepEqual(Object.keys(variants.text), ["en", "vi", "zh-Hans", "ja", "ko", "ar", "en-XA"]);
  assert.equal(variants.text.vi.label, "Lưu thay đổi");
  assert.equal(variants.text["en-XA"].label, expandText(variants.text.en.label));
  const disabled = examples.find(({ id }) => id === "disabled");
  assert.deepEqual(disabled.instances, [
    { variant: "secondary", size: "md", "full-width": false, disabled: true, loading: false },
  ]);
});

test("TypeScript gets the matrix, and each spec's examples typed with the component's props", () => {
  const typescript = snapshotsTypeScript(repoRoot);
  assert.match(typescript, /^\/\/ GENERATED by raincoat-tokens/);
  assert.match(
    typescript,
    // Other components' types follow the Button's.
    /import type \{ ButtonVariant, ButtonSize(, \w+)* \} from "\.\.\/\.\.\/\.\.\/src\/generated\/specs\.js";/,
  );
  assert.match(
    typescript,
    /id: "largest-text",[^}]+textSize: \{ id: "largest", rootFontSize: "200%" \}/,
  );
  assert.match(typescript, /id: "rtl",[^}]+locale: "ar",\n\s+direction: "rtl"/);
  assert.match(typescript, /readonly fullWidth: boolean;/);
  assert.match(
    typescript,
    /\{ variant: "primary", size: "md", fullWidth: true, disabled: false, loading: false \}/,
  );
  assert.match(typescript, /"en-XA": \{ label: "\[Šåṽé çĥåñĝéš one\]" \}/);
  assert.match(
    typescript,
    /export const BUTTON_EXAMPLES: readonly SpecExample<ButtonExampleProperties>\[\]/,
  );
});

test("Swift and Kotlin get the matrix and each spec's examples, typed with the spec's types", () => {
  const swift = snapshotsSwift(repoRoot);
  assert.match(
    swift,
    /VisualSnapshot\(id: "dark-hc", mode: \.darkHighContrast, locale: "en", rightToLeft: false, textSize: \.default\)/,
  );
  assert.match(swift, /rightToLeft: true/);
  assert.match(swift, /case \.largest: \.accessibility5/);
  assert.match(
    swift,
    /ButtonExampleProperties\(variant: \.primary, size: \.lg, fullWidth: false, disabled: false, loading: false\)/,
  );
  assert.match(swift, /"vi": \["label": "Ẩn chi tiết"\]/);

  const kotlin = snapshotsKotlin(repoRoot);
  assert.match(kotlin, /^package io\.github\.raincoatui\.ui\.generated$/m);
  assert.match(kotlin, /Largest\(2f\),/);
  assert.match(
    kotlin,
    /VisualSnapshot\(id = "light-hc", mode = ColorMode\.LightHighContrast, locale = "en", rightToLeft = false, textSize = SnapshotTextSize\.Default\)/,
  );
  assert.match(
    kotlin,
    /ButtonExampleProperties\(variant = ButtonVariant\.Danger, size = ButtonSize\.Md, fullWidth = false, disabled = false, loading = false\)/,
  );
  assert.match(kotlin, /"ar" to mapOf\("label" to "إخفاء التفاصيل"\)/);
});

test("text is escaped for each language", () => {
  const dir = withEdit(STRINGS, (strings) => {
    strings.examples.variants.label.en = 'Pay $5 "now" \\ later';
  });
  assert.match(snapshotsTypeScript(dir), /en: \{ label: "Pay \$5 \\"now\\" \\\\ later" \}/);
  assert.match(snapshotsSwift(dir), /"en": \["label": "Pay \$5 \\"now\\" \\\\ later"\]/);
  assert.match(
    snapshotsKotlin(dir),
    /"en" to mapOf\("label" to "Pay \\\$5 \\"now\\" \\\\ later"\)/,
  );
});
