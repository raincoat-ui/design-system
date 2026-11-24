#!/usr/bin/env node
// Generates the site's content from the repository: token reference pages from the token
// source, a page for each component spec and the parity matrix, and copies of the repository's
// own documents. Everything it writes is git-ignored; the only hand-written page is
// src/content/docs/index.mdx.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildThemeCss,
  checkContrast,
  compose,
  enumerations,
  hexOf,
  loadSource,
  loadSpecs,
  MODES,
  openProject,
  resolvedType,
  resolveToken,
} from "@raincoat-ui/tokens";
import {
  code,
  colorCell,
  dimension,
  draws,
  list,
  MODE_LABEL,
  opacity,
  readable,
  shadowCell,
  swatch,
  table,
} from "./markdown.mjs";
import { buttonRow } from "./renditions/button.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptsDir, "..");
const repoRoot = resolve(appRoot, "../..");
const contentDir = join(appRoot, "src/content/docs");
const REPO_URL = "https://github.com/raincoat-ui/design-system";

// ---------------------------------------------------------------------------------------------
// Helpers

for (const generated of ["foundations", "components", "contributing", "project"]) {
  rmSync(join(contentDir, generated), { recursive: true, force: true });
}

/** Links between repository files point at GitHub, where every one of them resolves. */
function repositoryLinks(text, source) {
  return text.replace(/\]\((?!https?:|mailto:|#|\/)([^)\s]+)\)/g, (_, target) => {
    const [path, anchor] = target.split("#");
    const resolved = posix.normalize(posix.join(posix.dirname(source), path));
    return `](${REPO_URL}/blob/main/${resolved}${anchor ? `#${anchor}` : ""})`;
  });
}

/** Moves every heading outside fenced code one level down, so a document's ## becomes ###. */
function demoteHeadings(text) {
  let fenced = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^(```|~~~)/.test(line)) fenced = !fenced;
      return fenced ? line : line.replace(/^(#{2,5}) /, "#$1 ");
    })
    .join("\n");
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

const files = loadSource(repoRoot);
const composed = Object.fromEntries(
  MODES.map((mode) => [mode, compose(files, { mode, density: "comfortable" }).tokens]),
);
const base = composed.light;
const compact = compose(files, { mode: "light", density: "compact" }).tokens;
const tokensWhere = (predicate) => [...base.values()].filter(predicate);
const colorIn = (mode, id) => resolveToken(id, composed[mode]);
const isType = (token, type) => resolvedType(token.id, base) === type;

// ---------------------------------------------------------------------------------------------
// Foundations: color

const primitiveColors = tokensWhere((t) => t.tier === "primitive" && t.path[0] === "color");
const ramps = [...new Set(primitiveColors.map((t) => t.path[1]))]
  .map((ramp) => {
    const chips = primitiveColors
      .filter((t) => t.path[1] === ramp)
      .map((t) => {
        const color = resolveToken(t.id, base);
        return `<div>${swatch(color, "rc-chip")}<strong>${t.path[2]}</strong><br><code>${hexOf(color)}</code>${opacity(color)}</div>`;
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
      ...MODES.map((mode) => colorCell(colorIn(mode, t.id))),
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

This page shows the base brand: near-neutral ink greys with a raincoat-yellow accent. A theme replaces
the brand and neutral ramps and may remap any role.
${
  primitiveColors.some((t) => opacity(resolveToken(t.id, base)))
    ? `
A translucent color, such as the scrim behind a dialog, is given with its opacity, as in
${code("#000000")} at 40%. Its swatch is drawn over hatching, which shows through it.
`
    : ""
}
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
const panelRows = tokensWhere((t) => t.id.startsWith("size.panel.")).map((t) => [
  code(t.id),
  dimension(resolveToken(t.id, base)),
  t.description,
]);
const otherSizes = tokensWhere(
  (t) =>
    t.tier === "semantic" &&
    (t.path[0] === "border-width" ||
      (t.path[0] === "size" && t.path[1] !== "control" && t.path[1] !== "panel")),
).map((t) => [code(t.id), dimension(resolveToken(t.id, base)), t.description]);

// Shadows: the base's, which of them a theme may change, and which themes here change them.
const shadows = tokensWhere((t) => t.tier !== "component" && isType(t, "shadow"));
const shadowRows = shadows.map((t) => [
  typeof t.value === "string" ? `${code(t.id)}<br>${code(t.value)}` : code(t.id),
  shadowCell(resolveToken(t.id, base)),
  t.description,
]);
const flat = !shadows.some((t) => draws(resolveToken(t.id, base)));
const liftable = shadows.filter((t) => t.extension.overridable).map((t) => code(t.id));
const lifting = openProject(repoRoot)
  .themes.filter((theme) =>
    theme.files.some((entry) => entry.tokens.some((t) => t.overridden && t.path[0] === "shadow")),
  )
  .map((theme) => theme.meta.name);

page(
  "foundations/spacing-and-shape.md",
  {
    title: "Spacing and shape",
    description:
      "The spacing scale, corner radii, shadows, control heights, panel widths, and border widths.",
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

## Shadow

${
  flat
    ? `The base is flat: every shadow is none. Cards, dialogs, sheets, and toasts are set apart by
their outline, and a dialog or sheet also by the scrim behind it, not lifted on a shadow.`
    : "Surfaces above the page take their shadow from these roles."
} A theme may give ${list(liftable)} ${liftable.length === 1 ? "a value" : "values"} to lift
its surfaces. ${
    lifting.length === 0
      ? "No theme in this repository does."
      : `In this repository, ${list(lifting)} ${lifting.length === 1 ? "does" : "do"}: see [Themes](/design-system/foundations/themes/).`
  }

${table(["Token, and what it points to", "Value", "Use"], shadowRows)}

## Control height

Control heights depend on density. Whatever the visible height, the touch target is never
smaller than ${code("size.target.minimum")}.

${table(["Token", "Comfortable", "Compact", "Use"], heightRows)}

## Panel width

Panels above the page, such as dialogs, sheets, and toasts, take one of these widths. Like every
size, they are locked: themes cannot change them.

${table(["Token", "Value", "Use"], panelRows)}

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
// Foundations: themes, each shown in every mode with its own stylesheet

const pascalCase = (id) =>
  id
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
const THEME_LABELS = {
  primary: "Lock until 11:30",
  secondary: "Edit schedule",
  ghost: "Not now",
  danger: "End early",
  disabled: "Unavailable",
};
const themeButtons = buttonRow((variant) => THEME_LABELS[variant]);
const themes = openProject(repoRoot).themes;
// A theme may carry the web fonts it names, with their @font-face rules, in themes/<id>/fonts/.
// They are copied into the site, and the rules point at the copies.
const themeFontsDir = join(appRoot, "public/theme-fonts");
rmSync(themeFontsDir, { recursive: true, force: true });
const themeFonts = themes
  .filter((theme) => !theme.base && existsSync(join(theme.dir, "fonts")))
  .flatMap((theme) => {
    const fonts = join(theme.dir, "fonts");
    cpSync(fonts, join(themeFontsDir, theme.id), {
      recursive: true,
      filter: (source) => !source.endsWith(".css"),
    });
    return readdirSync(fonts)
      .filter((name) => name.endsWith(".css"))
      .map((name) =>
        readFileSync(join(fonts, name), "utf8").replace(
          /url\(["']?\.\/([^"')]+)["']?\)/g,
          (_, file) => `url("/design-system/theme-fonts/${theme.id}/${file}")`,
        ),
      );
  });
// One scoped stylesheet per theme. The class makes it outrank the site's own (base) theme.
const themeStyles = [
  ...themeFonts,
  ...themes.map((theme) =>
    buildThemeCss(theme.files, { scope: `.rc-themed[data-rc-theme="${theme.id}"]` }),
  ),
].join("\n");
const themeSections = themes.map((theme) => {
  const overridden = theme.files.flatMap((entry) => entry.tokens).filter((t) => t.overridden);
  const rows = checkContrast(theme.files);
  const brand = theme.base
    ? ""
    : readFileSync(join(theme.dir, "brand.md"), "utf8")
        .replace(/^# .+\n+/, "")
        .replace(/^## /gm, "### ");
  const plates = MODES.map(
    (mode) =>
      `<figure class="rc-plate"><figcaption>${MODE_LABEL[mode]}</figcaption><div class="rc-stage rc-themed" data-rc-theme="${theme.id}" data-theme="${mode}">${themeButtons}</div></figure>`,
  ).join("\n");
  return `## ${theme.meta.name}

${theme.meta.description}

${table(
  ["Platform", "Package"],
  [
    ["npm", code(`@raincoat-ui/theme-${theme.id}`)],
    ["Maven", code(`io.github.raincoat-ui:theme-${theme.id}`)],
    [
      "Swift",
      `${code(`RaincoatTheme${pascalCase(theme.id)}`)}, applied with ${code(`.raincoatTheme(.${theme.id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())})`)}`,
    ],
  ],
)}

${
  theme.base
    ? "The base theme is the token source itself: every other theme starts from it."
    : `It overrides ${overridden.length} tokens, in ${code(`themes/${theme.id}/`)}.`
} All ${rows.length} declared color pairs meet their contrast requirement in every mode.

${plates}

${brand}`;
});

page(
  "foundations/themes.md",
  {
    title: "Themes",
    description: "Every theme in this repository, in each color mode, with its packages.",
    order: 6,
  },
  `
A theme is a directory of overrides on top of the base token source. It may change the brand and
neutral ramps, the color each role takes in each mode, font families and weights, radii, the
shadows of raised surfaces and overlays, and the outline of a card. It cannot change spacing,
sizes, touch targets, focus rules, or contrast minimums, and it cannot add or remove a token.
Each theme is a package of its own on every platform, so an app installs only its own. To add
one, see [Add a theme](/design-system/contributing/add-a-theme/).

The plates below use each theme's own stylesheet, and the fonts it carries in
${code("themes/<id>/fonts/")}. The theme packages do not bundle fonts yet: an app that does not
load a theme's font falls back to the system font.

<style>
${themeStyles}
</style>

${themeSections.join("\n\n")}
`,
);

// ---------------------------------------------------------------------------------------------
// Components: a page for each spec in specs/components/, then the parity matrix

const PLATFORMS = [
  { id: "web", label: "Web (React)", framework: "React" },
  { id: "ios", label: "iOS (SwiftUI)", framework: "SwiftUI" },
  { id: "android", label: "Android (Compose)", framework: "Compose" },
];
const PARITY_PAGE = "/design-system/components/parity-matrix/";

// Pages are ordered by the spec's group, then by its name, after which the parity matrix comes
// last. The Button, in Actions, stays 3.1.
const specs = loadSpecs(repoRoot)
  .map(({ file, spec, error }) => {
    if (error) throw new Error(`${file} is not valid YAML: ${error}`);
    return spec;
  })
  .sort(
    (a, b) =>
      String(a.group).localeCompare(String(b.group), "en") ||
      String(a.name).localeCompare(String(b.name), "en"),
  );

// A page may also show static renditions of its component, drawn from tokens, from
// renditions/<id>.mjs: its default export is called with { spec } and returns
// { note?, sections, styles? }, as renditions/button.mjs describes. A renditions file needs a
// spec of the same id.
const renditionsDir = join(scriptsDir, "renditions");
const renditionFiles = readdirSync(renditionsDir).filter((name) => name.endsWith(".mjs"));
for (const name of renditionFiles) {
  if (!specs.some((spec) => `${spec.id}.mjs` === name)) {
    throw new Error(`renditions/${name} has no spec in specs/components/${name.slice(0, -4)}/`);
  }
}
async function renditionsOf(spec) {
  if (!renditionFiles.includes(`${spec.id}.mjs`)) return undefined;
  const module = await import(pathToFileURL(join(renditionsDir, `${spec.id}.mjs`)).href);
  return module.default({ spec });
}

// The package a platform's source file ships in: the npm package whose package.json is
// nearest, the Swift target under Sources/, or the Gradle module that holds src/.
function packageOf(platform, file) {
  const parts = file.split("/");
  if (platform === "ios") {
    const at = parts.indexOf("Sources");
    return at === -1 ? undefined : parts[at + 1];
  }
  if (platform === "android") {
    const at = parts.indexOf("src");
    const build = at > 0 ? join(repoRoot, ...parts.slice(0, at), "build.gradle.kts") : "";
    const group = existsSync(build) && /^group = "([^"]+)"/m.exec(readFileSync(build, "utf8"));
    return group ? `${group[1]}:${parts[at - 1]}` : undefined;
  }
  for (let at = parts.length - 1; at > 0; at -= 1) {
    const manifest = join(repoRoot, ...parts.slice(0, at), "package.json");
    if (existsSync(manifest)) return JSON.parse(readFileSync(manifest, "utf8")).name;
  }
  return undefined;
}

/**
 * A component on one platform, as the repository has it: the file the spec lists under
 * `implementations`, whether that file exists, its package, and the names, each linked to the
 * source. Nothing here is claimed by hand.
 */
function implementationOf(spec, platform) {
  const entry = spec.implementations?.[platform];
  if (!entry) return undefined;
  const source = `${REPO_URL}/blob/main/${entry.file}`;
  return {
    file: entry.file,
    exists: existsSync(join(repoRoot, entry.file)),
    package: packageOf(platform, entry.file),
    names: list([entry.name].flat().map((name) => `[${code(name)}](${source})`)),
  };
}

function implementedIn(spec) {
  const found = PLATFORMS.map((platform) => [platform, implementationOf(spec, platform.id)]);
  const done = found
    .filter(([, implementation]) => implementation?.exists)
    .map(
      ([platform, { names, package: shipsIn }]) =>
        `${platform.framework} (${names}${shipsIn ? ` in ${code(shipsIn)}` : ""})`,
    );
  const missing = found
    .filter(([, implementation]) => !implementation?.exists)
    .map(([platform]) => platform.framework);
  if (done.length === 0) return "Not implemented on any platform yet.";
  return missing.length === 0
    ? `Implemented in ${list(done)}.`
    : `Implemented in ${list(done)}; not yet in ${list(missing, "or")}.`;
}

/** The tokens a component owns, then any other token its anatomy names. */
function tokensOf(spec) {
  const ids = [...base.keys()];
  const own = ids.filter(
    (id) => base.get(id).tier === "component" && base.get(id).path[0] === spec.id,
  );
  const named = Object.values(spec.anatomy)
    .flatMap(({ tokens = [] }) => tokens)
    .flatMap((reference) =>
      reference.endsWith(".*")
        ? ids.filter((id) => id.startsWith(reference.slice(0, -1)))
        : [reference],
    );
  return [...new Set([...own, ...named])].filter((id) => base.has(id)).map((id) => base.get(id));
}

/** A token's value in the light mode at comfortable density. */
function tokenValue(id) {
  const value = resolveToken(id, base);
  switch (resolvedType(id, base)) {
    case "color":
      return colorCell(value);
    case "shadow":
      return shadowCell(value);
    case "dimension":
      return dimension(value);
    case "duration":
      return `${value.value}${value.unit}`;
    case "cubicBezier":
      return code(`cubic-bezier(${value.join(", ")})`);
    case "typography":
      return `${dimension(value.fontSize)}, weight ${value.fontWeight}, line height ${value.lineHeight}`;
    case "fontFamily":
      return [].concat(value).join(", ");
    default:
      return code(String(value));
  }
}

const rfcFiles = readdirSync(join(repoRoot, "rfcs"));

async function componentPage(spec, order) {
  const number = String(spec.rfc).padStart(4, "0");
  const rfc = rfcFiles.find((name) => name.startsWith(`${number}-`) && name.endsWith(".md"));
  const proposedIn = rfc
    ? `[RFC ${number}](/design-system/project/rfcs/${rfc.replace(/\.md$/, "")}/)`
    : `RFC ${number}`;
  const types = enumerations(spec).map(({ name }) => readable(name).toLowerCase());
  const generated =
    types.length === 0
      ? ""
      : types.length === 1
        ? ` The ${types[0]} type used by every platform's implementation is generated from this spec.`
        : ` The ${list(types)} types used by every platform's implementation are generated from this spec.`;
  const renditions = await renditionsOf(spec);

  const propertyRows = Object.entries(spec.properties).map(([name, property]) => [
    code(name),
    property.values ? Object.keys(property.values).map(code).join(", ") : "true, false",
    code(String(property.default)),
    property.description,
  ]);
  const valueTables = Object.entries(spec.properties)
    .filter(([, property]) => property.values)
    .map(
      ([name, property]) =>
        `### ${readable(name)}\n\n${table(
          ["Value", "Use"],
          Object.entries(property.values).map(([value, use]) => [code(value), use]),
        )}`,
    );
  const required = (value) =>
    value === true ? "Yes" : value === false ? "No" : `${value[0].toUpperCase()}${value.slice(1)}`;
  const contentRows = Object.entries(spec.content ?? {}).map(([part, detail]) => [
    readable(part),
    detail.description,
    required(detail.required),
  ]);
  const stateRows = Object.entries(spec.states).map(([name, state]) => [
    readable(name),
    state.description,
  ]);
  const anatomyRows = Object.entries(spec.anatomy).map(([part, detail]) => [
    readable(part),
    detail.description,
    (detail.tokens ?? []).map(code).join("<br>"),
  ]);
  const accessibilityRows = Object.entries(spec.accessibility)
    .filter(([key]) => key !== "keyboard")
    .map(([key, value]) => [readable(key), value]);
  const keyboardRows = spec.accessibility.keyboard.map(({ keys, action }) => [
    keys.map((key) => `<kbd>${key}</kbd>`).join(" or "),
    action,
  ]);
  const concerns = (section) =>
    table(
      ["Concern", "Behavior"],
      Object.entries(section).map(([key, value]) => [readable(key), value]),
    );
  const guidelinesFile = `specs/components/${spec.id}/guidelines.md`;
  const guidelines = existsSync(join(repoRoot, guidelinesFile))
    ? demoteHeadings(
        repositoryLinks(
          readFileSync(join(repoRoot, guidelinesFile), "utf8").replace(/^# .+\n+/, ""),
          guidelinesFile,
        ),
      )
    : undefined;
  const tokenRows = tokensOf(spec).map((t) => [
    typeof t.value === "string" && t.value.startsWith("{")
      ? `${code(t.id)}<br>${code(t.value)}`
      : code(t.id),
    tokenValue(t.id),
    t.description,
  ]);

  const sections = [
    `## Properties\n\n${table(["Property", "Values", "Default", "Description"], propertyRows)}`,
    ...valueTables,
    contentRows.length > 0 &&
      `## Content\n\n${table(["Content", "Description", "Required"], contentRows)}`,
    ...(renditions?.sections ?? []).map(({ heading, body }) => `## ${heading}\n\n${body.trim()}`),
    `## States\n\n${table(["State", "Description"], stateRows)}`,
    `## Anatomy\n\n${table(["Part", "Description", "Tokens"], anatomyRows)}`,
    `## Accessibility\n\n${table(["Requirement", "Detail"], accessibilityRows)}`,
    `### Keyboard\n\n${table(["Keys", "Action"], keyboardRows)}`,
    `## Internationalization\n\n${concerns(spec.internationalization)}`,
    spec.motion && `## Motion\n\n${concerns(spec.motion)}`,
    guidelines && `## Guidelines\n\n${guidelines.trim()}`,
    tokenRows.length > 0 &&
      `## Tokens\n\nValues shown are for the light mode at comfortable density.\n\n${table(
        ["Token, and what it points to", "Value", "Use"],
        tokenRows,
      )}`,
  ].filter(Boolean);
  const note = renditions?.note && `:::note[About the renditions]\n${renditions.note.trim()}\n:::`;
  const styles = renditions?.styles && `<style>\n${renditions.styles.trim()}\n</style>`;

  page(
    `components/${spec.id}.md`,
    { title: spec.name, description: spec.summary, order },
    [
      spec.summary,
      `Spec version ${spec.specVersion}, proposed in ${proposedIn}.${generated}`,
      `${implementedIn(spec)} The [parity matrix](${PARITY_PAGE}) shows every component on every platform.`,
      note,
      styles,
      ...sections,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

for (const [index, spec] of specs.entries()) await componentPage(spec, index + 1);

const parityRows = specs.map((spec) => [
  `[${spec.name}](/design-system/components/${spec.id}/)`,
  spec.group,
  ...PLATFORMS.map(({ id }) => {
    const implementation = implementationOf(spec, id);
    if (!implementation) return "Not yet";
    return implementation.exists
      ? implementation.names
      : `Listed, but ${code(implementation.file)} is missing`;
  }),
]);
const complete = specs.filter((spec) =>
  PLATFORMS.every(({ id }) => implementationOf(spec, id)?.exists),
).length;

page(
  "components/parity-matrix.md",
  {
    title: "Parity matrix",
    description: "Every component against the web, iOS, and Android, read from the repository.",
    order: specs.length + 1,
  },
  `
Every component spec against the web, iOS, and Android. Each cell is read from the repository
when the site is built, never written by hand.

${complete} of ${specs.length} ${specs.length === 1 ? "component" : "components"} ${complete === 1 ? "is" : "are"} implemented on all three platforms.

${table(["Component", "Group", ...PLATFORMS.map(({ label }) => label)], parityRows)}

A cell names the component as that platform's code calls it, and links to its source file. It
does so when the spec lists the file under ${code("implementations")} and the file exists;
otherwise it reads "Not yet". The spec linter fails when a listed file does not exist or does
not mention the name. Components are listed by group, then by name, as in the contents.

The matrix reads the repository at the commit the site was built from, which can be ahead of
the latest prerelease. The [releases page](${REPO_URL}/releases) says what each release
carries.
`,
);

// ---------------------------------------------------------------------------------------------
// Copies of the repository's documents

function importDocument(source, destination, { order, title } = {}) {
  let text = readFileSync(join(repoRoot, source), "utf8");
  text = text.replace(/^<!--[\s\S]*?-->\s*/, "");
  const heading = /^# (.+)$/m.exec(text);
  text = text.replace(/^# .+\n+/m, "");
  page(
    destination,
    { title: title ?? heading?.[1] ?? source, order },
    repositoryLinks(text, source),
  );
}

importDocument("CONTRIBUTING.md", "contributing/overview.md", {
  order: 1,
  title: "How to contribute",
});
importDocument("docs/contributing/add-a-token.md", "contributing/add-a-token.md", { order: 2 });
importDocument("docs/contributing/add-a-theme.md", "contributing/add-a-theme.md", { order: 3 });
importDocument("rfcs/README.md", "contributing/rfcs.md", {
  order: 4,
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

console.log("Generated the documentation content from the repository.");
