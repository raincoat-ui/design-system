# RFC 0002: A quieter, sharper base theme

- Status: accepted
- Kind: token
- Proposed: 2026-11-19
- Decided: 2026-11-20

## Summary

Changes the values of the base theme so it reads like a printed standards manual: near-neutral
ink instead of blue-grey slate, one 2px corner everywhere, semibold labels, and an ink outline on
secondary controls. No token is added, renamed, or removed, and nothing a theme may override
changes.

## Problem

The base theme is what a developer sees before a brand theme exists, and what the documentation
shows. Its slate greys carry a blue cast that competes with any brand's own color, its 8px and
12px radii give it a soft, generic look, and the secondary button's mid-grey outline (`neutral.500`)
reads as disabled next to a yellow primary. The base should be the plainest correct version of
every component, so that a brand theme is the only thing that adds character.

## Proposal

### Primitive values (no RFC needed, listed for completeness)

The neutral ramp keeps its lightness steps and hue and drops to about a third of its chroma, so
contrast ratios are practically unchanged. Its descriptions say "ink" instead of "slate".

| Step | Before              | After                |
| ---- | ------------------- | -------------------- |
| 50   | `#f9fafc` (C 0.003) | `#fafafb` (C 0.001)  |
| 100  | `#f1f4f7` (C 0.005) | `#f3f3f4` (C 0.0017) |
| 200  | `#e1e5ea` (C 0.008) | `#e3e5e6` (C 0.0028) |
| 300  | `#ccd1d9` (C 0.012) | `#cfd1d4` (C 0.0042) |
| 400  | `#9ea5af` (C 0.016) | `#a2a5a8` (C 0.0056) |
| 500  | `#737b85` (C 0.018) | `#787a7e` (C 0.0063) |
| 600  | `#575e68` (C 0.018) | `#5b5e61` (C 0.0063) |
| 700  | `#3f464f` (C 0.018) | `#434548` (C 0.0063) |
| 800  | `#282e36` (C 0.016) | `#2c2e31` (C 0.0056) |
| 900  | `#161b21` (C 0.014) | `#191b1d` (C 0.0049) |
| 950  | `#0a0e12` (C 0.012) | `#0c0d0f` (C 0.0042) |

### Semantic values

| Token                                    | Before                 | After                    | Themes may override? |
| ---------------------------------------- | ---------------------- | ------------------------ | -------------------- |
| `radius.sm`                              | `{dimension.4}`        | `{dimension.2}`          | Yes (unchanged)      |
| `radius.md`                              | `{dimension.8}`        | `{dimension.2}`          | Yes (unchanged)      |
| `radius.lg`                              | `{dimension.12}`       | `{dimension.2}`          | Yes (unchanged)      |
| `type.label.sm`, `.md`, `.lg` fontWeight | `{font.weight.medium}` | `{font.weight.semibold}` | Yes (unchanged)      |
| `color.border.strong` (light)            | `{color.neutral.500}`  | `{color.neutral.900}`    | Yes (unchanged)      |
| `color.border.strong` (dark)             | `{color.neutral.500}`  | `{color.neutral.100}`    | Yes (unchanged)      |

The high-contrast modes already map `color.border.strong` to `neutral.900` and `neutral.100`, so
all four modes now agree. The three radii keep their names so that a brand theme can still give
small, medium, and large surfaces different corners.

## Prior art

Recorded from each system's public documentation; not re-read for this RFC, so check a row
before relying on it.

| Question       | IBM Carbon                  | Google Material 3                | Adobe Spectrum 2 | Raincoat base, proposed       |
| -------------- | --------------------------- | -------------------------------- | ---------------- | ----------------------------- |
| Button corners | Square                      | Fully rounded                    | Fully rounded    | 2px                           |
| Neutral greys  | Cool grey, low chroma       | Tinted from the brand seed color | Neutral greys    | Near-neutral ink, low chroma  |
| Outline button | Strong outline on secondary | Mid-tone outline                 | Not checked      | Ink outline, same as the text |

Raincoat sits with Carbon: the base is a neutral instrument, and any roundness comes from a brand.

## Accessibility

Every declared color pair still passes in all four color modes (`pnpm tokens:contrast`: 192
pairs). The secondary button's outline rises from about 4.4:1 to about 17:1 against the canvas in
light mode. Focus rings, minimum targets, and spacing are untouched.

## Internationalization

Semibold labels were checked for Vietnamese stacked diacritics in Be Vietnam Pro, which ships
600 with full Vietnamese coverage. No layout metric changes.

## Platform notes

All three platforms read the values from generated code, so no platform code changes.

## Migration

Nothing breaks at the API level. Apps on the base theme see sharper corners, heavier button
labels, an ink outline on secondary buttons, and slightly cooler-to-neutral greys. A brand theme
that sets its own radii, label weights, neutrals, or `color.border.strong` is unaffected.

## Alternatives considered

- **Zero radius.** Truest to the print source, but hard corners alias on low-density Android
  screens; 2px reads as square and draws cleanly.
- **Keeping the slate tint.** The tint is a brand decision, and the base should not make one.
- **A thicker secondary border (2px).** Border widths are locked below the theme layer; changing
  them would affect every brand. Ink color at 1px gives the same weight.
