# RFC 0004: Input

- Status: accepted
- Kind: component
- Proposed: 2026-11-24
- Decided: 2026-11-24

## Summary

Adds Input: a text field with its label, an optional description, and an error message, in one
line or several. It adds two color roles, for the outline of a control that takes input and for
the outline of a control in error. It is for every app that asks people to type, from a sign-in
screen to a feedback form.

## Problem

An app that needs a text field today builds its own. Each one decides where the label goes, how
an error is shown and announced, and what color the outline is. The token source has nothing for
that outline: `color.border.default` is a hairline exempt from contrast, which is right for a
divider and wrong for a field, whose edge must reach 3:1 so that people can find it. The error
state has no outline color either. Typing also has localization traps a field must handle once
for every app: Vietnamese and CJK input methods compose characters before committing them, and
email addresses stay left-to-right inside a right-to-left screen.

## Proposal

### Anatomy

From top to bottom, all aligned to the start edge:

| Part        | Required               | Notes                                                                                                                           |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Label       | Yes                    | Above the field, never inside it. It can be visually hidden when the purpose is plain, as in a search bar; it is still the name |
| Description | No                     | Between the label and the field, so it is read before typing and stays visible above an on-screen keyboard                      |
| Field       | Yes                    | The box that takes text. An optional decorative leading icon                                                                    |
| Error       | When `invalid` is true | Below the field. It does not replace the description, which often states the rule the error refers to                           |

### Properties

| Property      | Values                                                        | Notes                                                                                      |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `size`        | `sm`, `md` (default), `lg`                                    | The same heights as the Button's sizes, so a field and a button line up in a row           |
| `type`        | `text` (default), `email`, `password`, `search`, `tel`, `url` | Chooses the keyboard on touch platforms and what autofill offers                           |
| `multiline`   | Boolean                                                       | Several lines. Starts `rows` lines tall (default 3) and grows with its content             |
| `required`    | Boolean                                                       | Sets the required state for assistive technology. The visible marking is the app's text    |
| `invalid`     | Boolean, with an `error` message                              | An invalid field must have a message                                                       |
| `disabled`    | Boolean                                                       | Not focusable. Prefer `read-only` when the value still matters                             |
| `read-only`   | Boolean                                                       | Focusable and selectable, not editable                                                     |
| `placeholder` | Text                                                          | Only an example of the format, such as "name@example.com". Never instructions or the label |

### States

| State     | Appearance                                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rest      | Control fill, 1px outline in `color.border.control`                                                                                                                                             |
| Hover     | No change. The text cursor is the cue                                                                                                                                                           |
| Focus     | The focus ring, 2px and offset 2px, as on the Button: on the web and Android whenever the field has focus, since it has focus only to be typed in; on iOS, the system's indicator and the caret |
| Invalid   | Outline in `color.border.danger`, and the error message below. The message is the cue that does not depend on color                                                                             |
| Disabled  | Disabled fill, outline, and text, as on the Button                                                                                                                                              |
| Read-only | Subtle fill and a hairline outline, so it reads as a value rather than a place to type                                                                                                          |

### Tokens

New semantic tokens, overridable by themes, with the contrast they must meet against
`color.bg.canvas`, `color.bg.surface`, and `color.bg.subtle`:

| Token                  | Holds                                                                                              | Light         | Dark          | Light HC      | Dark HC       | Contrast      |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| `color.border.control` | The outline of a control that takes input: text fields now; checkboxes, radios, and selects in 1.x | `neutral.900` | `neutral.100` | `neutral.900` | `neutral.100` | 3:1 (graphic) |
| `color.border.danger`  | The outline of a control in error                                                                  | `red.600`     | `red.400`     | `red.800`     | `red.300`     | 3:1 (graphic) |

- **The base draws fields in ink,** the same value as `color.border.strong`, so a field and a
  secondary button side by side have the same edge. RFC 0002 moved the secondary button's
  outline from grey to ink because a grey outline read as disabled; a field has the same
  problem. A separate role lets a theme soften field outlines without touching every ink rule.
- **The lowest ratios** in the base are 12.28:1 for the control outline (`neutral.100` on
  `neutral.800` in dark mode) and 4.88:1 for the danger outline (`red.600` on `neutral.100`). In dark mode, `red.600` would fall to 2.52:1 on
  the subtle background, so the outline uses `red.400` (4.95:1 there).
- `color.fg.muted` adds `color.control.default` to the backgrounds it declares, because the
  placeholder is drawn there.
- **Red for errors.** The base's rule that red means danger (DESIGN.md) grows to cover a field in
  error, the one other place red appears. Carbon draws a field in error with a red border too, and
  the red ramp is already closed to themes.

Component tokens, `tokens/component/input.tokens.json`:

| Token                                         | Value                                                            |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `input.radius`                                | `radius.md`                                                      |
| `input.border-width`                          | `border-width.thin`                                              |
| `input.height.sm`, `.md`, `.lg`               | `size.control.sm`, `.md`, `.lg`                                  |
| `input.padding-inline.sm`, `.md`, `.lg`       | `space.2`, `space.3`, `space.4`                                  |
| `input.gap`                                   | `space.2`, between label, description, field, and error          |
| `input.icon-size.sm`, `.md`, `.lg`            | `size.icon.sm`, `size.icon.md`, `size.icon.md`                   |
| `input.label.sm`, `.md`, `.lg`                | `type.label.sm`, `type.label.sm`, `type.label.md`                |
| `input.value.sm`, `.md`, `.lg`                | `type.body.sm`, `type.body.md`, `type.body.lg`                   |
| `input.description`, `input.error`            | `type.body.sm`                                                   |
| `input.bg.default`                            | `color.control.default`                                          |
| `input.bg.read-only`                          | `color.bg.subtle`                                                |
| `input.bg.disabled`                           | `color.bg.disabled`                                              |
| `input.fg`, `input.label.fg`                  | `color.fg.default`                                               |
| `input.placeholder`, `input.description.fg`   | `color.fg.muted`                                                 |
| `input.error.fg`                              | `color.fg.danger`                                                |
| `input.fg.disabled`                           | `color.fg.disabled`                                              |
| `input.border.default`                        | `color.border.control`                                           |
| `input.border.invalid`                        | `color.border.danger`                                            |
| `input.border.read-only`                      | `color.border.default`                                           |
| `input.border.disabled`                       | `color.border.disabled`                                          |
| `input.focus-ring.width`, `.offset`, `.color` | `border-width.focus`, `border-width.thick`, `color.border.focus` |
| `input.target-minimum`                        | `size.target.minimum`                                            |

Usage rules that will go into the guidelines:

- Mark the fields that are optional, in the label: "Phone (optional)". Most fields in a form are
  required, so marking the few that are not says less.
- Check a field when the form is submitted, and move focus to the first field in error. After
  that, check a field as it changes, so its error clears as soon as it is fixed. Do not show an
  error while someone is typing into a field for the first time.
- Say what to do, not what went wrong: "Enter an email address, like name@example.com", not
  "Invalid input".
- On the web, use `md` or `lg` on touch layouts: Safari on iPhone zooms into a field whose text
  is smaller than 16px when it takes focus, and `sm` uses 14px text.

## Prior art

Read from each system's public documentation on 2026-11-24. Material is read from the Jetpack
Compose documentation, because m3.material.io shows nothing without JavaScript. GitLab Pajamas
was also read and appears below where it differs.

| Question                                    | IBM Carbon                                                                                             | Adobe Spectrum                                                                                        | Google Material                                                                         | AWS Cloudscape                                                                          | Raincoat                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Parts (anatomy)                             | Label above; helper text below, replaced by an error; placeholder off by default; a password view icon | Label on top or at the side; help text below, replaced by an error; a character count                 | Label inside, in the outline, or above; icons, prefix and suffix; supporting text below | Label above; description under the label; constraint and error text below               | Label above; description under the label; error below the field, beside the description                          |
| Variants and sizes                          | Default and fluid; heights 24, 32, 40, and 48px; text area separate                                    | Sizes S to XL; text area separate and grows with content                                              | Filled and outlined; one component for one line or several                              | 66% or full width                                                                       | Three sizes matching the Button; one component for one line or several, growing with content                     |
| States                                      | Focus is a 2px border; error a 2px red border, icon, and message; warning; no hover; field edge 3:1    | Hover, focus, keyboard focus, disabled, error; no warning; state visuals 3:1                          | Read-only stays focusable; disabled is hidden from accessibility services               | Disabled (not focusable), read-only (focusable), invalid, warning                       | Focus ring, invalid outline and message, disabled, read-only; no warning; no hover                               |
| Keyboard behaviour                          | Tab selects existing text; Enter or Space operates the password toggle                                 | Tab selects text; Enter submits the form, depending on context                                        | The input method's Next and Done keys move focus and close the keyboard                 | General guidance only                                                                   | Platform behaviour; Enter submits a one-line field, never while an input method is composing                     |
| Screen-reader role, name, and announcements | Label by `for`; helper by `aria-describedby`; validate as people type or on submit                     | Accessible name required; `aria-describedby` and `aria-errormessage`; native errors on blur or submit | The error is announced to accessibility services                                        | Description linked automatically; validate on blur and on submit; focus the first error | Label is the name; description and error are linked; invalid state set; validate on submit                       |
| Right-to-left and long-text behaviour       | A long value scrolls sideways                                                                          | Layout mirrors; labels wrap; field text truncates                                                     | One line scrolls; several lines wrap, then scroll                                       | Leave room for translated text                                                          | Mirrors; email, phone, and web address fields stay left-to-right; labels and messages wrap; a long value scrolls |

Where the systems disagree, and which way Raincoat goes:

- **Label position.** Material puts the label inside the field by default, where it shrinks
  when the field has a value. Carbon, Cloudscape, and Pajamas put it above. Raincoat puts it
  above: a label that shrinks to fit a field clips stacked Vietnamese diacritics and long
  translations, and a label above wraps instead.
- **Description position.** Carbon, Spectrum, and Material put help text below the field;
  Cloudscape puts the description under the label. Raincoat follows Cloudscape, so the
  description is read before the field in both visual and screen-reader order.
- **Help text and error together.** Carbon and Spectrum replace the help text with the error;
  Pajamas shows both. Raincoat shows both, because the help often states the rule the error is
  about.
- **Required or optional.** Carbon and Spectrum mark whichever is the minority; Cloudscape and
  Pajamas mark only optional fields. Raincoat marks optional fields, so the rule does not change
  from form to form.
- **Placeholder.** Spectrum says not to use it for instructions; Cloudscape and Pajamas allow a
  brief example. Raincoat allows an example of the format only.
- **Validation timing.** Compose validates as people type, Cloudscape on blur, and Carbon and
  Pajamas allow either. Raincoat validates on submit, then as the field changes, so nobody is
  told they are wrong before they have finished.
- **Warning state.** Only Carbon and Cloudscape have one. Raincoat has no warning color, and a
  warning about a value a person may keep belongs in the description.
- **Long values.** Spectrum truncates; Carbon and Compose scroll. Raincoat scrolls: a person
  needs to see what they typed.

## Accessibility

| Requirement                                                                         | How it is tested                                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Name from the visible label, even when the label is hidden                          | Web: Testing Library queries by label, and axe. iOS: UI test reads the label. Android: semantics test |
| Description and error reach assistive technology with the field                     | Web: `aria-describedby` names both, in that order. iOS and Android: see below                         |
| The invalid state is exposed                                                        | Web: `aria-invalid`. Android: error semantics. iOS: see below                                         |
| Required state is exposed where the platform has one                                | Web: `required`. iOS and Android have none; the label marks optional fields for everyone              |
| The field's edge is 3:1 against its background; the error outline too               | Token contrast check                                                                                  |
| Focus ring at 3:1 on the web and Android                                            | Token contrast check; focus snapshots                                                                 |
| The touch area is at least 44pt, 48dp, or 44px, whatever the field's visible height | Target-size tests on each platform                                                                    |
| Disabled fields leave the Tab order; read-only fields stay in it                    | Web: Playwright keyboard tests. iOS and Android: focus tests                                          |

- **iOS** has no invalid state, as it has no busy state. The field says it in words: its
  accessibility label is followed by the error message, as the loading Button's value says "In
  progress". The reference app checks what VoiceOver is given in English, Vietnamese, and
  Japanese.
- **Android** uses Compose's error semantics, which TalkBack reads with the field.
- **The description** is the field's accessibility hint on iOS, and part of the field's
  semantics on Android, read after its name.
- Errors are not announced as they appear. Focus moves to the first field in error on submit,
  and the field then reads its label, its state, and its message.

## Internationalization

- **Right-to-left.** Label, description, and error align to the start edge, and the leading icon
  moves to the right. Email, phone, and web address fields stay left-to-right, because their
  content is; Cloudscape says the same of untranslated text, numbers, and email addresses.
- **Input methods.** Vietnamese (Telex, VNI) and CJK input methods compose a character before
  committing it. The component never replaces the value, validates, or submits during
  composition, and Enter that commits a composition does not submit the form. The web tests
  dispatch composition events; the native platforms are checked in the manual audit before a
  minor release.
- **Long and expanded text.** Label, description, and error wrap and are never truncated. A long
  value scrolls inside a one-line field. Snapshots cover the expanded pseudo-locale.
- **Vietnamese and CJK** snapshots show a label, a description, and a value in each locale, with
  line heights of 1.4 for labels and 1.5 for values.
- **No character limit in v1.** HTML counts length in UTF-16 code units, so a decomposed
  Vietnamese word counts as more characters than it shows. A limit that counts what people see
  can come in 1.x.

## Platform notes

- **Web.** shadcn/ui's `input`, `textarea`, and `label` sources, adapted as the Button was. A
  native `<input>` or `<textarea>`, so autofill, spelling, and password managers work. Where the
  browser cannot size a field to its content, the person can resize a multi-line field
  vertically.
- **iOS.** SwiftUI's `TextField` (with `axis: .vertical` for several lines) and `SecureField`,
  styled through a `TextFieldStyle` so any `TextField` an app writes can take the look. `type`
  sets the keyboard and text content type.
- **Android.** Compose Foundation's `BasicTextField` with a decoration built from the tokens. No
  Material dependency, as for the Button.

## Migration

None. This is a new component. `button.secondary.border` stays on `color.border.strong`; moving
it to `color.border.control` would change what themes have already overridden.

## Alternatives considered

- **A floating label inside the field.** Saves height, but the shrunken label is too small for
  stacked Vietnamese diacritics and is hard to read in long translations.
- **A grey outline at 3:1** (`neutral.500` passes, at 4.30:1 on white). Lighter in a long form,
  but it reads as disabled beside the ink outline of a secondary button, which is why RFC 0002
  moved that outline to ink. A theme can choose it through `color.border.control`.
- **A 2px outline for errors,** as Carbon draws. A thicker edge is a second cue beside color, but
  it shifts the text by a pixel; the message is the cue that does not depend on color.
- **Password reveal, clear button, prefix and suffix, and a character count.** Each needs an icon
  set or translated words the system does not have yet. They can come in 1.x with a trailing slot
  for actions.
- **Separate Input and Textarea components.** Carbon and Spectrum split them. One component with
  `multiline` keeps label, description, and error identical, as Compose does.
