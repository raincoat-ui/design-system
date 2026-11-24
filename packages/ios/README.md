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

## Tabs

```swift
RaincoatTabs(selection: $section, tabs: [
    RaincoatTab("Details", value: Section.details),
    RaincoatTab("Photos", value: .photos, icon: Image(systemName: "photo")),
    RaincoatTab(icon: Image(systemName: "list.bullet"), accessibilityLabel: Text("List"), value: .list),
]) { section in
    SectionView(section)
}

RaincoatTabs(tabs: tabs) { section in SectionView(section) } // keeps its own selection
```

- The row runs across the full width over a hairline. When the tabs do not fit, it scrolls
  sideways, and the selected tab is scrolled into view. Labels stay on one line.
- Only the selected tab's panel is shown. There are no disabled tabs: leave out a tab that leads
  nowhere.
- VoiceOver is told the row is a tab bar, and the selected tab carries the selected trait. A
  tab with only an icon needs an accessibility label.
- A keyboard moves focus between the tabs as Full Keyboard Access does for any control, and
  Space selects.
- Each tab's touch area is at least 44 points tall.

The Tabs follow the
[Tabs spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/tabs/spec.yaml),
which the React and Compose Tabs follow too.

## Working on this package

```sh
swift test --package-path packages/ios
```

`Sources/*/Generated/` is written by `pnpm tokens:build`. Component code may not name a color or
write a size as a number; `pnpm test` checks.

## License

Apache-2.0.
