# Dialog guidelines

## When to use

Use a dialog for a task that must be finished or abandoned before going on: renaming a file,
choosing one of a few options, filling in a few fields. While it is open, the screen behind is
covered and cannot be used.

- If people need the screen behind to do the task, use a sheet, or put the task in the page.
- Do not use a dialog for a message that needs no decision. A toast or an inline message
  interrupts less.
- Do not open a dialog from a dialog. Replace the content, or close the first.

## Choosing a kind

| Kind         | Use it for                                                         | Avoid                                        |
| ------------ | ------------------------------------------------------------------ | -------------------------------------------- |
| Dialog       | A short task: rename, choose, fill in a few fields                 | Long forms, or tasks that need the screen    |
| Alert dialog | Confirming something consequential or irreversible, such as delete | Questions that are not about a consequence   |
| Sheet        | A longer task, or one that keeps the screen behind in view         | A confirmation: use an alert dialog for that |

Choose a dialog's size for its content: `sm` for a sentence or two and a few buttons, `md` for a
short form, `lg` for wide content such as a table. A sheet comes from the bottom unless it holds
something people compare with the screen, such as filters for a list: then from the end edge.

On iOS every dialog and sheet is the system sheet, and an alert dialog is the system alert,
which looks like iOS rather than like your theme. That is what people on iOS recognize, and it
follows their text size, bold text, and contrast settings.

## Writing it

- Give every dialog a title that names it, in sentence case, without a full stop: "Rename file".
- In an alert dialog, the title says what will happen, as a question: "Delete this address?".
  Its confirming button repeats the verb: "Delete address", not "Yes" or "OK".
- Use the description for one sentence about the task or its consequence. Do not repeat the
  title.
- Keep the primary action last in the footer, and put Cancel before it.

## Giving a way out

Every dialog and sheet has one visible way out: a Cancel button in the footer, or a close button
at the end of the header. Not both: two buttons that mean the same make people wonder which one
keeps their work.

- Use Cancel when the footer has actions. Use the close button when it has none, as in a dialog
  that only shows information.
- Give the close button a name that says what it does, such as "Close". It shows only a cross.
- Escape closes every dialog. So does a click or tap on the scrim, except for an alert dialog:
  there a stray tap must not count as an answer.
- To keep a dialog open while it holds unsaved changes, refuse to close it and ask first. Every
  platform lets the app refuse.

## Focus

Focus moves to the title when a dialog opens, so that a screen reader starts at the top and a
keyboard user is one Tab from the first control. In a short form, give the first field focus
instead. An alert dialog starts on Cancel, never on the destructive action.

When the dialog closes, focus returns to the control that opened it. If that control no longer
exists, as after deleting the row it was in, name where focus goes.

## Layout

- The header and the footer stay in place, and the body scrolls between them. A hairline shows
  under the header and above the footer while content is beneath them.
- When the window is too short for the header, the footer, and three lines of the body, as at
  400% zoom, the whole dialog scrolls instead.
- Footer buttons stack when they do not fit in a row, with the primary action on top. Let them:
  do not shorten a translated label to keep them side by side.

## Do and don't

| Do                                                     | Don't                                 |
| ------------------------------------------------------ | ------------------------------------- |
| Name the dialog in its title                           | Title it "Are you sure?"              |
| Repeat the verb on an alert dialog's confirming button | Label it "Yes", "OK", or "Confirm"    |
| Give one way out: Cancel, or the close button          | Show the close button beside a Cancel |
| Let a long title wrap                                  | Truncate a title with an ellipsis     |
| Use a sheet when people need the screen behind         | Open a dialog over a dialog           |
| Close a sheet with a button as well as by dragging     | Make dragging the only way out        |
