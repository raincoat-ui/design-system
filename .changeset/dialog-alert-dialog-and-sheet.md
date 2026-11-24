---
"@raincoat-ui/react": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
"@raincoat-ui/tokens": patch
---

Dialog, alert dialog, and Sheet: the modal surfaces, on every platform.

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
