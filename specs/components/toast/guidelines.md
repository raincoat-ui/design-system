# Toast guidelines

## When to use

Use a toast to confirm an action whose result is not visible on the screen: an item archived, a
link copied, a change saved in the background. It does not take focus or block the screen, so
the person can go on with what they were doing.

Use a toast only for something people can also see or find elsewhere. A toast is gone in seconds
and cannot be read again.

## When not to use

- For an error that needs action. Put the message next to the thing that failed, or in a
  dialog, where it stays.
- For anything that needs a decision. Use a dialog.
- For a message longer than one sentence.
- For an action whose result is already visible on the screen.

## Writing the message

- Say what happened in a short sentence: "Address deleted", not "Success!".
- Name the thing, not the system: "Link copied", not "Copied to clipboard successfully".
- Use sentence case.

## The action

- Offer an action only to undo or to go to what was made.
- Label it with one or two words: "Undo", "View".
- A toast with an action stays until the action is used or the toast is closed, so nobody loses
  an Undo to a timer. It always has a close button.
- Give the close button a name in the app's language, such as "Close". It shows only a cross.

## One look

There is one toast: no info, success, warning, or error variants. Color does not carry a status,
and red is kept for danger. A toast reports something that has already happened.

## Timing and order

- A toast without an action closes after 6 seconds. The timer pauses while a pointer is over it,
  while it has focus, and while the app is in the background. On Android, the person's
  accessibility timeout replaces the 6 seconds when it is longer.
- One toast is shown at a time. Others wait in a queue and follow in order. Do not show a toast
  for every step of a long task; show one when it is done.

## Placement

A toast sits at the bottom center of the window, above the on-screen keyboard. Tell the toast
host about any bar the app keeps at the bottom of the screen, so the toast sits above it:

- On the web, give `ToastProvider` the bar's height as `bottomInset`.
- On iOS, declare the bar with `safeAreaInset(edge: .bottom)` outside the host, or put the host
  inside the tab.
- On Android, place `RaincoatToastHost` above the bar, as you would a snackbar host.

## Do and don't

| Do                                     | Don't                                           |
| -------------------------------------- | ----------------------------------------------- |
| "Message archived", with "Undo"        | "Success! Your message was archived."           |
| One toast when a batch of work is done | A toast for each item of the batch              |
| Show a failure where it can be fixed   | Show "Upload failed" in a toast that disappears |
| Let a long message wrap                | Cut a message short with an ellipsis            |
