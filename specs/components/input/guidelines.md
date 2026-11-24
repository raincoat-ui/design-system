# Input guidelines

## When to use

Use an input wherever people type: a name, an email address, a search, a message. For a choice
from a fixed list, use a control made for choosing.

Use one line for a short value and `multiline` for text that can run to sentences, such as a
comment. A multi-line field grows with what is typed.

## Writing the label

- Say what the field is for, in a few words, in sentence case: "Email address", "Message".
- Do not end with a colon or a full stop.
- Keep the label even when it is visually hidden, as in a search bar. It is still the field's
  name for assistive technology.
- Mark the fields that are optional, in the label: "Phone (optional)". Most fields in a form are
  required, so marking the few that are not says less. Set `required` on the others, so that
  assistive technology says so where the platform can.

## Description and placeholder

- Put what someone needs before typing in the description: the rule the value must follow, or
  where it will be used. It stays visible above an on-screen keyboard.
- Use the placeholder only for an example of the format, such as "name@example.com". It
  disappears as soon as someone types, so it can never hold instructions or replace the label.

## Errors

- Check a field when the form is submitted, and move focus to the first field in error. After
  that, check a field as it changes, so that its error clears as soon as it is fixed.
- Do not show an error while someone is typing into a field for the first time.
- Say what to do, not what went wrong: "Enter an email address, like name@example.com", not
  "Invalid input".
- Every invalid field has a message. The red outline is not enough on its own.
- The error does not replace the description. Write it so the two read well together.

## Sizes

| Size | Use it for                                                 |
| ---- | ---------------------------------------------------------- |
| `sm` | Dense layouts on a desktop, such as a filter above a table |
| `md` | Most forms                                                 |
| `lg` | A prominent field, such as the one field of a sign-in step |

A field and a button of the same size are the same height, so they line up in a row.

On the web, use `md` or `lg` on touch layouts: Safari on iPhone zooms into a field whose text is
smaller than 16px when it takes focus, and `sm` uses 14px text.

## Disabled and read-only

- Prefer read-only when the value still matters: a read-only field can be focused, selected, and
  copied, and assistive technology reads it.
- A disabled field cannot be focused and cannot say why it is disabled. Explain nearby what is
  needed to enable it.

## Spacing

A field takes the room it shows. A field shorter than the minimum touch target still takes
touches across that minimum, so its touch area reaches a few pixels past its top and bottom
edges. Leave at least 8px (`space.2`) between a small field and the next control.

## Do and don't

| Do                                                       | Don't                                             |
| -------------------------------------------------------- | ------------------------------------------------- |
| Put the label above the field                            | Put the label inside the field as its placeholder |
| Say how to fix an error: "Enter a date, like 31/12/2026" | Say only that something is wrong: "Invalid value" |
| Mark optional fields: "Company (optional)"               | Mark every required field with an asterisk        |
| Let a long label or error wrap                           | Truncate a label or an error with an ellipsis     |
| Use the email, phone, and web address types              | Use a text field for an email address             |
