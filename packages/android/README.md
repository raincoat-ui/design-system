# Raincoat for Jetpack Compose

Raincoat components for Android 8 (API 26) and later, written in Jetpack Compose. Every color,
size, and text style they use comes from a Raincoat theme.

The current version is the prerelease `0.1.0-next.4`. Anything in it may change before 1.0.

## Install

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://raincoat-ui.github.io/design-system/maven")
            content { includeGroup("io.github.raincoat-ui") }
        }
    }
}

// build.gradle.kts
dependencies {
    implementation("io.github.raincoat-ui:ui:0.1.0-next.4")
}
```

## Artifacts

| Artifact                           | Contains                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `io.github.raincoat-ui:ui`         | The components and `RaincoatTheme`. Depends on Compose Foundation |
| `io.github.raincoat-ui:theme-<id>` | One per theme, such as `theme-base`                               |
| `io.github.raincoat-ui:tokens`     | The token types. Plain Kotlin, with no Android dependency         |

The components do not depend on Material, so an app can use Material beside them, or not.

## Use

Each theme is a module of its own, so an app depends only on its own. The
[themes page](https://raincoat-ui.github.io/design-system/foundations/themes/) lists them. Apply
the theme once, near the root of the app:

```kotlin
import io.github.raincoatui.theme.base.BaseTheme
import io.github.raincoatui.ui.RaincoatTheme

setContent {
    RaincoatTheme(BaseTheme) { App() }
}
```

`RaincoatTheme` follows the system's dark theme and, from Android 14, its contrast setting. Pass
`darkTheme`, `increasedContrast`, or `density = Density.Compact` to choose yourself.

## Button

```kotlin
RaincoatButton("Save changes", onClick = ::save, variant = ButtonVariant.Primary)
RaincoatButton("Save changes", onClick = ::save, loading = isSaving)
RaincoatButton("Next", onClick = ::next, trailingIcon = painterResource(R.drawable.arrow_right))
RaincoatButton(
    icon = painterResource(R.drawable.trash),
    contentDescription = stringResource(R.string.delete_page),
    onClick = ::delete,
    variant = ButtonVariant.Danger,
)
```

| Parameter           | Type                        | Default                   | Notes                                                                    |
| ------------------- | --------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `variant`           | `ButtonVariant`             | `ButtonVariant.Secondary` | `Primary`, `Secondary`, `Ghost`, `Danger`. At most one primary in a view |
| `size`              | `ButtonSize`                | `ButtonSize.Md`           | `Sm`, `Md`, `Lg`                                                         |
| `enabled`           | `Boolean`                   | `true`                    | A disabled button cannot be focused or activated                         |
| `loading`           | `Boolean`                   | `false`                   | Shows a spinner, keeps the label and focus, ignores activation           |
| `fullWidth`         | `Boolean`                   | `false`                   | Stretches to the container                                               |
| `leadingIcon`       | `Painter?`                  | `null`                    | Decoration; it has no description and takes the label's color            |
| `trailingIcon`      | `Painter?`                  | `null`                    |                                                                          |
| `interactionSource` | `MutableInteractionSource?` | `null`                    | Observes or drives presses, hovers, and focus                            |

- Long labels wrap. The button grows taller; the label is never truncated.
- The button takes the room it shows. The area that takes touches is at least 48dp across, so
  around a small button it reaches past the edges, and a touch between two buttons goes to the
  nearer one. A mouse has to be on the button itself.
- The label and icons grow with the person's font size setting.
- In right-to-left layouts the leading icon is on the right.
- With a keyboard, the focused button shows the theme's focus ring.

The Button follows the
[Button spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/button/spec.yaml),
which the React and SwiftUI Buttons follow too.

## Tabs

```kotlin
RaincoatTabs(
    tabs = listOf(
        RaincoatTab(Section.Details, "Details"),
        RaincoatTab(Section.Photos, "Photos", icon = painterResource(R.drawable.photo)),
        RaincoatTab(Section.List, painterResource(R.drawable.list), contentDescription = "List"),
    ),
    selected = section,
    onSelect = { section = it },
) { selected -> SectionContent(selected) }

RaincoatTabs(tabs) { selected -> SectionContent(selected) } // keeps its own selection
```

- The row runs across the full width over a hairline. When the tabs do not fit, it scrolls
  sideways, and the selected tab is brought into view. Labels stay on one line.
- Only the selected tab's panel is shown. There are no disabled tabs: leave out a tab that leads
  nowhere.
- The row is a selectable group, and each tab is selectable with the tab role, which TalkBack
  reads with its selected state. A tab with only an icon needs a content description.
- A keyboard moves focus between the tabs as for any control, and Enter or Space selects. The
  focused tab shows the theme's focus ring inside its edge.
- Each tab's touch area is at least 48dp tall; a mouse has to be on the tab itself.

The Tabs follow the
[Tabs spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/tabs/spec.yaml),
which the React and SwiftUI Tabs follow too.

## Working on these modules

```sh
./gradlew test licensee
```

It needs JDK 21 and the Android SDK (platform 37). The component tests run on the JVM with
Robolectric; no emulator is needed. `src/*/generated/` is written by `pnpm tokens:build`.
Component code may not name a color or write a size as a number; `pnpm test` checks.

## License

Apache-2.0.
