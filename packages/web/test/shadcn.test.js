// The web components are adapted from shadcn/ui. shadcn.lock.json records where each one came
// from, and .shadcn-upstream/ keeps that source unmodified so upstream changes can be merged.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const lock = JSON.parse(readFileSync(join(root, "shadcn.lock.json"), "utf8"));
const names = (dir, extension) =>
  readdirSync(join(root, dir))
    .filter((name) => name.endsWith(extension) && !name.includes(".test."))
    .map((name) => name.slice(0, -extension.length))
    .sort();

test("every component has an entry in shadcn.lock.json, and every entry a component", () => {
  assert.deepEqual(names("src/components/ui", ".tsx"), Object.keys(lock.components).sort());
});

test("every upstream copy has an entry, and the upstream license is kept with them", () => {
  assert.deepEqual(
    names(".shadcn-upstream", ".tsx"),
    Object.keys(lock.components)
      .filter((name) => lock.components[name].upstream !== null)
      .sort(),
  );
  assert.match(
    readFileSync(join(root, lock.license), "utf8"),
    /^MIT License\n\nCopyright \(c\) 2023 shadcn/,
  );
});

for (const [name, entry] of Object.entries(lock.components)) {
  // A component the registry does not have says so, when that was checked, and why.
  if (entry.upstream === null) {
    test(`${name}: the entry says the registry has no source for it, and why`, () => {
      assert.deepEqual(Object.keys(entry).sort(), [
        "checked",
        "local",
        "reason",
        "registry",
        "upstream",
      ]);
      assert.equal(entry.registry, `https://ui.shadcn.com/r/styles/${lock.style}/${name}.json`);
      assert.match(entry.checked, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(entry.reason.length > 20, "the reason is written out");
      assert.equal(entry.local, `src/components/ui/${name}.tsx`);
      assert.ok(existsSync(join(root, entry.local)));
    });
    continue;
  }
  test(`${name}: the upstream copy is unmodified and the entry is complete`, () => {
    const hash = createHash("sha256")
      .update(readFileSync(join(root, entry.upstream)))
      .digest("hex");
    assert.equal(hash, entry.sha256, `${entry.upstream} has changed since it was fetched`);
    assert.equal(entry.upstream, `.shadcn-upstream/${name}.tsx`);
    assert.equal(entry.local, `src/components/ui/${name}.tsx`);
    assert.ok(existsSync(join(root, entry.local)));
    assert.equal(entry.registry, `https://ui.shadcn.com/r/styles/${lock.style}/${name}.json`);
    assert.match(entry.fetched, /^\d{4}-\d{2}-\d{2}$/);
  });
}
