# Raincoat for SwiftUI

Raincoat components for iOS 17 and later, written in SwiftUI. Every color, size, and text style
they use comes from a Raincoat theme.

This package is not published yet. The first prerelease will be `0.1.0-next.0`, from
`https://github.com/raincoat-ui/design-system-swift`.

## Products

| Product             | Contains                                                  |
| ------------------- | --------------------------------------------------------- |
| `Raincoat`          | The components and the SwiftUI environment                |
| `RaincoatThemeBase` | The base theme                                            |
| `RaincoatTokens`    | The token types. Foundation only; it also builds on Linux |

## Use

Apply a theme once, near the root of the app:

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
- The touch target is at least 44 points, whatever the visible height.
- The label and icons grow with the person's text size setting.
- In right-to-left layouts the leading icon is on the right.

To give another control the same look, use the style:

```swift
Link("Read the guide", destination: url).buttonStyle(.raincoat(variant: .ghost))
```

The Button follows the
[Button spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/button/spec.yaml),
which the React and Compose Buttons follow too.

## Working on this package

```sh
swift test --package-path packages/ios
```

`Sources/*/Generated/` is written by `pnpm tokens:build`. Component code may not name a color or
write a size as a number; `pnpm test` checks.

## License

Apache-2.0.
