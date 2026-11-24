---
"@raincoat-ui/react": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
---

The Toast: a short message near the bottom of the screen that says something has happened, such
as "Message archived", optionally with one action such as Undo.

- **React.** Put `ToastProvider` around the app, with a `label` for the region that holds the
  toasts, such as "Notifications". `useToast().show({ message })` shows a toast from anywhere
  inside it; `show({ message, action: { label, onClick }, closeLabel })` shows one with an action.
  F8 moves focus to the toast and back. `bottomInset` keeps the toasts above a bar of your own.
  `Toast` draws a toast standing still, for documentation and tests.
- **SwiftUI.** `raincoatToastHost()` puts a host on a screen, and the `showRaincoatToast`
  environment action shows a `RaincoatToast` from anywhere inside it.
  `raincoatShadow(_:in:fill:)` fills a shape behind a view and draws a token shadow with it.
- **Compose.** `RaincoatToastHost` shows the toasts of a `RaincoatToastHostState`, whose `show`
  suspends until the toast closes and says how. `RaincoatToast` draws a toast on its own.
  `Modifier.raincoatShadow(shadow, shape, fill)` fills a shape and draws a token shadow with it.

On every platform one toast is shown at a time, and others wait in order. A toast never takes
focus, and its message is announced politely. Without an action, a toast closes after 6 seconds;
the time stops while a pointer is over it, while it has focus, and while the app is in the
background, and on Android the person's accessibility timeout replaces it when longer. A toast
with an action stays until the action is used or the toast is closed, so it must have a named
close button. A swipe down closes a toast. The packages ship no text for it: every word comes
from the app.
