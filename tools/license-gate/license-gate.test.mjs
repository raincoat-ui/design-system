import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRAND_LICENSE,
  checkAssets,
  globToRegExp,
  mergeManifests,
  needsEntry,
} from "./assets-lib.mjs";
import { evaluate, flattenReport, resolveAllowlist } from "./lib.mjs";
import { isAllowed, parse } from "./spdx.mjs";

const allowlist = resolveAllowlist({
  scopes: {
    ship: { licenses: ["MIT", "Apache-2.0", "ISC"] },
    dev: { extends: "ship", licenses: ["MPL-2.0"] },
    fonts: { licenses: ["OFL-1.1"] },
  },
});
const noCurations = { corrections: [], exceptions: [] };
const today = "2026-11-14";

test("SPDX: single identifiers", () => {
  assert.equal(isAllowed("MIT", allowlist.ship), true);
  assert.equal(isAllowed("GPL-3.0-only", allowlist.ship), false);
});

test("SPDX: OR needs one side, AND needs both", () => {
  assert.equal(isAllowed("MIT OR GPL-3.0-only", allowlist.ship), true);
  assert.equal(isAllowed("(GPL-2.0-only OR MIT)", allowlist.ship), true);
  assert.equal(isAllowed("MIT AND GPL-3.0-only", allowlist.ship), false);
  assert.equal(isAllowed("MIT AND (Apache-2.0 OR GPL-3.0-only)", allowlist.ship), true);
  assert.equal(isAllowed("MIT AND ISC OR GPL-3.0-only", allowlist.ship), true);
});

test("SPDX: WITH is its own identity and is not implied by the base license", () => {
  assert.equal(isAllowed("Apache-2.0 WITH LLVM-exception", allowlist.ship), false);
  const withException = new Set(["Apache-2.0 WITH LLVM-exception"]);
  assert.equal(isAllowed("Apache-2.0 WITH LLVM-exception", withException), true);
});

test("SPDX: anything unparseable is rejected", () => {
  for (const bad of [
    "",
    "SEE LICENSE IN LICENSE.md",
    "MIT OR",
    "(MIT",
    "MIT ISC",
    undefined,
    null,
  ]) {
    assert.equal(parse(bad), null, String(bad));
    assert.equal(isAllowed(bad, allowlist.ship), false, String(bad));
  }
});

test("allowlist: extends is resolved and cycles are refused", () => {
  assert.deepEqual([...allowlist.dev].sort(), ["Apache-2.0", "ISC", "MIT", "MPL-2.0"]);
  assert.throws(
    () => resolveAllowlist({ scopes: { a: { extends: "b" }, b: { extends: "a" } } }),
    /cycle/,
  );
});

test("flattenReport yields one row per package version", () => {
  const rows = flattenReport({
    MIT: [{ name: "b", versions: ["1.0.0", "2.0.0"], license: "MIT" }],
  });
  assert.deepEqual(rows, [
    { name: "b", version: "1.0.0", license: "MIT" },
    { name: "b", version: "2.0.0", license: "MIT" },
  ]);
  assert.deepEqual(flattenReport({}), []);
});

test("gate: a GPL dependency fails and is named", () => {
  const rows = [
    { name: "ok", version: "1.0.0", license: "MIT" },
    { name: "copyleft", version: "2.0.0", license: "GPL-3.0-only" },
  ];
  const result = evaluate({ rows, scope: "ship", allowlist, curations: noCurations, today });
  assert.deepEqual(
    result.violations.map((v) => `${v.name}@${v.version} ${v.license}`),
    ["copyleft@2.0.0 GPL-3.0-only"],
  );
});

test("gate: dev-only licenses pass in dev and fail in ship", () => {
  const rows = [{ name: "axe-core", version: "4.14.0", license: "MPL-2.0" }];
  const args = { rows, allowlist, curations: noCurations, today };
  assert.equal(evaluate({ ...args, scope: "dev" }).violations.length, 0);
  assert.equal(evaluate({ ...args, scope: "ship" }).violations.length, 1);
});

test("gate: a missing license fails until a correction with evidence is recorded", () => {
  const rows = [{ name: "nolicense", version: "1.0.0", license: undefined }];
  const args = { rows, scope: "ship", allowlist, today };
  assert.equal(evaluate({ ...args, curations: noCurations }).violations.length, 1);
  const corrected = {
    corrections: [
      { package: "nolicense", license: "MIT", evidence: "https://example.org/LICENSE" },
    ],
    exceptions: [],
  };
  assert.deepEqual(evaluate({ ...args, curations: corrected }), { violations: [], problems: [] });
});

test("gate: an exception is exact-version, scoped, and expires", () => {
  const rows = [{ name: "odd", version: "1.2.3", license: "WTFPL" }];
  const exception = {
    package: "odd@1.2.3",
    scope: "dev",
    reason: "test fixture",
    approved: "2026-11-01",
    "review-by": "2027-05-01",
  };
  const args = { rows, allowlist, curations: { corrections: [], exceptions: [exception] } };
  assert.equal(evaluate({ ...args, scope: "dev", today }).violations.length, 0);
  assert.equal(evaluate({ ...args, scope: "ship", today }).violations.length, 1);
  const expired = evaluate({ ...args, scope: "dev", today: "2027-05-02" });
  assert.match(expired.violations[0].why, /expired/);
  const upgraded = [{ name: "odd", version: "1.2.4", license: "WTFPL" }];
  assert.equal(evaluate({ ...args, rows: upgraded, scope: "dev", today }).violations.length, 1);
});

test("gate: incomplete curations are reported", () => {
  const curations = {
    corrections: [{ package: "x", license: "MIT" }],
    exceptions: [{ package: "y", scope: "dev", reason: "r", approved: "2026-11-01" }],
  };
  const { problems } = evaluate({ rows: [], scope: "dev", allowlist, curations, today });
  assert.equal(problems.length, 3);
});

test("assets: which files need an entry", () => {
  assert.equal(needsEntry("themes/alpha/fonts/Brand-Regular.woff2"), true);
  assert.equal(needsEntry("packages/web/fonts/x.ttf"), true);
  assert.equal(needsEntry("themes/alpha/assets/logo.svg"), true);
  assert.equal(needsEntry("themes/alpha/assets/LICENSES.md"), false);
  assert.equal(needsEntry("themes/alpha/brand.md"), false);
  assert.equal(needsEntry("docs/logo.svg"), false);
});

test("assets: globs", () => {
  assert.equal(
    globToRegExp("themes/alpha/fonts/*.woff2").test("themes/alpha/fonts/A-B.woff2"),
    true,
  );
  assert.equal(
    globToRegExp("themes/alpha/fonts/*.woff2").test("themes/alpha/fonts/x/A.woff2"),
    false,
  );
  assert.equal(globToRegExp("themes/*/assets/**").test("themes/alpha/assets/a/b/logo.svg"), true);
  assert.equal(globToRegExp("a.b").test("aXb"), false);
});

test("assets: uncovered files, wrong licenses, and stale entries are reported", () => {
  const sets = { shipLicenses: allowlist.ship, fontLicenses: allowlist.fonts };
  const font = "themes/alpha/fonts/Brand.woff2";
  const logo = "themes/alpha/assets/logo.svg";
  const good = {
    assets: [
      { path: "themes/alpha/fonts/*.woff2", kind: "font", license: "OFL-1.1", source: "https://x" },
      { path: "themes/alpha/assets/**", kind: "brand", license: BRAND_LICENSE, source: "client" },
    ],
  };
  assert.deepEqual(checkAssets({ files: [font, logo, "README.md"], manifest: good, ...sets }), []);
  assert.match(checkAssets({ files: [font], manifest: { assets: [] }, ...sets })[0], /no entry/);

  const proprietaryFont = {
    assets: [{ path: font, kind: "font", license: "LicenseRef-Commercial", source: "https://x" }],
  };
  assert.match(
    checkAssets({ files: [font], manifest: proprietaryFont, ...sets })[0],
    /fonts must be/,
  );

  const stale = checkAssets({ files: [font], manifest: good, ...sets });
  assert.match(stale[0], /matches no committed file/);
});

test("assets: a theme lists its own files, relative to its directory, and only its own", () => {
  const sets = { shipLicenses: allowlist.ship, fontLicenses: allowlist.fonts };
  const font = "themes/ink/fonts/archivo-latin-500-normal.woff2";
  const own = {
    assets: [{ path: "fonts/*.woff2", kind: "font", license: "OFL-1.1", source: "https://x" }],
  };
  const merged = mergeManifests({ assets: [] }, [{ id: "ink", manifest: own }]);
  assert.deepEqual(merged.problems, []);
  assert.equal(merged.manifest.assets[0].path, "themes/ink/fonts/*.woff2");
  assert.deepEqual(checkAssets({ files: [font], manifest: merged.manifest, ...sets }), []);

  // Another theme's file is not covered by this theme's entry.
  const other = "themes/fern/fonts/archivo-latin-500-normal.woff2";
  assert.match(
    checkAssets({ files: [font, other], manifest: merged.manifest, ...sets })[0],
    /themes\/fern\/fonts\/.+ has no entry in themes\/fern\/assets\.yml or licenses\/assets\.yml/,
  );
  // An entry cannot reach outside the theme's directory.
  const escaping = mergeManifests({ assets: [] }, [
    { id: "ink", manifest: { assets: [{ ...own.assets[0], path: "../fern/fonts/*.woff2" }] } },
  ]);
  assert.match(escaping.problems[0], /relative to the theme's directory/);
});
