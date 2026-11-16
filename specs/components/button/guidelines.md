# Button guidelines

## When to use

Use a button for an action: saving, submitting, opening a dialog, deleting. To take someone to
another page, use a link.

## Choosing a variant

| Variant   | Use it for                                                           | Avoid                                     |
| --------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Primary   | The one action a view exists for                                     | More than one in the same view            |
| Secondary | Alternatives to the primary action, such as "Cancel"                 | Using it for the main action              |
| Ghost     | Low-emphasis actions, often repeated, such as row actions in a table | Important actions that must not be missed |
| Danger    | Destroying something, such as deleting a project                     | Actions that can be undone trivially      |

## Writing the label

- Start with a verb: "Save changes", "Add member".
- Use sentence case, not title case.
- Say what is destroyed on a danger button: "Delete page", not "Delete".
- Do not end with a full stop.
- Keep it short, but never abbreviate to fit. The label wraps when it has to.

## Icons

- An icon beside a label is decoration; the label carries the meaning.
- A button with only an icon must be given an accessible name that says what it does.

## Loading and disabled

- Use loading while an action the person started is in progress. The label stays visible so
  the button's width and meaning do not change.
- Prefer leaving a button enabled and explaining what is missing when it is activated. A disabled
  button cannot say why it is disabled.

## Spacing

A button takes the room it shows. A button shorter or narrower than the minimum touch target
still takes touches across that minimum, so its touch area reaches a few pixels past its edges.

- Leave at least 8px (`space.2`) between small buttons, so the touch areas of two buttons do
  not reach onto each other.
- With less room than that, a touch in the space the two areas share goes to one of them: the
  nearer button on Android, and the button that is drawn later on iOS and the web.
- Do not rely on the touch area to separate a small button from other content. Give it the
  spacing you would give any control.

## Do and don't

| Do                                                              | Don't                                            |
| --------------------------------------------------------------- | ------------------------------------------------ |
| Put the primary action last in a group in left-to-right layouts | Put two primary buttons side by side             |
| Keep button order the same across a product                     | Change which side "Cancel" is on between dialogs |
| Let long labels wrap                                            | Truncate a label with an ellipsis                |
