# @raincoat-ui/tokens

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
- b0b52c4: The token build checks the visual snapshot matrix and the text of each spec's examples.

  In this repository, `raincoat-tokens lint` now also checks `specs/snapshots.yaml`, the snapshots
  every component has, and each spec's `strings.yaml`, the text its examples show in every locale
  of the matrix. `raincoat-tokens build` generates both for the web, iOS, and Android snapshot
  tests, with the expanded pseudo-locale derived from English. The package exports `loadMatrix`,
  `resolveSnapshots`, `componentExamples`, and `expandText`, which does that derivation. Theme packs
  are not affected.

### Patch Changes

- 6de19ce: Dialog, alert dialog, and Sheet: the modal surfaces, on every platform.
  - **Dialog**: a panel centered over the screen, `sm`, `md` (the default), or `lg` wide, and
    across the window less a margin on a narrower one. It closes on Escape, the scrim, the close
    button or Cancel, and the back gesture on Android.
  - **Alert dialog**: confirms something consequential. Focus starts on Cancel; Escape and back
    mean Cancel; the scrim does nothing. Mark the confirming action `destructive` when it destroys
    something.
  - **Sheet**: rises from the `bottom` edge (the default) or slides in from the `end` edge, which
    becomes the bottom on a window less than twice the sheet's width. On iOS and Android a bottom
    sheet also closes when dragged down.
  - Every one has a title, which names it and wraps, an optional description, a body that scrolls
    between a fixed header and footer (with a hairline while content is beneath them, and the
    whole surface scrolling instead in a very short window), and a footer whose buttons stack,
    the primary first, when they do not fit. The close button is shown only when you give it a
    name. Focus moves to the title on open, or to a target you name, and back to the control that
    opened the dialog on close.
  - **React:** `Dialog`, `AlertDialog`, and `Sheet`, each with a trigger, content, header, title,
    description, body, and footer, on Radix. The dialog renders at the end of the page's body: set
    `data-theme` and `dir` on the root element, or pass `container`.
  - **SwiftUI:** `.raincoatDialog`, `.raincoatSheet`, and `.raincoatAlertDialog`. Dialogs and
    sheets are the system sheet, sized to their content; an alert dialog is the system alert.
  - **Compose:** `RaincoatDialog`, `RaincoatAlertDialog`, and `RaincoatSheet`, in a dialog window
    on Compose Foundation alone.

  For spec authors: when a part of a spec has the component's own name, the generated type of any
  part of an example is named `<Component>PartExampleProperties`.
- b718b9b: A component spec can list each platform's component under `implementations`: its source file
  and what it is called there. In this repository, `raincoat-tokens lint` fails when a listed file
  does not exist, is not in its platform's language, or does not mention the name.
- 9e8e1d7: Typography: Text, for running text and labels, and Heading, for headings, on every platform.
  - **Text** sets text in a body, label, or caption style (`body-lg`, `body-md`, `body-sm`,
    `label-lg`, `label-md`, `label-sm`, `caption`) and the `default`, `muted`, or `danger` text
    color. With `max-lines` it ends in an ellipsis after that many lines; assistive technology
    still reads all of it.
  - **Heading** takes a required `level`, from 1 to 6, which places it in the outline of the
    screen. Its look follows the level (1 `heading-xl`, 2 `heading-lg`, 3 `heading-md`, 4 to 6
    `heading-sm`) unless `variant` says otherwise. Its color is `default` or `muted`. It wraps and
    is never cut short.
  - **React:** `<Text>` renders a `p`, or a `span`, `div`, or `label` with `as`. `<Heading>`
    renders `h1` to `h6`. Both render in a Server Component.
  - **SwiftUI:** `.raincoatText(_:color:maxLines:)` on any `Text`, `Label`, or `TextField`, and
    `.raincoatHeading(level:variant:color:)`, which adds the header trait and the heading level.
    Each style grows with Dynamic Type relative to the system text style nearest its role.
  - **Compose:** `RaincoatText` and `RaincoatHeading`, on Compose Foundation's `BasicText`.
    `RaincoatHeading` sets heading semantics; Android has no heading levels.

  For spec authors: a component spec can have parts, each with properties of its own, and a
  property can be a whole number with a range. A default can follow another property.

## 0.1.0-next.4

### Patch Changes

- The README's install command names this release. In 0.1.0-next.3 it named 0.1.0-next.2, a
  version `@raincoat-ui/tokens` never had.

## 0.1.0-next.3

### Minor Changes

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
