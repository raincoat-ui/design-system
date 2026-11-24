// Tests the spec linter against copies of the real specs, each broken in one specific way,
// and the types generated from the specs.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { specsKotlin, specsSwift, specsTypeScript } from "../src/emit/spec.js";
import { enumerations, lintSpecs, loadSpecs } from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const SPEC = "specs/components/button/spec.yaml";
const TYPOGRAPHY = "specs/components/typography/spec.yaml";
const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/**
 * Copies what the spec linter reads to a temp dir, then edits the Button spec, or the spec
 * `file` names. Of the platform packages, only the files the specs list as implementations are
 * copied.
 */
function withSpec(edit, extra = () => {}, file = SPEC) {
  const dir = mkdtempSync(join(tmpdir(), "raincoat-specs-"));
  scratch.push(dir);
  for (const part of ["specs", "schemas", "tokens", "rfcs"]) {
    cpSync(join(repoRoot, part), join(dir, part), { recursive: true });
  }
  for (const { spec } of loadSpecs(repoRoot)) {
    for (const { file } of Object.values(spec?.implementations ?? {})) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      cpSync(join(repoRoot, file), join(dir, file));
    }
  }
  const spec = parse(readFileSync(join(dir, file), "utf8"));
  edit(spec);
  writeFileSync(join(dir, file), stringify(spec));
  extra(dir);
  return dir;
}

const assertProblem = (edit, pattern, extra, file) => {
  const found = lintSpecs(withSpec(edit, extra, file)).map((problem) => problem.message);
  assert.ok(
    found.some((message) => pattern.test(message)),
    `expected a problem matching ${pattern}, got:\n${found.join("\n") || "(none)"}`,
  );
};

test("the committed specs are valid", () => {
  assert.deepEqual(lintSpecs(repoRoot), []);
  assert.ok(loadSpecs(repoRoot).some((entry) => entry.id === "button"));
});

test("a spec edited without a real change still passes, so the harness itself is sound", () => {
  assert.deepEqual(lintSpecs(withSpec(() => {})), []);
});

test("a default must be one of the property's values", () => {
  assertProblem((spec) => {
    spec.properties.variant.default = "tertiary";
  }, /properties\.variant: the default "tertiary" is not one of its values/);
});

test("the id must match the directory", () => {
  assertProblem((spec) => {
    spec.id = "action-button";
  }, /id is "action-button" but the directory is "button"/);
});

test("token references must point at real tokens", () => {
  assertProblem((spec) => {
    spec.anatomy.container.tokens.push("button.shadow");
  }, /anatomy\.container: no token matches "button\.shadow"/);
  assertProblem((spec) => {
    spec.anatomy.container.tokens.push("button.elevation.*");
  }, /anatomy\.container: no token matches "button\.elevation\.\*"/);
});

test("a new variant needs tokens of its own", () => {
  assertProblem((spec) => {
    spec.properties.variant.values.link = "Looks like a link but acts like a button.";
  }, /properties\.variant: no tokens under "button\.link\."/);
});

test("examples may only use real properties and values", () => {
  assertProblem((spec) => {
    spec.examples[0].matrix.variant.push("tertiary");
  }, /examples\.variants: "tertiary" is not a value of variant/);
  assertProblem((spec) => {
    spec.examples[2].properties.rounded = true;
  }, /examples\.disabled: "rounded" is not a property/);
  assertProblem((spec) => {
    spec.examples.push({ ...spec.examples[0] });
  }, /examples: "variants" is used twice/);
});

test("required sections and well-formed values are enforced by the schema", () => {
  assertProblem((spec) => {
    delete spec.accessibility;
  }, /must have required property 'accessibility'/);
  assertProblem((spec) => {
    spec.specVersion = "1.0";
  }, /specVersion: must match pattern/);
  assertProblem((spec) => {
    spec.properties.Variant = spec.properties.variant;
  }, /properties: property name must be valid/);
});

test("the guidelines and an accepted RFC must exist", () => {
  assertProblem(
    () => {},
    /guidelines\.md is missing/,
    (dir) => rmSync(join(dir, "specs/components/button/guidelines.md")),
  );
  assertProblem((spec) => {
    spec.rfc = 99;
  }, /rfc 99: no file rfcs\/0099-\*\.md/);
  assertProblem(
    () => {},
    /rfcs\/0001-.* is not accepted/,
    (dir) => {
      const file = join(dir, "rfcs/0001-foundation-tokens-and-button.md");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace("- Status: accepted", "- Status: proposed"),
      );
    },
  );
});

test("each implementation is an existing file, in its platform's language, naming the component", () => {
  assertProblem((spec) => {
    spec.implementations.web.file = "packages/web/src/components/ui/buton.tsx";
  }, /implementations\.web: packages\/web\/src\/components\/ui\/buton\.tsx does not exist/);
  assertProblem((spec) => {
    spec.implementations.ios.file = spec.implementations.android.file;
  }, /implementations\.ios: .*RaincoatButton\.kt is not a Swift file/);
  assertProblem((spec) => {
    spec.implementations.android.file = "../RaincoatButton.kt";
  }, /implementations\.android: \.\.\/RaincoatButton\.kt is not a path inside the repository/);
  assertProblem((spec) => {
    spec.implementations.android.name = ["RaincoatButton", "RaincoatIconButton"];
  }, /implementations\.android: .*RaincoatButton\.kt does not mention "RaincoatIconButton"/);
  assertProblem((spec) => {
    spec.implementations.windows = { ...spec.implementations.web };
  }, /implementations: must NOT have additional properties "windows"/);
});

test("a spec with no implementation on some platform, or on any, is valid", () => {
  assert.deepEqual(
    lintSpecs(
      withSpec((spec) => {
        delete spec.implementations.ios;
      }),
    ),
    [],
  );
  assert.deepEqual(
    lintSpecs(
      withSpec((spec) => {
        delete spec.implementations;
      }),
    ),
    [],
  );
});

test("enumerations lists the properties with a fixed set of values", () => {
  const { spec } = loadSpecs(repoRoot).find((entry) => entry.id === "button");
  assert.deepEqual(
    enumerations(spec).map(({ name, default: standard, values }) => [
      name,
      standard,
      values.map(({ value }) => value),
    ]),
    [
      ["variant", "secondary", ["primary", "secondary", "ghost", "danger"]],
      ["size", "md", ["sm", "md", "lg"]],
    ],
  );
});

test("TypeScript types are generated for each enumeration, with its values and default", () => {
  const typescript = specsTypeScript(repoRoot);
  assert.match(
    typescript,
    /export type ButtonVariant = "primary" \| "secondary" \| "ghost" \| "danger";/,
  );
  assert.match(
    typescript,
    /export const BUTTON_VARIANTS = \["primary", "secondary", "ghost", "danger"\] as const satisfies readonly ButtonVariant\[\];/,
  );
  assert.match(typescript, /export const BUTTON_VARIANT_DEFAULT: ButtonVariant = "secondary";/);
  assert.match(typescript, /export const BUTTON_SIZES = \["sm", "md", "lg"\] as const/);
  assert.match(typescript, /export const BUTTON_SIZE_DEFAULT: ButtonSize = "md";/);
  assert.match(typescript, / \* - `danger`: A destructive action, such as deleting\./);
});

test("Swift and Kotlin types are generated for each enumeration, with its default", () => {
  const swift = specsSwift(repoRoot);
  assert.match(swift, /public enum ButtonVariant: String, CaseIterable, Sendable \{/);
  assert.match(swift, /case primary\n/);
  assert.match(swift, /public static let standard: ButtonVariant = \.secondary/);
  assert.match(swift, /public static let standard: ButtonSize = \.md/);

  const kotlin = specsKotlin(repoRoot);
  assert.match(kotlin, /public enum class ButtonVariant\(public val id: String\) \{/);
  assert.match(kotlin, /Primary\("primary"\),/);
  assert.match(kotlin, /public val Standard: ButtonVariant = Secondary/);
  assert.match(kotlin, /public val Standard: ButtonSize = Md/);
});

/** Expects a problem in the Typography spec, the one spec with parts, after an edit. */
const assertTypographyProblem = (edit, pattern) =>
  assertProblem(edit, pattern, undefined, TYPOGRAPHY);

test("a spec has properties or parts, not both", () => {
  assertProblem((spec) => {
    spec.parts = { a: { name: "A", summary: "The first part.", properties: spec.properties } };
  }, /needs either "properties" or "parts", not both/);
});

test("a part's defaults are checked, and a default can follow another property", () => {
  assertTypographyProblem((spec) => {
    spec.parts.text.properties.variant.default = "heading-xl";
  }, /parts\.text\.properties\.variant: the default "heading-xl" is not one of its values/);
  assertTypographyProblem((spec) => {
    delete spec.parts.heading.properties.variant.default.level["6"];
  }, /parts\.heading\.properties\.variant: the default gives no value for level 6/);
  assertTypographyProblem((spec) => {
    spec.parts.heading.properties.variant.default.level["7"] = "heading-sm";
  }, /the default maps 7, which level cannot be/);
  assertTypographyProblem((spec) => {
    spec.parts.heading.properties.variant.default.level["1"] = "body-md";
  }, /parts\.heading\.properties\.variant: the default "body-md" is not one of its values/);
  assertTypographyProblem((spec) => {
    spec.parts.heading.properties.variant.default = { size: { 1: "heading-xl" } };
  }, /a default that depends on another property names one property of the same part/);
  assertTypographyProblem((spec) => {
    delete spec.parts.text.properties.color.default;
  }, /parts\.text\.properties\.color: needs a default/);
});

test("a whole number has a range, and a required one has no default", () => {
  assertTypographyProblem((spec) => {
    spec.parts.heading.properties.level.default = 2;
  }, /parts\.heading\.properties\.level: a required property has no default/);
  assertTypographyProblem((spec) => {
    spec.parts.text.properties["max-lines"].default = 0;
  }, /parts\.text\.properties\.max-lines: the default 0 is out of range/);
  assertTypographyProblem((spec) => {
    delete spec.parts.text.properties["max-lines"].minimum;
  }, /max-lines: a whole number needs a minimum/);
  assertTypographyProblem((spec) => {
    spec.parts.heading.properties.level.maximum = 0;
  }, /level: the maximum is less than the minimum/);
  assertTypographyProblem((spec) => {
    spec.parts.text.properties.variant.minimum = 1;
  }, /parts\.text\.properties\.variant: only a whole number has "minimum"/);
});

test("an example of a spec with parts names its part and gives what that part requires", () => {
  const levels = (spec) => spec.examples.find((example) => example.id === "heading-levels");
  assertTypographyProblem((spec) => {
    delete spec.examples[0].part;
  }, /examples\.text-variants: needs a part, one of text, heading/);
  assertTypographyProblem((spec) => {
    spec.examples[0].part = "caption";
  }, /examples\.text-variants: "caption" is not a part/);
  assertTypographyProblem((spec) => {
    spec.examples[0].properties = { level: 2 };
  }, /examples\.text-variants: "level" is not a property/);
  assertTypographyProblem((spec) => {
    delete levels(spec).matrix;
  }, /examples\.heading-levels: needs level, which is required/);
  assertTypographyProblem((spec) => {
    levels(spec).matrix.level.push(7);
  }, /examples\.heading-levels: level must be a whole number in its range, not 7/);
  assertProblem((spec) => {
    spec.examples[0].part = "label";
  }, /examples\.variants: the spec has no parts/);
});

test("the types of a part are named after the part", () => {
  const { spec } = loadSpecs(repoRoot).find((entry) => entry.id === "typography");
  assert.deepEqual(
    enumerations(spec).map(({ part, type, default: standard }) => [part, type, standard]),
    [
      ["text", "TextVariant", "body-md"],
      ["text", "TextColor", "default"],
      ["heading", "HeadingVariant", undefined],
      ["heading", "HeadingColor", "default"],
    ],
  );
  assert.deepEqual(enumerations(spec)[2].defaultBy, {
    property: "level",
    keyType: "integer",
    values: {
      1: "heading-xl",
      2: "heading-lg",
      3: "heading-md",
      4: "heading-sm",
      5: "heading-sm",
      6: "heading-sm",
    },
  });
});

test("a default that follows another property is generated as a table on every platform", () => {
  const typescript = specsTypeScript(repoRoot);
  assert.match(
    typescript,
    /export const HEADING_VARIANT_DEFAULT_BY_LEVEL = \{ 1: "heading-xl", 2: "heading-lg", 3: "heading-md", 4: "heading-sm", 5: "heading-sm", 6: "heading-sm" \} as const satisfies Readonly<Record<1 \| 2 \| 3 \| 4 \| 5 \| 6, HeadingVariant>>;/,
  );
  assert.doesNotMatch(typescript, /HEADING_VARIANT_DEFAULT:/);
  // A whole number with a range is a type in TypeScript.
  assert.match(typescript, /export type HeadingLevel = 1 \| 2 \| 3 \| 4 \| 5 \| 6;/);
  assert.match(typescript, /export const TEXT_COLOR_DEFAULT: TextColor = "default";/);

  const swift = specsSwift(repoRoot);
  assert.match(
    swift,
    /public static let standardByLevel: \[Int: HeadingVariant\] = \[1: \.headingXl, 2: \.headingLg, 3: \.headingMd, 4: \.headingSm, 5: \.headingSm, 6: \.headingSm\]/,
  );
  assert.match(swift, /case `default`\n/);
  assert.match(swift, /public static let standard: TextColor = \.default/);

  const kotlin = specsKotlin(repoRoot);
  assert.match(
    kotlin,
    /public val StandardByLevel: Map<Int, HeadingVariant> = mapOf\(1 to HeadingXl, 2 to HeadingLg, 3 to HeadingMd, 4 to HeadingSm, 5 to HeadingSm, 6 to HeadingSm\)/,
  );
  assert.match(kotlin, /public val Standard: TextColor = Default/);
});
