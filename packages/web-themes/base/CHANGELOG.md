# @raincoat-ui/theme-base

## 0.1.0-next.5

### Minor Changes

- eb11244: The tokens of the v1 components: Typography, Input, Card, Dialog and Sheet, Tabs, and Toast.
  - **Text styles.** `type.heading.xl`, `.lg`, `.md`, and `.sm` (32, 24, 20, and 16px),
    `type.body.lg` (18px), and `type.caption` (12px).
  - **Color roles.** `color.bg.raised` for cards, dialogs, sheets, and toasts; `color.bg.scrim`, the
    translucent veil behind a dialog; `color.border.control` for the outline of a text field;
    `color.border.danger` for a field in error; and `color.border.selected` for the selected tab.
    In the base, a raised surface is the color of the page.
  - **Shadows.** `shadow.raised` and `shadow.overlay`. Both are `shadow.none` in the base, which
    draws nothing. On iOS and Android a shadow is a `TokenShadow`; draw its `visibleLayers`.
  - **Sizes.** `size.panel.sm`, `.md`, and `.lg` (400, 560, and 800px), the widths of dialogs,
    sheets, and toasts.
  - **Component tokens** for `input`, `card`, `dialog`, `sheet`, `tabs`, and `toast`.

  Text and outline colors that were checked against the page are now also checked against
  `color.bg.raised`, and `color.fg.muted` against the fill of a neutral control at rest and hovered.

  For theme authors: a theme may now give `shadow.raised` and `shadow.overlay` a value, composed of
  primitive tokens, and may override `card.border.default`. The token build refuses a text style
  smaller than `font.size.12`.

## 0.1.0-next.4

No changes in this release.

## 0.1.0-next.3

### Patch Changes

- 5f46e98: Themes are directories, and the token build is published.

  A theme is `themes/<id>/`: a `theme.json`, a `brand.md`, and files that give new values to the
  tokens the base marks overridable. The token build checks each theme with every rule of the base,
  checks its contrast in every mode, and generates its packages on every platform:
  `@raincoat-ui/theme-<id>` on npm, `io.github.raincoat-ui:theme-<id>` in the Maven repository, and
  the Swift product `RaincoatTheme<Id>`. Each installs on its own, with only the token types.

  `@raincoat-ui/tokens` is now published, with its command line `raincoat-tokens`. Run in a
  repository of your own, it builds the themes there into a theme pack: an npm package per theme, a
  Swift package, and a Gradle build, each depending on Raincoat's packages of the same version. Use
  it for brands that must not be public.

## 0.1.0-next.2

### Minor Changes

- ad13995: The base theme is quieter and sharper: neutral greys lose their blue cast, every radius is 2px,
  button labels are semibold, and secondary buttons have an ink outline. Brand themes that set
  their own radii, label weights, neutrals, or `color.border.strong` look the same as before.

## 0.1.0-next.1

No changes in this release.

## 0.1.0-next.0

### Minor Changes

- 7b10fa2: The first prerelease. It contains the base theme in four color modes and two densities, and
  the Button for React, SwiftUI, and Jetpack Compose, all three built from one token source and
  one component spec.
