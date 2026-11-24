---
"@raincoat-ui/react": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
---

The Input: a text field with its label, an optional description, and an error message, in one
line or several. It follows `specs/components/input/spec.yaml`.

- **React.** `<Input label="Email" type="email" />`, on a native `<input>`, or a `<textarea>`
  with `multiline`. The field is described by its description and then its error, and sets
  `aria-invalid` and `required`. While a Vietnamese or CJK input method composes, the field
  keeps the error state it had, and Enter that commits the composition does not submit the
  form. Email, phone, and web address fields stay left-to-right in a right-to-left layout.
  Japanese breaks into lines by the strict rules, and Korean between whole words, in the field
  and in its label, description, and error. The Input is a Client Component that a Server
  Component can render.
- **SwiftUI.** `RaincoatInput("Email", text: $email, type: .email)`, on `TextField` and
  `SecureField`. VoiceOver reads the description as the hint and, since iOS has no invalid
  state, an invalid field's error after its label. `.textFieldStyle(.raincoat())` gives any text
  field the look of the field alone.
- **Compose.** `RaincoatInput(value, onValueChange, label = "Email", type = InputType.Email)`, on
  Compose Foundation's `BasicTextField`. An invalid field carries Compose's error semantics with
  its message, and the description is part of the field's semantics after its name. Its texts
  break into lines as every Raincoat text style does: Korean only between whole words.

Every size is as tall as the Button of the same size. A field shorter than the minimum touch
target still takes touches across that target, without taking more room than it shows. As the
person's text size grows, the value, the label, and the leading icon grow with it, and the space
above and below the value stays as it is, so the field grows taller, as the Button does. The
generated `InputSize` and `InputType` types are exported on every platform.
