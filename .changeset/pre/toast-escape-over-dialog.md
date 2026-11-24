---
"@raincoat-ui/react": patch
---

Escape in a dialog closes the dialog, also while a toast is on the screen.

- **Toast.** Escape closes a toast only while focus is in it, as the spec says. Before, a toast
  shown while a dialog was open, as from an action in the dialog, closed on an Escape pressed
  anywhere. An Escape pressed elsewhere now goes on to the page as if there were no toast.
- **Dialog, alert dialog, and Sheet.** Escape pressed in one closes it even when a toast was
  shown after it opened. Before, that Escape closed the toast and never reached the dialog.
  `onOpenChange` is called once for each Escape, and `onEscapeKeyDown` can still keep the dialog
  open.
