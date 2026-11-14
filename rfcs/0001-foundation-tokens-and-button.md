# RFC 0001: Foundation tokens and Button

- Status: accepted
- Kind: component
- Proposed: 2026-11-14
- Decided: 2026-11-14

## Summary

Defines the first token set (the three tiers, four color modes, two densities) and the first
component, Button, which exists to prove that one token source can drive every platform.

## Problem

Nothing can be built until there is a token vocabulary, and a vocabulary designed without a
component to consume it tends to name things nobody needs. Button is the smallest component that
touches color, type, spacing, shape, motion, focus, and touch targets at once.

## Proposal

### Tokens

| Tier                            | Holds                                                             | May reference        |
| ------------------------------- | ----------------------------------------------------------------- | -------------------- |
| Primitive (`tokens/primitive/`) | Raw values: color ramps, the size scale, font values, durations   | Nothing              |
| Semantic (`tokens/semantic/`)   | Roles: `color.bg.canvas`, `space.4`, `radius.md`, `type.label.md` | Primitives only      |
| Component (`tokens/component/`) | One component's parts: `button.primary.bg.hover`                  | Semantic tokens only |

- **Color modes**: `light`, `dark`, `light-hc`, `dark-hc`. Each is one file,
  `tokens/semantic/color.<mode>.tokens.json`, and all four define the same roles. The
  high-contrast modes hold text to 7:1 and control outlines to 3:1.
- **Densities**: `comfortable` (default) and `compact` change control heights only.
- **Base brand**: slate neutrals with a raincoat-yellow accent. Text on the accent is dark, so
  the base brand exercises the `on-accent` role that a blue or green brand would hide.
- **Contrast is declared, then checked.** A text, border, or focus color names the backgrounds
  it is drawn on and the requirement that applies. CI computes every pair in every mode.
- **Themes** may replace tokens flagged `overridable`: the brand and neutral ramps, font
  families and weights, radii, and every semantic color role. Spacing, border widths, and the
  minimum touch target are locked.

### Button

| Aspect   | Decision                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------- |
| Variants | `primary`, `secondary`, `ghost`, `danger`                                                               |
| Sizes    | `sm`, `md`, `lg`, plus a full-width option                                                              |
| States   | rest, hover, focus-visible, pressed, disabled, loading                                                  |
| Content  | A label, with an optional leading or trailing icon. Icon-only buttons must supply an accessible name    |
| Label    | Centered. It wraps rather than truncates, so the size tokens are minimum heights                        |
| Loading  | A spinner replaces the leading icon, the label stays, activation is blocked, and the button keeps focus |
| Disabled | Not interactive and not focusable. Exempt from contrast requirements                                    |

Tokens: `tokens/component/button.tokens.json`.

Usage rules that will go into the guidelines:

- At most one primary button in a view.
- Use danger only for destructive actions, and say what is destroyed: "Delete page", not
  "Delete".
- Labels start with a verb and use sentence case.

## Prior art

Read from each system's public documentation on 2026-11-14.

| Question      | IBM Carbon                                    | Adobe Spectrum                                                         | Google Material                                          | GitLab Pajamas                                                     | Raincoat                                                          |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Variants      | Primary, secondary, tertiary, ghost, danger   | Accent, primary, secondary, negative, each as fill or outline          | Filled, filled tonal, elevated, outlined, text           | Primary and tertiary categories; default, confirm, danger variants | Primary, secondary, ghost, danger                                 |
| Sizes         | Seven, from extra small to 2XL                | Not read                                                               | Not read                                                 | Small, medium, and full-width "block"                              | Small, medium, large, and full width                              |
| Loading       | Inline loading; the button is disabled        | A spinner replaces label and icon after one second; events are blocked | Not read                                                 | A spinner; the action is disabled                                  | Spinner beside a label that stays; activation blocked; focus kept |
| Disabled      | Not read                                      | `isDisabled`                                                           | `enabled = false`                                        | Kept focusable, with an explanation                                | Not focusable                                                     |
| Keyboard      | Enter or Space                                | Enter or Space                                                         | Not read                                                 | Not read                                                           | Enter or Space                                                    |
| Icons         | To the right of the label; icon-only centered | Icon with a text sibling; icon-only needs `aria-label`                 | Not read                                                 | Icon-only needs `aria-label`; decorative icons hidden              | Leading or trailing; icon-only needs an accessible name           |
| Emphasis rule | One primary button per screen                 | Not read                                                               | Filled for the primary action; outlined medium; text low | By hierarchy; too many danger buttons break it                     | At most one primary per view                                      |
| Right-to-left | The button mirrors                            | Logical `start` and `end` recommended                                  | Not read                                                 | Not read                                                           | Mirrors through logical properties                                |

Where the systems disagree, and which way Raincoat goes:

- **Label alignment.** Carbon left-aligns labels even in wide buttons. Raincoat centers them,
  which is the convention on iOS and Android and so keeps the three platforms alike.
- **Loading.** Spectrum hides the label behind a spinner. Raincoat keeps the label, so the
  button's width does not change and the action stays readable in every language.
- **Disabled.** Pajamas keeps disabled buttons focusable so they can explain themselves.
  Raincoat v1 uses the platform's native disabled behavior; a focusable disabled state can be
  proposed later with the Tooltip component it depends on.
- **Number of variants.** Material's five types and Spectrum's fill and outline matrix give
  designers more ways to be inconsistent. Four variants cover high, medium, and low emphasis
  plus destruction.

## Accessibility

| Requirement                                                                   | How it is tested                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Role and name: a native button; icon-only buttons require a name              | Web: axe and Testing Library. iOS: accessibility audit. Android: semantics tests |
| Keyboard: Enter and Space activate; disabled buttons leave the tab order      | Web: Playwright keyboard tests                                                   |
| Focus: a 2px ring, offset from the edge, at 3:1 against the surface behind it | Token contrast check; focus snapshots                                            |
| Contrast: label on fill at 4.5:1 in every state, 7:1 in high-contrast modes   | Token contrast check                                                             |
| Target: at least 44pt on iOS and 48dp on Android, whatever the visible height | Target-size tests on each platform                                               |
| Loading is announced and does not move focus                                  | Interaction tests on each platform                                               |
| Reduced motion: color transitions are removed                                 | Snapshot with the reduced-motion setting                                         |

## Internationalization

- Icon and label swap sides in right-to-left layouts; nothing uses left or right.
- The label wraps when it does not fit. Snapshots cover an expanded pseudo-locale.
- Label line height is 1.4, the lowest value that clears stacked Vietnamese diacritics.
- Chinese, Japanese, and Korean labels are covered by snapshots in each locale.

## Platform notes

- **Web**: a native `<button>` from shadcn/ui's Button, restyled through these tokens.
- **iOS**: a SwiftUI `ButtonStyle`, so it works with any `Button` initializer.
- **Android**: a composable with the button role and Material's minimum interactive size.

Hover exists only where a pointer does. On touch platforms the pressed state carries the
feedback.

## Migration

None. This is the first token set and the first component.

## Alternatives considered

- **A blue base brand.** Familiar, but white text on blue hides whether `on-accent` is wired
  correctly. Yellow makes a mistake visible immediately.
- **Opacity for the disabled state.** One token instead of three, but the result depends on what
  is behind the button. Explicit disabled colors are predictable in every mode.
- **Defining every v1 component's tokens now.** Each component's tokens arrive with its own
  RFC, so no token exists without a consumer.
