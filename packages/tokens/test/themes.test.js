// Tests for themes: each rule a theme is held to, against a copy of the repository's token
// source with a small theme added, broken in one specific way. If a rule stops firing, the
// matching test fails.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build, orphans } from "../src/emit/index.js";
import {
  checkContrast,
  compose,
  hexOf,
  lintTheme,
  openProject,
  resolveToken,
} from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const oklch = (l, c, h, hex) => ({ colorSpace: "oklch", components: [l, c, h], hex });
const MODES = ["light", "dark", "light-hc", "dark-hc"];

/** A small valid theme: a green brand ramp step, square corners, and a deeper accent. */
function validTheme() {
  const files = {
    "theme.json": { name: "Fern", description: "A test theme with a green accent." },
    "brand.md": "# Fern\n\nA fictional brand for the tests.\n",
    "tokens/primitive/color.tokens.json": {
      color: { brand: { 800: { $value: oklch(0.45, 0.1, 150, "#236436") } } },
    },
    "tokens/semantic/shape.tokens.json": {
      radius: { md: { $value: "{dimension.0}" } },
    },
  };
  for (const mode of MODES) {
    files[`tokens/semantic/color.${mode}.tokens.json`] = {
      color: { border: { focus: { $value: "{color.neutral.900}" } } },
    };
  }
  files["tokens/semantic/color.dark.tokens.json"].color.border.focus.$value = "{color.neutral.100}";
  files["tokens/semantic/color.dark-hc.tokens.json"].color.border.focus.$value =
    "{color.neutral.0}";
  return files;
}

/** A copy of the repository's token source with one theme, `edit` applied to its files. */
function repoWith(edit = () => {}, id = "fern") {
  const dir = mkdtempSync(join(tmpdir(), "raincoat-themes-"));
  scratch.push(dir);
  for (const name of ["tokens", "schemas", "specs", "LICENSE"]) {
    cpSync(join(repoRoot, name), join(dir, name), { recursive: true });
  }
  const files = validTheme();
  edit(files);
  for (const [file, content] of Object.entries(files)) {
    if (content === undefined) continue;
    const path = join(dir, "themes", id, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

function themeOf(dir, id = "fern") {
  const project = openProject(dir);
  return { project, theme: project.themes.find((theme) => theme.id === id) };
}

function messages(edit, id) {
  const { project, theme } = themeOf(repoWith(edit, id), id);
  return lintTheme(theme, { schemaDir: project.schemaDir, inRepo: true }).map(
    (problem) => `${problem.file}: ${problem.message}`,
  );
}

function assertProblem(edit, pattern, id) {
  const found = messages(edit, id);
  assert.ok(
    found.some((message) => pattern.test(message)),
    `expected a problem matching ${pattern}, got:\n${found.join("\n") || "(none)"}`,
  );
}

test("a valid theme lints clean, and its values replace the base's", () => {
  const dir = repoWith();
  const { project, theme } = themeOf(dir);
  assert.deepEqual(
    project.themes.map((t) => t.id),
    ["base", "fern"],
  );
  assert.deepEqual(lintTheme(theme, { schemaDir: project.schemaDir }), []);

  const light = compose(theme.files, { mode: "light", density: "comfortable" }).tokens;
  const dark = compose(theme.files, { mode: "dark", density: "comfortable" }).tokens;
  assert.equal(hexOf(resolveToken("color.brand.800", light)), "#236436");
  assert.equal(resolveToken("radius.md", light).value, 0);
  // A semantic token keeps its references, so it follows a primitive the theme changed.
  assert.equal(hexOf(resolveToken("color.fg.accent", light)), "#236436");
  assert.equal(hexOf(resolveToken("button.focus-ring.color", dark)), "#f3f3f4");
  // What the theme does not override stays the base's.
  const base = compose(project.themes[0].files, { mode: "light", density: "comfortable" }).tokens;
  assert.deepEqual(resolveToken("space.4", light), resolveToken("space.4", base));
  assert.ok(light.get("radius.md").overridden);
  assert.equal(light.get("radius.md").file, "themes/fern/tokens/semantic/shape.tokens.json");
  assert.ok(!light.get("radius.sm").overridden);
});

test("a theme cannot change a locked token", () => {
  assertProblem((files) => {
    files["tokens/semantic/space.tokens.json"] = { space: { 4: { $value: "{dimension.20}" } } };
  }, /space\.tokens\.json: space\.4: is locked; a theme may only override tokens the base marks overridable/);
  // The locked value does not reach the token set.
  const { theme } = themeOf(
    repoWith((files) => {
      files["tokens/semantic/space.tokens.json"] = { space: { 4: { $value: "{dimension.20}" } } };
    }),
  );
  const tokens = compose(theme.files, { mode: "light", density: "comfortable" }).tokens;
  assert.equal(resolveToken("space.4", tokens).value, 16);
});

test("a theme cannot add a token", () => {
  assertProblem((files) => {
    files["tokens/semantic/shape.tokens.json"].radius.xl = { $value: "{dimension.4}" };
  }, /radius\.xl: the base has no such token, and a theme cannot add one/);
});

test("an override sits in the file that holds the token in the base", () => {
  assertProblem((files) => {
    files["tokens/semantic/shape.tokens.json"].color = {
      bg: { canvas: { $value: "{color.neutral.50}" } },
    };
  }, /color\.bg\.canvas: belongs in tokens\/semantic\/color\.\w+\.tokens\.json, as in the base/);
});

test("a file the base does not have is rejected", () => {
  assertProblem((files) => {
    files["tokens/semantic/elevation.tokens.json"] = {};
  }, /elevation\.tokens\.json: the base has no tokens\/semantic\/elevation\.tokens\.json/);
  assertProblem((files) => {
    files["tokens/brand/color.tokens.json"] = {};
  }, /tokens\/brand\/color\.tokens\.json: not a tier/);
});

test("a color changed in one mode is changed in all four", () => {
  assertProblem((files) => {
    files["tokens/semantic/color.dark-hc.tokens.json"] = undefined;
  }, /color modes: no file for "dark-hc"/);
  assertProblem((files) => {
    files["tokens/semantic/color.dark.tokens.json"].color.bg = {
      canvas: { $value: "{color.neutral.900}" },
    };
  }, /color\.bg\.canvas is defined here but missing in/);
});

test("an override holds a value only: no type, extension, or new contrast declaration", () => {
  assertProblem((files) => {
    files["tokens/semantic/shape.tokens.json"].radius.md.$type = "dimension";
  }, /radius\.md: unexpected property "\$type"/);
  assertProblem((files) => {
    files["tokens/semantic/shape.tokens.json"].radius.md.$extensions = {};
  }, /radius\.md: unexpected property "\$extensions"/);
});

test("overrides follow the base's rules: tiers, types, and values", () => {
  assertProblem((files) => {
    files["tokens/semantic/shape.tokens.json"].radius.md.$value = { value: 4, unit: "px" };
  }, /radius\.md: a semantic token must reference primitive tokens, not hold literal values/);
  assertProblem((files) => {
    files["tokens/semantic/shape.tokens.json"].radius.md.$value = "{color.neutral.0}";
  }, /radius\.md: is a dimension but references \{color\.neutral\.0\}, a color/);
  assertProblem((files) => {
    files["tokens/primitive/color.tokens.json"].color.brand[800].$value = oklch(
      0.45,
      0.1,
      150,
      "#000000",
    );
  }, /color\.brand\.800: .*hex/);
});

test("theme.json, brand.md, and the id are required and checked", () => {
  assertProblem((files) => {
    files["theme.json"] = undefined;
  }, /theme\.json: missing/);
  assertProblem((files) => {
    files["theme.json"] = { name: "Fern" };
  }, /theme\.json: \(file root\): must have required property 'description'/);
  assertProblem((files) => {
    files["theme.json"].packages = { npm: "@acme/theme-fern" };
  }, /"packages" is for themes outside this repository/);
  assertProblem((files) => {
    files["brand.md"] = undefined;
  }, /brand\.md: missing/);
  assertProblem(() => {}, /"Fern_2" is not a theme id/, "Fern_2");
  assertProblem(() => {}, /"base" is the token source itself/, "base");
});

test("contrast is checked on the theme's own colors", () => {
  const { theme } = themeOf(
    repoWith((files) => {
      // Pale grey text on the light canvas.
      files["tokens/semantic/color.light.tokens.json"].color.fg = {
        muted: { $value: "{color.neutral.300}" },
      };
      for (const mode of ["dark", "light-hc", "dark-hc"]) {
        files[`tokens/semantic/color.${mode}.tokens.json`].color.fg = {
          muted: {
            $value: mode.startsWith("dark") ? "{color.neutral.200}" : "{color.neutral.700}",
          },
        };
      }
    }),
  );
  const failures = checkContrast(theme.files).filter((row) => !row.pass);
  assert.ok(failures.length > 0);
  assert.ok(failures.every((row) => row.token === "color.fg.muted" && row.mode === "light"));
});

test("the build generates every platform's files for a new theme, with no other edit", async () => {
  const dir = repoWith();
  for (const name of ["packages", "settings.gradle.kts", "themes"]) {
    if (!existsSync(join(repoRoot, name))) continue;
    cpSync(join(repoRoot, name), join(dir, name), {
      recursive: true,
      filter: (source) => !/node_modules|\/build\/|\/dist\/|\.gradle/.test(source),
    });
  }
  const results = await build(dir);
  const written = results.filter((r) => r.status === "written").map((r) => r.file);
  for (const file of [
    "packages/web-themes/fern/theme.css",
    "packages/web-themes/fern/package.json",
    "packages/web-themes/fern/README.md",
    "packages/ios/Sources/RaincoatThemeFern/Generated/FernTheme.swift",
    "packages/ios/Tests/RaincoatThemeFernTests/Generated/FernThemeTests.swift",
    "packages/android/theme-fern/build.gradle.kts",
    "packages/android/theme-fern/src/main/kotlin/io/github/raincoatui/theme/fern/generated/FernTheme.kt",
    "packages/ios/Package.swift",
    "packages/ios/Tests/RaincoatTests/Generated/Themes.swift",
    "packages/android/ui/src/test/kotlin/io/github/raincoatui/ui/generated/Themes.kt",
  ]) {
    assert.ok(written.includes(file), `${file} was not written`);
  }
  const { readFileSync } = await import("node:fs");
  const read = (file) => readFileSync(join(dir, file), "utf8");
  assert.match(read("packages/ios/Package.swift"), /\.library\(name: "RaincoatThemeFern"/);
  assert.match(
    read("packages/ios/Tests/RaincoatTests/Generated/Themes.swift"),
    /\.base,\n\s+\.fern,/,
  );
  assert.match(
    read("packages/web-themes/fern/theme.css"),
    /--rc-radius-md: var\(--rc-dimension-0\);/,
  );
  assert.equal(
    JSON.parse(read("packages/web-themes/fern/package.json")).name,
    "@raincoat-ui/theme-fern",
  );

  // Removing the theme leaves its generated directories behind, and the build says so.
  rmSync(join(dir, "themes/fern"), { recursive: true });
  const remaining = openProject(dir).themes.map((theme) => theme.id);
  assert.ok(!remaining.includes("fern"));
  assert.deepEqual(orphans(dir, remaining), [
    "packages/web-themes/fern",
    "packages/android/theme-fern",
    "packages/ios/Sources/RaincoatThemeFern",
  ]);
});
