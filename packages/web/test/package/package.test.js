// Checks on the built package in dist/, which is what gets published. Run them after a build:
// `pnpm test` does both.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { leadingClass, rules } from "./css.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const repoRoot = join(root, "../..");
const read = (file) => readFileSync(join(root, file), "utf8");
const filesUnder = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

const manifest = JSON.parse(read("package.json"));
const stylesheet = read("dist/ui.css");

/** Every custom property a Raincoat theme defines. */
const themeProperties = new Set(
  readFileSync(join(repoRoot, "packages/web-themes/base/theme.css"), "utf8").match(
    /--rc-[a-z0-9-]+(?=:)/g,
  ),
);

test("every file named in the package's exports exists", () => {
  const targets = Object.values(manifest.exports).flatMap((target) =>
    typeof target === "string" ? [target] : Object.values(target),
  );
  assert.ok(targets.length >= 4);
  for (const target of targets) assert.ok(existsSync(join(root, target)), `${target} is missing`);
});

test("where React has no client hooks, as in a Server Component, the hydration check still answers", () => {
  // Every Button asks whether it has been hydrated, so an idle one would stop rendering in a
  // Server Component if asking needed a client hook.
  const script = `
    const React = await import("react");
    const { useHydrated } = await import("./dist/lib/hydration.js");
    console.log(JSON.stringify([typeof React.useSyncExternalStore, useHydrated(true), useHydrated(false)]));
  `;
  const output = execFileSync(
    process.execPath,
    ["--conditions=react-server", "--input-type=module", "--eval", script],
    { cwd: root, encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), ["undefined", false, true]);
});

test("Text and Heading render where React has no client hooks, as in a Server Component", () => {
  // They hold no state and use no hook, and give their elements no function.
  const script = `
    const React = await import("react");
    const { Heading, Text } = await import("./dist/components/ui/typography.js");
    const elements = [
      Text({ children: "Synced 2 minutes ago", variant: "caption", color: "muted" }),
      Text({ as: "label", htmlFor: "name", maxLines: 2, children: "Name" }),
      Heading({ level: 2, children: "Notifications" }),
    ];
    console.log(JSON.stringify([
      typeof React.useState,
      elements.map(({ type, props }) => ({
        type,
        variant: props["data-variant"],
        functions: Object.keys(props).filter((name) => typeof props[name] === "function"),
      })),
    ]));
  `;
  const output = execFileSync(
    process.execPath,
    ["--conditions=react-server", "--input-type=module", "--eval", script],
    { cwd: root, encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), [
    "undefined",
    [
      { type: "p", variant: "caption", functions: [] },
      { type: "label", variant: "body-md", functions: [] },
      { type: "h2", variant: "heading-lg", functions: [] },
    ],
  ]);
});

test("a static card and a link card render where React has no client hooks, as in a Server Component", () => {
  // Their parts hold no state and use no hook, and give their elements no function.
  const script = `
    const React = await import("react");
    const card = await import("./dist/components/ui/card.js");
    const elements = [
      card.Card({ children: "Order 1042" }),
      card.CardMedia({ children: "picture" }),
      card.CardTitle({ level: 3, children: "Order 1042" }),
      card.CardLink({ href: "/orders/1042", children: "Order 1042" }),
      card.CardBody({ children: "Delivered on Monday" }),
      card.CardFooter({ children: "Track" }),
    ];
    console.log(JSON.stringify([
      typeof React.useState,
      elements.map(({ type, props }) => ({
        type: typeof type === "string" ? type : type.name,
        slot: props["data-slot"],
        functions: Object.keys(props).filter((name) => typeof props[name] === "function"),
      })),
    ]));
  `;
  const output = execFileSync(
    process.execPath,
    ["--conditions=react-server", "--input-type=module", "--eval", script],
    { cwd: root, encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), [
    "undefined",
    [
      { type: "div", slot: "card", functions: [] },
      { type: "div", slot: "card-media", functions: [] },
      { type: "Heading", slot: "card-title", functions: [] },
      { type: "a", slot: "card-target", functions: [] },
      { type: "div", slot: "card-body", functions: [] },
      { type: "div", slot: "card-footer", functions: [] },
    ],
  ]);
});

test("until hydrated, a busy or disabled Button gives its element no function", () => {
  // A Server Component may not pass a function to an element: React refuses to render it. Such
  // a Button is never hydrated, and until a Button is, the browser refuses activation for it,
  // so it needs no handler. Rendering on a server, as here, is the same unhydrated state.
  const script = `
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { Button } = await import("./dist/index.js");
    const link = () => React.createElement("a", { href: "/next" }, "Next");
    const rendered = [];
    const Capture = (props) => {
      const element = Button(props);
      rendered.push(element);
      return element;
    };
    renderToString(React.createElement(React.Fragment, null,
      React.createElement(Capture, { loading: true, type: "submit", children: "Send invitation" }),
      React.createElement(Capture, { asChild: true, disabled: true, children: link() }),
      React.createElement(Capture, { asChild: true, loading: true, children: link() }),
    ));
    console.log(JSON.stringify(rendered.map(({ props }) => ({
      functions: Object.keys(props).filter((name) => typeof props[name] === "function"),
      unhydrated: "data-unhydrated" in props,
    }))));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.deepEqual(JSON.parse(output), [
    { functions: [], unhydrated: true },
    { functions: [], unhydrated: true },
    { functions: [], unhydrated: true },
  ]);
});

test("the built files use only custom properties that a theme defines", () => {
  const used = new Set();
  for (const file of filesUnder("dist").filter((name) => /\.(js|css)$/.test(name))) {
    for (const name of readFileSync(file, "utf8").match(/--rc-[a-z0-9-]+/g) ?? []) used.add(name);
  }
  assert.ok(used.size > 40, "expected the components to use many tokens");
  assert.deepEqual(
    [...used].filter((name) => !themeProperties.has(name)),
    [],
  );
});

test("the stylesheet reader finds rules inside at-rules", () => {
  const found = rules(
    "/*! banner */@layer properties;.a{color:var(--x);margin:0}@media (hover:hover){.b\\:c:hover{top:1px}}@keyframes k{to{opacity:1}}",
  );
  assert.deepEqual(found, [
    {
      context: [],
      selector: ".a",
      declarations: [
        ["color", "var(--x)"],
        ["margin", "0"],
      ],
    },
    { context: ["@media (hover:hover)"], selector: ".b\\:c:hover", declarations: [["top", "1px"]] },
    { context: ["@keyframes k"], selector: "to", declarations: [["opacity", "1"]] },
  ]);
  assert.equal(leadingClass(".b\\:c:hover"), "b:c");
  assert.equal(leadingClass(":root"), null);
});

// What a component rule may contain besides Raincoat tokens. Nothing here is a design
// decision: keywords, zero, a full percentage, one line of text, and halving.
const NEUTRAL = new Set([
  ...["0", "0px", "100%", "1lh", "2", "calc(", "min(", '""', "''"],
  ...["absolute", "relative", "border-box", "flex", "inline-flex", "center", "none", "solid"],
  ...["normal", "break-word", "pointer", "default", "not-allowed"],
  // Text: alignment, wrapping, line breaking by language, and the ellipsis after max-lines.
  ...["start", "balance", "strict", "keep-all", "hidden", "webkit-box", "vertical"],
  // "transparent", as the minifier writes it.
  "#0000",
  // The properties that transition.
  ...["background-color", "border-color", "color"],
  // A card's parts in a column; its media first in the flex order, as a block, with corners no
  // less than square; actions that wrap at the end edge, below the rest; and a link or button that
  // takes its title's look.
  ...["column", "9999", "block", "max(", "wrap", "flex-end", "auto", "inherit"],
]);
// The spinner turns once a second. That speed is not a token yet.
const EXEMPT = new Set([".animate-rc-spin"]);

/** The parts of a declaration's value that are neither a Raincoat token nor neutral. */
function literals(value) {
  const rest = value
    .replaceAll(/var\(--tw-[a-z-]+(?:, ?var\(--default-[a-z-]+\))?\)/g, " ")
    .replaceAll(/var\(--rc-[a-z0-9-]+\)/g, " ");
  const words = rest.match(
    /var\(--[\w-]+|#[0-9a-f]+|[a-z][a-z-]*\(?|\d*\.?\d+[a-z%]*|"[^"]*"|'[^']*'/gi,
  );
  return (words ?? []).filter((word) => !NEUTRAL.has(word.toLowerCase()));
}

test("a literal color, a literal size, and a custom property that is not a token are all noticed", () => {
  assert.deepEqual(literals("var(--rc-button-gap)"), []);
  assert.deepEqual(
    literals("calc((var(--rc-button-height-md) - 1lh)/2 - var(--rc-button-border-width))"),
    [],
  );
  assert.deepEqual(literals("var(--tw-ease,var(--default-transition-timing-function))"), []);
  assert.deepEqual(literals("#f7d22a"), ["#f7d22a"]);
  assert.deepEqual(literals("red"), ["red"]);
  assert.deepEqual(literals("calc(var(--spacing)*4)"), ["var(--spacing", "4"]);
  assert.deepEqual(literals(".875rem"), [".875rem"]);
  assert.deepEqual(literals("var(--radius-md)"), ["var(--radius-md"]);
});

test("the precompiled stylesheet takes every color and size from a token", () => {
  const componentRules = rules(stylesheet).filter(({ selector }) => leadingClass(selector));
  assert.ok(componentRules.length > 50, "expected to find the component rules");
  const problems = componentRules
    .filter(({ selector }) => !EXEMPT.has(selector))
    .flatMap(({ selector, declarations }) =>
      declarations
        .filter(([, value]) => literals(value).length > 0)
        .map(([property, value]) => `${selector} { ${property}: ${value} }`),
    );
  assert.deepEqual(problems, []);
});

test("the precompiled stylesheet changes nothing but Raincoat components", () => {
  // Apart from component rules, Tailwind emits its composition variables (registered with
  // @property, with a fallback in a layer named "properties") and two unused defaults.
  const others = rules(stylesheet).filter(({ selector }) => !leadingClass(selector));
  const unexpected = others.filter(({ context, selector, declarations }) => {
    const only = (pattern) => declarations.every(([property]) => pattern.test(property));
    if (context.length === 0 && selector === ":root,:host") return !only(/^--default-transition-/);
    if (context.length === 0 && /^@property --tw-[a-z-]+$/.test(selector)) return false;
    if (context.length === 1 && /^@keyframes rc-[a-z-]+$/.test(context[0])) return false;
    if (context[0] === "@layer properties" && context.length === 2) return !only(/^--tw-/);
    return true;
  });
  assert.deepEqual(unexpected, []);

  // No rule is in a cascade layer: an app's own unlayered rules would win over it.
  const layered = rules(stylesheet).filter(
    ({ context, selector }) =>
      leadingClass(selector) && context.some((rule) => rule.startsWith("@layer")),
  );
  assert.deepEqual(layered, []);
  // Around component rules, only media queries.
  const contexts = rules(stylesheet)
    .filter(({ selector }) => leadingClass(selector))
    .flatMap(({ context }) => context);
  assert.deepEqual(
    [...new Set(contexts)].filter((rule) => !rule.startsWith("@media ")),
    [],
  );
});

test("every class in the precompiled stylesheet is one a component uses", () => {
  const source = filesUnder("dist/components")
    .filter((name) => name.endsWith(".js"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const classes = new Set(rules(stylesheet).map(({ selector }) => leadingClass(selector)));
  classes.delete(null);
  assert.ok(classes.size > 50, "expected to find the component classes");
  assert.deepEqual(
    [...classes].filter((name) => !source.includes(name)),
    [],
  );
});

test("the compiled JavaScript carries no comments for Tailwind to mistake for class names", () => {
  for (const file of filesUnder("dist").filter((name) => name.endsWith(".js"))) {
    const comments = readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => /^\s*(\/\/|\/\*)/.test(line) && !line.startsWith("//# sourceMappingURL="));
    assert.deepEqual(comments, [], file);
  }
});

test("the Tailwind entry point ships beside the components it points at", () => {
  const entry = read("dist/tailwind.css");
  assert.match(entry, /@source "\.\/components\/\*\*\/\*\.\{js,tsx\}";/);
  assert.ok(existsSync(join(root, "dist/components/ui/button.js")));
});
