#!/usr/bin/env node
// Generates the site's content from the repository: token reference pages from the token
// source, and copies of the repository's own documents. Everything it writes is git-ignored;
// the only hand-written page is src/content/docs/index.mdx.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkContrast,
  compose,
  hexOf,
  loadSource,
  MODES,
  resolvedType,
  resolveToken,
} from "@raincoat-ui/tokens";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "../..");
const contentDir = join(appRoot, "src/content/docs");
const REPO_URL = "https://github.com/raincoat-ui/design-system";
const MODE_LABEL = {
  light: "Light",
  dark: "Dark",
  "light-hc": "Light, high contrast",
  "dark-hc": "Dark, high contrast",
};

// ---------------------------------------------------------------------------------------------
// Helpers

for (const generated of ["foundations", "components", "contributing", "project"]) {
  rmSync(join(contentDir, generated), { recursive: true, force: true });
}

function page(path, { title, description, order }, body) {
  const file = join(contentDir, path);
  mkdirSync(dirname(file), { recursive: true });
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    description ? `description: ${JSON.stringify(description)}` : null,
    order === undefined ? null : `sidebar:\n  order: ${order}`,
    "---",
  ].filter(Boolean);
  writeFileSync(file, `${frontmatter.join("\n")}\n\n${body.trim()}\n`);
}

const swatch = (hex) => `<span class="rc-swatch" style="background:${hex}"></span>`;
const code = (text) => `\`${text}\``;
const table = (head, rows) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`]
    .concat(rows.map((row) => `| ${row.join(" | ")} |`))
    .join("\n");
const dimension = ({ value, unit }) =>
  unit === "rem" ? `${value}rem (${value * 16}px)` : `${value}${unit}`;

const files = loadSource(repoRoot);
const composed = Object.fromEntries(
  MODES.map((mode) => [mode, compose(files, { mode, density: "comfortable" }).tokens]),
);
const base = composed.light;
const compact = compose(files, { mode: "light", density: "compact" }).tokens;
const tokensWhere = (predicate) => [...base.values()].filter(predicate);
const colorIn = (mode, id) => hexOf(resolveToken(id, composed[mode]));
const isType = (token, type) => resolvedType(token.id, base) === type;

// ---------------------------------------------------------------------------------------------
// Foundations: color

const ramps = ["neutral", "brand", "red"]
  .map((ramp) => {
    const steps = tokensWhere((t) => t.tier === "primitive" && t.path[1] === ramp);
    const chips = steps
      .map((t) => {
        const hex = hexOf(resolveToken(t.id, base));
        return `<div><span class="rc-chip" style="background:${hex}"></span><strong>${t.path[2]}</strong><br><code>${hex}</code></div>`;
      })
      .join("");
    return `### ${ramp[0].toUpperCase()}${ramp.slice(1)}\n\n<div class="rc-ramp">${chips}</div>`;
  })
  .join("\n\n");

const roleGroups = [
  ["bg", "Backgrounds"],
  ["fg", "Text and icons"],
  ["border", "Borders"],
  ["accent", "Accent fills"],
  ["danger", "Danger fills"],
  ["control", "Neutral control fills"],
];
const roles = roleGroups
  .map(([group, label]) => {
    const rows = tokensWhere(
      (t) => t.tier === "semantic" && t.path[0] === "color" && t.path[1] === group,
    ).map((t) => [
      code(t.id),
      t.description,
      ...MODES.map((mode) => `${swatch(colorIn(mode, t.id))}${code(colorIn(mode, t.id))}`),
    ]);
    return `### ${label}\n\n${table(["Token", "Use", ...MODES.map((m) => MODE_LABEL[m])], rows)}`;
  })
  .join("\n\n");

page(
  "foundations/color.md",
  {
    title: "Color",
    description: "Raincoat's color roles in every color mode, and the ramps they are drawn from.",
    order: 1,
  },
  `
Components use **roles**, never raw colors. A role such as ${code("color.fg.muted")} has a value
in each of the four color modes, so a component styled with roles works in all of them.

This page shows the base brand: slate neutrals with a raincoat-yellow accent. A theme replaces
the brand and neutral ramps and may remap any role.

## Roles

${roles}

## Ramps

The raw colors that roles point to. Do not use these directly in components.

${ramps}
`,
);

// ---------------------------------------------------------------------------------------------
// Foundations: contrast

const contrastRows = checkContrast(repoRoot);
const pairs = new Map();
for (const row of contrastRows) {
  const key = `${row.token} ${row.on}`;
  if (!pairs.has(key)) pairs.set(key, { ...row, ratios: {} });
  pairs.get(key).ratios[row.mode] = row;
}
const KIND_LABEL = { text: "Text", "large-text": "Large text", graphic: "Outline or icon" };

page(
  "foundations/contrast.md",
  {
    title: "Contrast",
    description: "The contrast ratio of every declared color pair in every color mode.",
    order: 2,
  },
  `
Every text, border, and focus color declares what it is drawn on. The build computes the
[WCAG 2](https://www.w3.org/TR/WCAG22/#contrast-minimum) contrast ratio of each pair in each
color mode and fails if any pair is below its requirement.

| Kind | Standard modes | High-contrast modes |
| --- | --- | --- |
| Text | 4.5:1 | 7:1 |
| Large text (24px and above) | 3:1 | 4.5:1 |
| Outline or icon | 3:1 | 3:1 |

All ${contrastRows.length} checks pass. The table lists each pair's ratio.

${table(
  ["Color, and what it is drawn on", "Kind", "Light", "Dark", "Light HC", "Dark HC"],
  [...pairs.values()].map((pair) => [
    `${code(pair.token)}<br>on ${code(pair.on)}`,
    KIND_LABEL[pair.kind],
    ...MODES.map((mode) => `${pair.ratios[mode].ratio.toFixed(2)}:1`),
  ]),
)}

Disabled colors and purely decorative dividers are exempt, as WCAG allows, and each exemption
is recorded with its reason in the token source.
`,
);

// ---------------------------------------------------------------------------------------------
// Foundations: typography, spacing and shape, motion

const SAMPLE = "Thiết kế rõ ràng · 清晰的设计 · 明快なデザイン · 명확한 디자인";
const typeStyles = tokensWhere((t) => t.tier === "semantic" && isType(t, "typography")).map((t) => {
  const v = resolveToken(t.id, base);
  const family = [].concat(v.fontFamily).join(", ");
  const style = `font-family:${family};font-size:${v.fontSize.value}${v.fontSize.unit};font-weight:${v.fontWeight};line-height:${v.lineHeight}`;
  return [
    code(t.id),
    t.description,
    dimension(v.fontSize),
    String(v.fontWeight),
    String(v.lineHeight),
    `<span style="${style.replaceAll('"', "'")}">${SAMPLE}</span>`,
  ];
});
const families = tokensWhere((t) => t.tier === "primitive" && isType(t, "fontFamily")).map((t) => [
  code(t.id),
  [].concat(resolveToken(t.id, base)).join(", "),
  t.description,
]);

page(
  "foundations/typography.md",
  {
    title: "Typography",
    description: "Raincoat's text styles and the font values they are composed from.",
    order: 3,
  },
  `
Components set text with composed **styles**. Each style fixes family, size, weight, and line
height together.

## Styles

${table(["Token", "Use", "Size", "Weight", "Line height", "Sample"], typeStyles)}

The samples use the fonts available in your browser. The bundled typefaces arrive with the web
package.

## Families

${table(["Token", "Stack", "Use"], families)}

Fonts must be licensed under the SIL Open Font License and cover Vietnamese fully. Chinese,
Japanese, and Korean text falls back to the fonts of the operating system.

## Line height

Labels use 1.4 and body text 1.5. 1.4 is the lowest value that does not clip stacked
Vietnamese diacritics such as ${code("Ặ")} and ${code("Ễ")}.
`,
);

const bar = (px) => `<span class="rc-bar" style="inline-size:${px}px"></span>`;
const spaceRows = tokensWhere((t) => t.tier === "semantic" && t.path[0] === "space").map((t) => {
  const v = resolveToken(t.id, base);
  return [code(t.id), dimension(v), bar(v.value), t.description];
});
const radiusRows = tokensWhere((t) => t.tier === "semantic" && t.path[0] === "radius").map((t) => {
  const v = resolveToken(t.id, base);
  return [
    code(t.id),
    dimension(v),
    `<span class="rc-box" style="border-radius:${Math.min(v.value, 24)}px"></span>`,
    t.description,
  ];
});
const heightRows = tokensWhere((t) => t.id.startsWith("size.control.")).map((t) => [
  code(t.id),
  dimension(resolveToken(t.id, base)),
  dimension(resolveToken(t.id, compact)),
  t.description,
]);
const otherSizes = tokensWhere(
  (t) =>
    t.tier === "semantic" &&
    (t.path[0] === "border-width" || (t.path[0] === "size" && t.path[1] !== "control")),
).map((t) => [code(t.id), dimension(resolveToken(t.id, base)), t.description]);

page(
  "foundations/spacing-and-shape.md",
  {
    title: "Spacing and shape",
    description: "The spacing scale, corner radii, control heights, and border widths.",
    order: 4,
  },
  `
## Spacing

One scale, in steps of 4px. It is locked: themes cannot change it, so layouts stay aligned
across brands.

${table(["Token", "Value", "", "Use"], spaceRows)}

## Corner radius

Themes may change the radii to set how round a brand feels.

${table(["Token", "Value", "", "Use"], radiusRows)}

## Control height

Control heights depend on density. Whatever the visible height, the touch target is never
smaller than ${code("size.target.minimum")}.

${table(["Token", "Comfortable", "Compact", "Use"], heightRows)}

## Borders and fixed sizes

${table(["Token", "Value", "Use"], otherSizes)}
`,
);

const durationRows = tokensWhere((t) => t.tier === "semantic" && isType(t, "duration")).map((t) => {
  const v = resolveToken(t.id, base);
  return [code(t.id), `${v.value}${v.unit}`, t.description];
});
const easingRows = tokensWhere((t) => t.tier === "semantic" && isType(t, "cubicBezier")).map(
  (t) => [code(t.id), code(`cubic-bezier(${resolveToken(t.id, base).join(", ")})`), t.description],
);

page(
  "foundations/motion.md",
  {
    title: "Motion",
    description: "Durations and easing curves.",
    order: 5,
  },
  `
Motion is short and functional. When a person asks for reduced motion, transitions are removed.

## Duration

${table(["Token", "Value", "Use"], durationRows)}

## Easing

${table(["Token", "Curve", "Use"], easingRows)}
`,
);

// ---------------------------------------------------------------------------------------------
// Components: Button (static rendition from tokens, until the implementations land)

const SURFACE = "color.bg.canvas";
const buttonIn = (mode, variant, state) => {
  const t = composed[mode];
  const has = (id) => t.has(id);
  const bgId =
    state === "disabled"
      ? "button.disabled.bg"
      : has(`button.${variant}.bg.${state}`)
        ? `button.${variant}.bg.${state}`
        : null;
  const fgId = state === "disabled" ? "button.disabled.fg" : `button.${variant}.fg`;
  const borderId =
    state === "disabled"
      ? variant === "secondary"
        ? "button.disabled.border"
        : null
      : has(`button.${variant}.border`)
        ? `button.${variant}.border`
        : null;
  const style = [
    `background:${bgId ? colorIn(mode, bgId) : "transparent"}`,
    `color:${colorIn(mode, fgId)}`,
    `border-color:${borderId ? colorIn(mode, borderId) : "transparent"}`,
  ].join(";");
  return `<span class="rc-button" style="${style}">${variant[0].toUpperCase()}${variant.slice(1)}</span>`;
};
const VARIANTS = ["primary", "secondary", "ghost", "danger"];
const stages = MODES.map((mode) => {
  const rest = VARIANTS.map((variant) => buttonIn(mode, variant, "default")).join("");
  const disabled = buttonIn(mode, "secondary", "disabled").replace(">Secondary<", ">Disabled<");
  return `### ${MODE_LABEL[mode]}\n\n<div class="rc-stage" style="background:${colorIn(mode, SURFACE)}">${rest}${disabled}</div>`;
}).join("\n\n");
const buttonTokens = tokensWhere((t) => t.tier === "component" && t.path[0] === "button").map(
  (t) => {
    const type = resolvedType(t.id, base);
    const value =
      type === "color"
        ? `${swatch(colorIn("light", t.id))}${code(colorIn("light", t.id))}`
        : type === "dimension"
          ? dimension(resolveToken(t.id, base))
          : code(String(t.value));
    return [code(t.id), code(String(t.value)), value, t.description];
  },
);

page(
  "components/button.md",
  {
    title: "Button",
    description: "The Button's variants in every color mode, drawn from its tokens.",
    order: 1,
  },
  `
:::caution[In progress]
The Button is specified in [RFC 0001](/design-system/project/rfcs/0001-foundation-tokens-and-button/)
and its tokens exist. The React, SwiftUI, and Compose implementations are being built. What you
see below is a static rendition drawn from the tokens, not the component.
:::

## Variants

| Variant | Use |
| --- | --- |
| Primary | The main action in a view. At most one per view. |
| Secondary | An alternative action beside the primary one. |
| Ghost | A low-emphasis action with no fill at rest. |
| Danger | A destructive action. Say what is destroyed: "Delete page", not "Delete". |

${stages}

## Tokens

Values shown are for the light mode at comfortable density.

${table(["Token", "Points to", "Value", "Use"], buttonTokens)}
`,
);

// ---------------------------------------------------------------------------------------------
// Copies of the repository's documents

function importDocument(source, destination, { order, title } = {}) {
  let text = readFileSync(join(repoRoot, source), "utf8");
  text = text.replace(/^<!--[\s\S]*?-->\s*/, "");
  const heading = /^# (.+)$/m.exec(text);
  text = text.replace(/^# .+\n+/m, "");
  // Links between repository files point at GitHub, where every one of them resolves.
  text = text.replace(/\]\((?!https?:|mailto:|#|\/)([^)\s]+)\)/g, (_, target) => {
    const [path, anchor] = target.split("#");
    const resolved = posix.normalize(posix.join(posix.dirname(source), path));
    return `](${REPO_URL}/blob/main/${resolved}${anchor ? `#${anchor}` : ""})`;
  });
  page(destination, { title: title ?? heading?.[1] ?? source, order }, text);
}

importDocument("CONTRIBUTING.md", "contributing/overview.md", {
  order: 1,
  title: "How to contribute",
});
importDocument("docs/contributing/add-a-token.md", "contributing/add-a-token.md", { order: 2 });
importDocument("rfcs/README.md", "contributing/rfcs.md", {
  order: 3,
  title: "Proposing a change (RFCs)",
});
importDocument("docs/roadmap.md", "project/roadmap.md", { order: 1 });
importDocument("docs/research/prior-art.md", "project/prior-art.md", { order: 2 });
importDocument("licenses/ALLOWLIST.md", "project/licenses.md", { order: 3 });

const numbered = (dir) =>
  readdirSync(join(repoRoot, dir))
    .filter((name) => /^\d{4}-.+\.md$/.test(name) && !name.startsWith("0000-"))
    .sort();
for (const [index, name] of numbered("docs/adr").entries()) {
  importDocument(`docs/adr/${name}`, `project/decisions/${name}`, { order: index + 1 });
}
for (const [index, name] of numbered("rfcs").entries()) {
  importDocument(`rfcs/${name}`, `project/rfcs/${name}`, { order: index + 1 });
}

// ---------------------------------------------------------------------------------------------
// Site accent colors, taken from the brand ramp

const brand = (step) => hexOf(resolveToken(`color.brand.${step}`, base));
mkdirSync(join(appRoot, "src/styles"), { recursive: true });
writeFileSync(
  join(appRoot, "src/styles/generated.css"),
  `/* GENERATED by scripts/generate.mjs from the token source. Do not edit. */
:root {
  --sl-color-accent-low: ${brand(950)};
  --sl-color-accent: ${brand(600)};
  --sl-color-accent-high: ${brand(200)};
}
:root[data-theme="light"] {
  --sl-color-accent-low: ${brand(100)};
  --sl-color-accent: ${brand(800)};
  --sl-color-accent-high: ${brand(950)};
}
`,
);

console.log("Generated the documentation content from the repository.");
