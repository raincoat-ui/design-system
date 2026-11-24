// The web components are adapted from shadcn/ui. shadcn.lock.json records where each one came
// from, and .shadcn-upstream/ keeps that source unmodified so upstream changes can be merged.
// A component that shadcn/ui has no source for is recorded too, with the reason.
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
/** The entries of components adapted from an upstream source. */
const adapted = Object.entries(lock.components).filter(([, entry]) => entry.upstream !== null);
const withoutUpstream = Object.entries(lock.components).filter(
  ([, entry]) => entry.upstream === null,
);

test("every component has an entry in shadcn.lock.json, and every entry a component", () => {
  assert.deepEqual(names("src/components/ui", ".tsx"), Object.keys(lock.components).sort());
});

test("every upstream copy has an entry, and the upstream license is kept with them", () => {
  assert.deepEqual(names(".shadcn-upstream", ".tsx"), adapted.map(([name]) => name).sort());
  assert.match(
    readFileSync(join(root, lock.license), "utf8"),
    /^MIT License\n\nCopyright \(c\) 2023 shadcn/,
  );
});

for (const [name, entry] of adapted) {
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

for (const [name, entry] of withoutUpstream) {
  test(`${name}: has no upstream source, says why, and says when that was checked`, () => {
    assert.deepEqual(Object.keys(entry).sort(), [
      "checked",
      "local",
      "none",
      "registry",
      "upstream",
    ]);
    assert.equal(entry.registry, null);
    assert.equal(typeof entry.none, "string");
    assert.ok(entry.none.length > 20, "say why there is no shadcn/ui source");
    assert.match(entry.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(entry.local, `src/components/ui/${name}.tsx`);
    assert.ok(existsSync(join(root, entry.local)));
    assert.ok(!existsSync(join(root, `.shadcn-upstream/${name}.tsx`)));
  });
}
