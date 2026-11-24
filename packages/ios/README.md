# Raincoat for SwiftUI

Raincoat components for iOS 17 and later, written in SwiftUI. Every color, size, and text style
they use comes from a Raincoat theme.

Prereleases are tagged in `https://github.com/raincoat-ui/design-system-swift`. The
[releases page](https://github.com/raincoat-ui/design-system/releases) says which registries each
version has reached.

## Products

| Product             | Contains                                                  |
| ------------------- | --------------------------------------------------------- |
| `Raincoat`          | The components and the SwiftUI environment                |
| `RaincoatTheme<Id>` | One per theme, such as `RaincoatThemeBase`                |
| `RaincoatTokens`    | The token types. Foundation only; it also builds on Linux |

## Use

Each theme is a product of its own, so an app links only its own. The
[themes page](https://raincoat-ui.github.io/design-system/foundations/themes/) lists them. Apply
the theme once, near the root of the app:

```swift
import Raincoat
import RaincoatThemeBase

ContentView().raincoatTheme(.base)
```

Components follow the system's light or dark appearance and its Increase Contrast setting. Use
`raincoatDensity(.compact)` for smaller controls.

## Button

```swift
RaincoatButton("Save changes", variant: .primary) { save() }
RaincoatButton("Save changes", isLoading: isSaving) { save() }
RaincoatButton("Next", trailingIcon: Image(systemName: "arrow.right")) { next() }
RaincoatButton(icon: Image(systemName: "trash"), accessibilityLabel: Text("Delete page"), variant: .danger) {
    delete()
}
RaincoatButton("Save changes") { save() }.disabled(!canSave)
```

| Parameter      | Type            | Default      | Notes                                                                        |
| -------------- | --------------- | ------------ | ---------------------------------------------------------------------------- |
| `variant`      | `ButtonVariant` | `.secondary` | `.primary`, `.secondary`, `.ghost`, `.danger`. At most one primary in a view |
| `size`         | `ButtonSize`    | `.md`        | `.sm`, `.md`, `.lg`                                                          |
| `leadingIcon`  | `Image?`        | `nil`        | Decoration; hidden from assistive technology                                 |
| `trailingIcon` | `Image?`        | `nil`        |                                                                              |
| `isFullWidth`  | `Bool`          | `false`      | Stretches to the container                                                   |
| `isLoading`    | `Bool`          | `false`      | Shows a spinner, keeps the label and focus, ignores activation               |

- The title is a `LocalizedStringKey`, a `String`, or a `Text`.
- Long labels wrap. The button grows taller; the label is never truncated.
- The button takes the room it shows. The area that takes touches is at least 44 points across,
  so around a small button it reaches past the edges. Leave 8 points or more between small
  buttons.
- The label and icons grow with the person's text size setting.
- In right-to-left layouts the leading icon is on the right.
- A loading button tells assistive technology that it is in progress, after its name: "Save
  changes, In progress".

### Languages

The words a component says to assistive technology are translated into English, Vietnamese,
Simplified Chinese, Traditional Chinese, Japanese, and Korean; other languages get English.
iOS uses a package's translation only for a language your app supports. If your app is in fewer
languages than its users, set `CFBundleAllowMixedLocalizations` to `YES` in its `Info.plist`.
Everything a person reads on screen comes from your app.

To give another control the same look, use the style:

```swift
Link("Read the guide", destination: url).buttonStyle(.raincoat(variant: .ghost))
```

The Button follows the
[Button spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/button/spec.yaml),
which the React and Compose Buttons follow too.

## Input

```swift
RaincoatInput("Full name", text: $name)
RaincoatInput("Email", text: $email, type: .email, description: Text("We send the receipt here."))
RaincoatInput("Email", text: $email, type: .email, isInvalid: !isValid, error: Text("Enter an email address"))
RaincoatInput("Search", text: $query, type: .search, isLabelHidden: true, leadingIcon: Image(systemName: "magnifyingglass"))
RaincoatInput("Message", text: $message, isMultiline: true)
RaincoatInput("Account number", text: $account, isReadOnly: true)
```

| Parameter       | Type        | Default | Notes                                                                   |
| --------------- | ----------- | ------- | ----------------------------------------------------------------------- |
| `type`          | `InputType` | `.text` | `.text`, `.email`, `.password`, `.search`, `.tel`, `.url`               |
| `size`          | `InputSize` | `.md`   | `.sm`, `.md`, `.lg`: the heights of the Button's sizes                  |
| `description`   | `Text?`     | `nil`   | Between the label and the field. VoiceOver reads it as the hint         |
| `prompt`        | `Text?`     | `nil`   | An example of the format, shown while the field is empty                |
| `isInvalid`     | `Bool`      | `false` | Shows the error below the field, and tells VoiceOver                    |
| `error`         | `Text?`     | `nil`   | What to do to make the value acceptable. An invalid field must have one |
| `isMultiline`   | `Bool`      | `false` | Starts `rows` lines tall (3) and grows with its content                 |
| `isReadOnly`    | `Bool`      | `false` | The value can be selected and copied, not changed                       |
| `isLabelHidden` | `Bool`      | `false` | Hides the label from view. It is still the field's name                 |
| `leadingIcon`   | `Image?`    | `nil`   | Decoration; hidden from assistive technology                            |

- The label is a `LocalizedStringKey`, a `String`, or a `Text`.
- Disable a field with `disabled(_:)`, and move focus to it with `focused(_:equals:)`: on
  submit, move focus to the first field in error.
- iOS has no invalid state, so VoiceOver reads an invalid field's error after its label: "Email,
  Enter an email address". It has no required state either: mark the fields that are optional
  in their label, "Phone (optional)".
- `type` sets the keyboard and the text content type that autofill uses. Email, phone, and web
  address fields are not capitalized or corrected, and stay left-to-right in a right-to-left
  layout, their icon included.
- The label, the description, and the error wrap; they are never truncated. Everything grows
  with the person's text size setting.
- The field takes the room it shows. Where it is shorter than 44 points, the text field inside
  reaches past its top and bottom, so touches there place the caret.
- The system draws the focus indicator and the caret.

To give any `TextField` or `SecureField` the look of the field alone, use the style:

```swift
TextField("Search", text: $query).textFieldStyle(.raincoat(size: .sm))
```

The Input follows the
[Input spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/input/spec.yaml),
which the React and Compose Inputs follow too.

## Working on this package

```sh
swift test --package-path packages/ios
```

`Sources/*/Generated/` is written by `pnpm tokens:build`. Component code may not name a color or
write a size as a number; `pnpm test` checks.

## License

Apache-2.0.
