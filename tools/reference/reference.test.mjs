// Tests for the scripts that run the reference apps in each theme.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { IOS_FILES, switchTheme } from "./ios-theme.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const files = Object.fromEntries(
  Object.entries(IOS_FILES).map(([key, file]) => [key, readFileSync(join(repoRoot, file), "utf8")]),
);

test("the iOS app switches to another theme's product, and nothing else changes", () => {
  const switched = switchTheme(files, "ink");
  for (const key of Object.keys(IOS_FILES)) {
    assert.ok(!switched[key].includes("RaincoatThemeBase"), `${key} still names the base theme`);
    // Only the lines that name the theme differ.
    const before = files[key].split("\n");
    const after = switched[key].split("\n");
    assert.equal(after.length, before.length);
    const changed = after.filter((line, index) => line !== before[index]);
    assert.ok(changed.length > 0, key);
    assert.ok(
      changed.every((line) => /RaincoatThemeInk|\.ink\b/.test(line)),
      key,
    );
  }
  assert.match(switched.project, /productName = RaincoatThemeInk;/);
  assert.match(switched.app, /\.raincoatTheme\(\.ink\)/);
  assert.match(switched.tests, /RaincoatTheme\.ink\.tokens/);
  assert.match(
    switchTheme(files, "my-brand").app,
    /import RaincoatThemeMyBrand\n[\s\S]*\(\.myBrand\)/,
  );
});

test("the base theme changes nothing, and a bad id is refused", () => {
  assert.deepEqual(switchTheme(files, "base"), files);
  assert.throws(() => switchTheme(files, "Ink; rm"), /not a theme id/);
});
