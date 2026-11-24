---
"@raincoat-ui/react": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
"@raincoat-ui/tokens": patch
---

Typography: Text, for running text and labels, and Heading, for headings, on every platform.

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
