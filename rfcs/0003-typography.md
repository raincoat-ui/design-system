# RFC 0003: Typography

- Status: proposed
- Kind: component
- Proposed: 2026-11-24
- Decided:

## Summary

Adds the text styles an app screen needs beyond labels and body text (four headings, a large
body, and a caption) and a Typography component that sets text in them. The look of a heading is
set apart from its level, so an app can build a correct outline without changing how a screen
looks. It is for every app developer, and it comes first among the milestone 3 components because
Input, Card, Dialog/Sheet, Tabs, and Toast all set their text in these styles.

## Problem

The token source has five composed text styles: `type.body.md`, `type.body.sm`, and
`type.label.sm|md|lg`. A screen title, the title of a dialog, and the title of a card have no
style, so each app picks font sizes and weights by hand. Those are the values a theme should
control, and the values the Vietnamese and CJK checks should cover. Nor is there a way to mark a
heading for assistive technology on all three platforms: on the web a developer writes `<h2>`,
on iOS `.accessibilityAddTraits(.isHeader)`, and on Android `semantics { heading() }`, and
each is easy to forget.

A settings screen shows the gap: a 32px screen title, 20px section titles, and a 12px "Last
synced 2 minutes ago" under a row. Today all three are raw values in the app.

## Proposal

### Text styles

New semantic tokens, beside the existing ones. All are `typography` tokens built from
primitives, like `type.body.md`.

| Token              | Size     | Weight   | Line height | Use                                                              |
| ------------------ | -------- | -------- | ----------- | ---------------------------------------------------------------- |
| `type.heading.xl`  | 32 (new) | semibold | 1.4         | The title of a screen. Once per screen                           |
| `type.heading.lg`  | 24       | semibold | 1.4         | Section titles on a screen                                       |
| `type.heading.md`  | 20       | semibold | 1.4         | Dialog and sheet titles, subsection titles                       |
| `type.heading.sm`  | 16       | semibold | 1.4         | Card titles, group titles in lists                               |
| `type.body.lg`     | 18       | regular  | 1.5         | An introductory paragraph                                        |
| `type.body.md`     | 16       | regular  | 1.5         | Unchanged                                                        |
| `type.body.sm`     | 14       | regular  | 1.5         | Unchanged                                                        |
| `type.label.sm–lg` | 14–18    | semibold | 1.4         | Unchanged                                                        |
| `type.caption`     | 12       | regular  | 1.5         | Timestamps, counts, and other short secondary facts. Never prose |

- **One new primitive**, `font.size.32` (2rem). Primitives need no RFC; it is listed so the scale
  reads whole. 12px stays the smallest size.
- **Headings use 1.4**, the value RFC 0001 found to be the lowest that clears stacked Vietnamese
  diacritics ("Ở", "Ẫ") in a label. Display type usually sits tighter, but none of the reference
  systems publishes a value for Vietnamese. A tighter heading line height can be proposed once the
  Vietnamese snapshots show that two lines of it do not collide.
- **No responsive sizes.** Sizes are fixed and grow with the person's text size setting on every
  platform. A heading that shrinks at narrow widths in one app and not another is the kind of
  difference a theme should not have to manage.
- **`type.heading.sm` and `type.label.md` share values in the base.** They are separate roles:
  one is a heading that assistive technology can jump to, the other names a control. A theme
  changes their family and weight together, through the same primitives.
- **Themes** keep what they may override today: font families and weights. Sizes and line
  heights stay locked, as `font.size.*` and `font.line-height.*` are now.

### Component

Two parts with one spec: **Text** for running text and labels, and **Heading** for headings.

| Aspect       | Text                                                                                     | Heading                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`    | `body-lg`, `body-md` (default), `body-sm`, `label-lg`, `label-md`, `label-sm`, `caption` | `heading-xl`, `heading-lg`, `heading-md`, `heading-sm`                                                                                         |
| `level`      | None                                                                                     | 1 to 6. Required                                                                                                                               |
| Default look | `body-md`                                                                                | Follows the level: 1 is `heading-xl`, 2 `heading-lg`, 3 `heading-md`, 4 to 6 `heading-sm`. Set `variant` to change the look and keep the level |
| `color`      | `default`, `muted`, `danger`                                                             | `default`, `muted`                                                                                                                             |
| `max-lines`  | Optional. Text beyond it ends in an ellipsis                                             | Not offered: a heading wraps                                                                                                                   |

- **The level is required and the look is not.** An outline is wrong when a heading's level is
  chosen for its size. Asking for the level makes the author decide it, and the look follows
  unless they say otherwise.
- **Color** uses the text roles that exist: `color.fg.default`, `color.fg.muted`, and
  `color.fg.danger`. Accent text and colored headings are left out; in the base the accent is a
  signal, not a text color.
- **Truncation** keeps the whole text available to assistive technology on every platform, and
  each platform's tests check that it does.
- **No component tokens.** The component's only values are the text styles, so a component tier
  would repeat them.

Usage rules that will go into the guidelines:

- Choose a heading's level for its place in the outline, then its look if the default does not
  fit. Do not skip levels.
- Set emphasis in semibold, not italics: Chinese, Japanese, and Korean faces have no italics.
- Keep running text under about 70 characters a line.
- Do not truncate headings, labels, or anything a person must read to decide. Truncate only text
  repeated elsewhere, such as a preview of a message.

## Prior art

Read from each system's public documentation on 2026-11-24. Material is read from the Jetpack
Compose and Material Web documentation, because m3.material.io shows nothing without
JavaScript.

| Question                                    | IBM Carbon                                                                                         | Adobe Spectrum                                                                                         | Google Material                                                                     | AWS Cloudscape                                                                          | Raincoat                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Parts (anatomy)                             | Tokens for code, label, helper text, body, headings 01 to 07, and fluid headings and displays      | Heading, title, body, detail, code, and more, in t-shirt sizes; 18 font sizes from 10 to 73px          | 15 styles: display, headline, title, body, and label, each large, medium, and small | 11 styles: headings from 24/30 to 14/18, body 14/20 and 12/16, code, and display 42/48  | Four headings, three body sizes, three labels, and a caption                             |
| Variants and sizes                          | A productive set (14px base) and an expressive set (16px base); fluid styles change at breakpoints | `Heading` takes `level` 1 to 6, default 3, and is styled by its container                              | The look is a style passed to `Text`; heading meaning is a separate modifier        | `Box` sets tag and style together; `tagOverride` and `headingTagOverride` separate them | `level` required, `variant` defaults from it and can be changed                          |
| States                                      | Light, regular, and semibold; semibold not for long text                                           | Weights per role; emphasis is italic, or heavier in CJK                                                | `maxLines` with an ellipsis                                                         | Color roles for label, secondary body, and status text                                  | Default, muted, and danger color; `max-lines` on Text only                               |
| Keyboard behaviour                          | Not applicable                                                                                     | Not applicable                                                                                         | Not applicable                                                                      | Not applicable                                                                          | Not applicable                                                                           |
| Screen-reader role, name, and announcements | Headings are one of the most common ways to move through a page                                    | `level` renders `h1` to `h6`                                                                           | `semantics { heading() }`, with no level                                            | Use headings for hierarchy, not appearance; one `h1` per page                           | Heading level on the web and iOS; heading, without level, on Android                     |
| Right-to-left and long-text behaviour       | `Text` sets `dir`, default `auto`                                                                  | CJK line height 150%, 170% for body; supports Dynamic Type and Android `sp`; lines about 70 characters | Alignment follows the script; CJK line-breaking options; font scaling is non-linear | Do not mirror untranslated text, code, numbers, or email addresses; nothing under 12px  | Start alignment; CJK line breaking per language; 12px minimum; scaling on every platform |

Where the systems disagree, and which way Raincoat goes:

- **Level and look.** Cloudscape ties the tag to the style with overrides, Carbon derives the
  level from nesting, React Spectrum takes a level and styles it by context, and Compose has no
  levels at all. Raincoat asks for the level and derives the look, which keeps the outline
  correct by default while leaving the look free.
- **Responsive sizes.** Carbon's fluid sets change at breakpoints, and Carbon itself says not to
  use them inside a container. Material and Spectrum vary some sizes by device. Raincoat keeps
  sizes fixed and lets the text size setting do the scaling, as Fluent and Cloudscape show.
- **Smallest size.** Spectrum has 10px and 11px sizes, Material 11, and Carbon and Cloudscape
  stop at 12; Cloudscape forbids anything smaller. Raincoat stops at 12.
- **Emphasis.** Carbon and Spectrum use italics, with Spectrum switching to weight for CJK.
  Raincoat uses weight in every script, so emphasis does not change with the language.
- **Scripts.** Only Spectrum gives CJK line heights, and none of the systems read covers
  Vietnamese. Raincoat's 1.5 for body text matches Spectrum's CJK default, and its 1.4 floor
  comes from its own Vietnamese finding.

## Accessibility

| Requirement                                                                                                                                                       | How it is tested                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A Heading is a heading to assistive technology, with its level where the platform has levels                                                                      | Web: the element is `h1` to `h6` and axe passes. iOS: header trait and heading level in UI tests. Android: heading semantics               |
| Text contrast: 4.5:1 for every color in standard modes, 7:1 in high contrast; headings of 24px and over count as large text but are held to the text ratio anyway | Token contrast check                                                                                                                       |
| Text grows with the person's setting: browser font size and zoom, Dynamic Type, Android font scale                                                                | Web: 200% browser font size. iOS: the largest accessibility size. Android: font scale 2.0. Each checks that nothing is clipped or overlaps |
| Truncated text is read in full                                                                                                                                    | Web: the accessible name holds the full string. iOS and Android: the accessibility label or text holds it                                  |
| No text below 12px                                                                                                                                                | A linter rule, added with this RFC, refuses a text style smaller than `font.size.12`                                                       |

On iOS, each style grows with the system text style nearest its role (`heading-xl` with `.largeTitle`,
`heading-lg` with `.title2`, `heading-md` with `.title3`, `heading-sm` with `.headline`, body
and labels with `.body`, and `caption` with `.caption`), so large headings grow less than body text, as
the system's own do. Android's non-linear font scaling does the same.

## Internationalization

- **Alignment.** Text aligns to the start edge. Nothing uses left or right.
- **Direction of people's text.** Text that comes from people, such as names and messages, takes
  its direction from its first strong character: `dir="auto"` on the web, and the platforms'
  default paragraph direction on iOS and Android. The spec examples include an Arabic name in an
  English sentence.
- **Vietnamese.** Be Vietnam Pro covers it. Snapshots set two-line headings and body text with
  stacked diacritics, in both precomposed (NFC) and decomposed (NFD) form, because input methods
  produce both.
- **Chinese, Japanese, and Korean** use system fonts. Lines break by each language's rules:
  strict breaking for Japanese, and whole words for Korean, which separates words with spaces.
  Each locale has a snapshot.
- **Expansion.** Snapshots include a pseudo-locale about 40% longer, to show that nothing is
  truncated that should wrap.

## Platform notes

- **Web.** `Text` renders `p` by default and takes `as` for `span`, `div`, or `label`. `Heading`
  renders `h1` to `h6` from `level`. Both are Server Components: they hold no state. Headings use
  `text-wrap: balance` where the browser supports it.
- **iOS.** A view modifier, `.raincoatText(_:)`, applies a style to any `Text`, `Label`, or
  `TextField`, through the same line-height handling as the Button's label
  (`Typography.swift`). `.raincoatHeading(level:)` applies a heading style and adds the header
  trait and `accessibilityHeading` level.
- **Android.** `RaincoatText` and `RaincoatHeading`, built on Compose Foundation's `BasicText`.
  Android has no heading levels: `RaincoatHeading` takes `level` so that code reads the same on
  every platform, and sets `heading()` semantics.

## Migration

None. The existing text styles keep their names and values.

## Alternatives considered

- **Material's 15 styles.** Covers marketing displays an app screen rarely needs. Four heading
  sizes are enough for a screen, a section, a dialog, and a card.
- **Tighter heading line heights now.** Looks better in Latin, and may collide in Vietnamese.
  The snapshots will say, and a later RFC can tighten them.
- **A bold weight for headings.** A theme can already make semibold heavier. A separate weight
  would let headings and labels differ, which no theme has asked for yet.
- **A code style.** `font.family.mono` exists, but no v1 component shows code. It can arrive with
  one that does.
- **Deriving the level from nesting, as Carbon does.** Works on the web, but SwiftUI and Compose
  have no equivalent of nested sections, so the three platforms would behave differently.
