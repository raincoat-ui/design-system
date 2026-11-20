---
name: Raincoat
description: A graphics standards manual for an interface; white paper, near-neutral ink, raincoat yellow as the one signal.
colors:
  raincoat-yellow: "#f7d22a"
  raincoat-yellow-hover: "#e6c103"
  raincoat-yellow-pressed: "#ba9c0a"
  yellow-highlight: "#ffe891"
  yellow-ink: "#6c5901"
  ink: "#191b1d"
  ink-deep: "#0c0d0f"
  graphite: "#5b5e61"
  number-grey: "#787a7e"
  pencil: "#a2a5a8"
  hairline: "#cfd1d4"
  hairline-faint: "#e3e5e6"
  paper: "#ffffff"
  paper-surface: "#fafafb"
  paper-subtle: "#f3f3f4"
  signal-red: "#d01d21"
  signal-red-hover: "#a91518"
  signal-red-pressed: "#830d10"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0px"
  label-md:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0px"
  label-sm:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0px"
  mono-number:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  none: "0px"
  sm: "2px"
  md: "2px"
  lg: "2px"
  full: "9999px"
spacing:
  "0": "0px"
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.raincoat-yellow}"
    textColor: "{colors.ink-deep}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.raincoat-yellow-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.raincoat-yellow-pressed}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-subtle}"
  button-secondary-pressed:
    backgroundColor: "{colors.hairline-faint}"
  button-ghost:
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-subtle}"
  button-danger:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.paper}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.signal-red-hover}"
  button-danger-pressed:
    backgroundColor: "{colors.signal-red-pressed}"
  button-disabled:
    backgroundColor: "{colors.paper-subtle}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.md}"
  button-sm:
    typography: "{typography.label-sm}"
    padding: "0 12px"
    height: "36px"
  button-lg:
    typography: "{typography.label-lg}"
    padding: "0 20px"
    height: "52px"
  sidebar-link-current:
    backgroundColor: "{colors.raincoat-yellow}"
    textColor: "{colors.ink-deep}"
    rounded: "{rounded.md}"
  note:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  specimen-plate:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "32px 24px"
---

# Design System: Raincoat

This file records the **base theme** (`packages/web-themes/base/theme.css`, generated from `tokens/`) and the **documentation site** (`apps/docs`) as built. Brand themes override every token flagged `overridable` in `tokens/` (brand and neutral ramps, per-mode color mappings, font families and weights, radius); spacing, border widths, minimum targets, focus rules, the danger ramp and contrast minimums are locked (ADR 0010). Values below are the light base mode unless a mode is named. Type roles `display`, `headline`, `title`, `lede` and `mono-number` are docs-site values from `site.css`; the `body` and `label` roles are the token source's composed styles.

## Overview

**Creative North Star: "The Standards Manual"**

Raincoat is set like a graphics standards manual for an interface. White paper, ink from one evenly stepped near-neutral grey ramp, and a single signal color: raincoat yellow. Sections are numbered and opened by a heavy ink rule; hairlines divide everything else. Components are shown as specimen plates, values as plain specification tables, cautions as ruled boxes with no tint. Nothing is rounded beyond 2px and nothing floats on a shadow.

The density is that of a reference document: a calm 60ch reading column, a numbered contents sidebar on the left, "On this page" on the right. The reader always knows where they stand by number ("3.1 Button"), and the yellow tells them which page that is. The voice of the system is restraint; brand themes bring their own color and voice, and the base stays neutral enough to carry any of them.

The world refuses the stock docs theme's tinted callouts, icon cards, pill-shaped inline code and rounded panels.

**Key Characteristics:**
- White paper, near-neutral ink (OKLCH chroma at most 0.005, hue 255).
- Raincoat yellow (`brand.400`) as the one signal: a 4px cover stripe, the primary action, the current page.
- Red only for danger.
- Be Vietnam Pro for words; JetBrains Mono only for numbers, code and token names.
- Every corner 2px. Flat: no shadows.
- Hairlines divide; a 2px ink rule opens a section.
- Section numbers in the sidebar and on every page title.

## Colors

One evenly stepped ink ramp, one yellow, one red; everything else is paper.

### Primary
- **Raincoat Yellow** (`color.brand.400`, oklch(0.87 0.17 95)): the signal. The 4px stripe across the top of the header, the primary button, the current page in the sidebar. In dark mode it also draws the focus ring. Hover steps down the ramp to Raincoat Yellow Hover (`brand.500`) and pressed to Raincoat Yellow Pressed (`brand.600`); in dark mode hover steps up to `brand.300`. Outside the interface it is the coat in the logo.
- **Yellow Highlight** (`brand.200`): text selection only, under deep ink.
- **Yellow Ink** (`brand.800`, `color.fg.accent`): the accent as readable text on paper, where yellow itself would fail contrast. Dark mode uses `brand.300`.

### Neutral
- **Ink** (`neutral.900`): default text (`color.fg.default`), the strong border (`color.border.strong`) and the light-mode focus ring. Every ink rule on the docs site (the header rule, section openers, table heads, caution notes) is `color.border.strong`, so it follows the token in each mode (`neutral.100` in dark). The logo's lining is this ink.
- **Ink Deep** (`neutral.950`): text on yellow (`color.fg.on-accent`) and the docs site's headings in light mode.
- **Graphite** (`neutral.600`): muted text (`color.fg.muted`) and the sidebar's section numbers.
- **Number Grey** (`neutral.500`): the section number before a page title, and the resting underline of links.
- **Pencil** (`neutral.400`): disabled text.
- **Hairline** (`neutral.300`): `color.border.default`; table row rules, note outlines, the search field, plate frames.
- **Hairline Faint** (`neutral.200`): disabled borders, pressed control fill.
- **Paper** (`neutral.0`): canvas and control background. **Paper Surface** (`neutral.50`) and **Paper Subtle** (`neutral.100`): the only tints, for surfaces and control hover.

### Danger
- **Signal Red** (`red.600`, `color.danger.default`): the danger button and the danger note's outline. Text in danger uses `red.700` (`color.fg.danger`). The red ramp is locked; themes cannot restyle danger.

### Modes
Every theme ships four modes, selected by `data-theme` (or by `prefers-color-scheme` / `prefers-contrast` when unset): **dark** inverts onto `neutral.950` with `neutral.50` text and a `neutral.100` strong border; **light-hc** pushes text and the inverse to pure black (`neutral.1000`) with `neutral.600` hairlines; **dark-hc** puts white text on black, raises the accent to `brand.300` and danger to `red.300`. Contrast is checked per mode: 4.5:1 text (7:1 in high contrast), 3:1 outlines and icons.

### Named Rules
**The One Signal Rule.** Yellow marks exactly three things on a page: the cover stripe, the primary action, and where you are. It is never a background tint, a heading color or decoration.

**The Red Means Danger Rule.** Red appears only for destructive actions and danger notes. It is never a brand accent.

**The Yellow Is Not Text Rule.** On paper, the accent as text is Yellow Ink (`brand.800`), never `brand.400`. Text on a yellow fill is Ink Deep.

## Typography

**Display Font:** Be Vietnam Pro (with system-ui, sans-serif)
**Body Font:** Be Vietnam Pro (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** A plain, open grotesque that covers Vietnamese natively, set heavy and tight for titles and quiet for reading; a mono that only ever carries figures, code and token names, like the numbering of a manual. Self-hosted, Latin, Latin Extended and Vietnamese subsets; Be Vietnam Pro 400 to 700, JetBrains Mono 400.

### Hierarchy
- **Display** (700, clamp(3rem, 9vw, 6rem), 0.95, -0.04em): the cover title on the home page only.
- **Headline** (700, 3.5rem; 2.5rem below 50em; 1.05, -0.03em): every page title, led by its section number in Number Grey at the same size, weight 400, tabular figures. Titles over 32 characters drop to clamp(1.75rem, 3vw, 2.25rem).
- **Title** (600, 1.75rem; 1.5rem below 50em; 1.2, -0.01em): section headings (h2). h3 is 1.25rem, 600.
- **Lede** (400, 1.1875rem, 1.6): the first paragraph of a doc page, to 50ch. The home (splash) page has no lede of this kind: its hero tagline is the cover's only lede, and the intro under it stays at body size.
- **Body** (400, 1rem, 1.5 in the token; the docs reading column sets 1.7): running text to 60ch, `text-wrap: pretty`.
- **Label** (600, 1rem / 0.875rem / 1.125rem, 1.4, no tracking): button labels, sidebar group names, table heads, note titles.
- **Mono number** (JetBrains Mono 400, 0.75rem): sidebar section numbers; inline code at 0.875em.

### Named Rules
**The Mono Is For Figures Rule.** JetBrains Mono sets numbers, code and token names and nothing else; no mono headings, labels or buttons.

**The Face Alone Rule.** Inline code is told apart by its face only: no pill, no fill, no padding.

**The Number Leads Rule.** A page title is preceded by its section number on the same line, wrapping with the title ("3.1 Button"). The number never stands alone above the title. ADRs and RFCs keep their own document numbers instead, and the not-found page takes its status code ("404").

## Layout

The docs use Starlight's three-column frame: a numbered sidebar, a reading column, and "On this page". The single site breakpoint is **50em** (800px), where type steps up and the nav grows from 3.75rem to 4rem.

Spacing is the locked 4px scale (`space.1` 4px to `space.16` 64px). Inside controls: 12px / 16px / 20px inline padding for sm / md / lg buttons and an 8px gap. Section openers sit 3.5rem below the previous content with 0.875rem between rule and heading; h3 opens at 2.25rem. Home principles sit in a two-column grid with a 2.5rem column gap.

Density is a second axis, selected by `data-density`: **comfortable** (controls 36 / 44 / 52px) and **compact** (28 / 36 / 44px). The 44px minimum touch target is locked; on a compact control the target extends past the visible edge rather than enlarging it.

**The Reading Column Rule.** Prose stops at 60ch, the lede at 50ch. Tables and plates may run the full column.

## Elevation & Depth

The system is flat. No surface casts a shadow; Starlight's shadows on menus, pagination and mobile controls are removed. Depth is shown by rules and outlines alone: a 1px ink rule under the header, hairlines between rows and around notes and plates, a 2px ink rule to open a section. The only box-shadow in the build is the inset 4px yellow cover stripe on the header, which is a printed band, not elevation.

**The Ruled Not Raised Rule.** If something needs separating, draw a line; never lift it.

## Shapes

Every corner is **2px** (`radius.sm`, `radius.md`, `radius.lg` all resolve to 2px): buttons, the search field, notes, plates, swatches, the sidebar highlight, code blocks (Expressive Code `borderRadius: 2px`). `radius.full` exists for themes that want pills; the base never uses it. The home principle cards drop to 0 because they are ruled entries, not boxes.

Borders come in three weights, all locked: 1px thin (controls, hairlines), 2px thick (section rules), 2px focus ring offset by 2px (`button.focus-ring.offset`, also used for the site-wide `:focus-visible` outline).

The mark is a yellow raincoat with its hood up and an ink lining, built on a 64-unit grid (`brand/README.md`); its hood is the one curved form. Only the coat may change color, and only to show theming.

## Components

### Buttons
Plain, flat, firm: a filled block or an outlined one, never a pill.
- **Shape:** squared with a 2px corner (`button.radius` → `radius.md`), 1px border.
- **Primary:** Raincoat Yellow fill, Ink Deep label, label-md 600; 44px tall, 16px inline padding (36 / 12px small, 52 / 20px large).
- **Secondary:** Paper fill with a 1px **ink** outline (`color.border.strong`), Ink label. The default variant.
- **Ghost:** no fill or border; Paper Subtle on hover.
- **Danger:** Signal Red fill, Paper label.
- **Hover / Pressed:** fills step down their ramp (yellow 400 → 500 → 600; red 600 → 700 → 800; control paper → neutral.100 → neutral.200) over 100ms `cubic-bezier(0.2, 0, 0, 1)`.
- **Focus:** a 2px ring offset 2px, ink in light, yellow in dark, black in light-hc.
- **Disabled:** Paper Subtle fill, Pencil label, Hairline Faint border.
- **Docs link buttons** use the same tokens: the home's primary action is the yellow button, its secondary link is underlined ink.

### Navigation
- **Header:** white (or canvas) with the 4px yellow stripe across the top and a 1px ink rule beneath; logo, search (1px hairline field, 2px corner, mono key hint), theme select, GitHub.
- **Sidebar:** numbered contents. Top-level groups carry a mono number (1 to 5) on a 2.25rem column and a 600 label; pages carry "2.3" sub-numbers; no tree indent lines. The current page is a solid yellow bar with Ink Deep 600 text, number included.
- **On this page:** 600 heading at small size, links in grey, the current one in ink at 600.
- **Previous / next:** hairline boxes, 2px corners, ink outline on hover.
- **Not found:** the status code leads the title as a section number does ("404 Page not found"), then a lede, the yellow primary action back to the overview, and the manual's contents: each top-level group under a 1px hairline with its mono number, and its pages numbered as the sidebar numbers them ("2.3"), running down three columns and then across.

### Notes
Ruled, untinted boxes: 1px Hairline outline, 2px corner, transparent fill, 16px / 20px padding, 600 title. Caution notes take the ink outline; danger notes take the red outline and red title. Variant shows in outline and title only.

### Specification tables
Small text, tabular figures, no fills and no zebra striping: an ink rule (`color.border.strong`) under the head row, 1px hairlines between rows, 10px vertical cell padding, values in mono that do not wrap.

### Specimen plates
A component shown in a framed panel that sets its own `data-theme` and `data-density`: canvas fill, 1px `color.border.default` frame, 2px corner, 32px / 24px padding, 12px between specimens. Every value comes from the theme's custom properties, so one plate per mode shows the component in all four.

### Token swatches and ramps
20px swatches and 56px ramp chips with a 2px corner and a faint currentColor outline; scale bars in ink with the 2px corner. Inside token tables a swatch cell stays on one line: a 1rem swatch, the hex in mono at 0.75rem, and 0.75rem end padding, so the description column keeps its width.

## Do's and Don'ts

### Do:
- **Do** take every color, size and radius from the `--rc-*` custom properties; brand themes restyle by overriding them, never by forking components.
- **Do** keep yellow to the cover stripe, the primary action and the current page (The One Signal Rule).
- **Do** open each h2 section with a 2px ink rule and divide everything else with 1px hairlines.
- **Do** number pages: the sidebar's mono number and the title's grey number must match.
- **Do** set notes as ruled boxes with no tint, and tables as plain specification tables.
- **Do** show components as specimen plates in every color mode.
- **Do** keep every corner at 2px in the base theme.
- **Do** keep text on yellow in Ink Deep, and accent text on paper in Yellow Ink (`brand.800`).

### Don't:
- **Don't** use tinted callouts, icon cards, pill-shaped inline code or rounded panels.
- **Don't** use red for anything but danger.
- **Don't** add shadows or lift surfaces; separate with rules.
- **Don't** set headings, labels or buttons in JetBrains Mono.
- **Don't** place eyebrow labels above titles; the section number leads the title on its line.
- **Don't** change spacing, border widths, the 44px minimum target, focus ring rules or contrast minimums in a theme; they are locked.
- **Don't** recolor the logo's lining, outline the mark, or set the wordmark in another face.
