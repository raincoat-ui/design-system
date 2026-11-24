# @raincoat-ui/theme-ink

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

### Minor Changes

- 2e9c446: A second theme, Ink: black and white only, with red kept for danger. The primary button is a
  black block with a white label, and white with a black label at night, on a pure black canvas.
  Every corner is square, and labels are set in Archivo at medium weight. It ships as
  `@raincoat-ui/theme-ink`, `io.github.raincoat-ui:theme-ink`, and the Swift product
  `RaincoatThemeInk`.
