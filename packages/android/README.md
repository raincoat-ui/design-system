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

## Text and headings

```kotlin
RaincoatHeading("Settings", level = 1)
RaincoatHeading("Recent files", level = 3, variant = HeadingVariant.HeadingSm)
RaincoatText("Your files are kept on this device and in the cloud.")
RaincoatText("Synced 2 minutes ago", variant = TextVariant.Caption, color = TextColor.Muted)
RaincoatText(message.preview, maxLines = 2)
```

`RaincoatText` sets running text and labels:

| Parameter  | Type          | Default              | Notes                                                                    |
| ---------- | ------------- | -------------------- | ------------------------------------------------------------------------ |
| `variant`  | `TextVariant` | `TextVariant.BodyMd` | `BodyLg`, `BodyMd`, `BodySm`, `LabelLg`, `LabelMd`, `LabelSm`, `Caption` |
| `color`    | `TextColor`   | `TextColor.Default`  | `Default`, `Muted`, `Danger`                                             |
| `maxLines` | `Int`         | `Int.MAX_VALUE`      | Ends the text in an ellipsis after that many lines                       |

`RaincoatHeading` sets a heading:

| Parameter | Type              | Default                  | Notes                                                           |
| --------- | ----------------- | ------------------------ | --------------------------------------------------------------- |
| `level`   | `Int`             | Required                 | 1 to 6                                                          |
| `variant` | `HeadingVariant?` | `null`, the level's look | 1 `HeadingXl`, 2 `HeadingLg`, 3 `HeadingMd`, 4 to 6 `HeadingSm` |
| `color`   | `HeadingColor`    | `HeadingColor.Default`   | `Default`, `Muted`                                              |

- **Headings.** Assistive technology is told that a heading is one, so TalkBack can move from
  heading to heading. Android has no heading levels: `level` chooses the look, and keeps code the
  same on every platform. Choose it for the heading's place in the outline of the screen.
- **Text size.** Sizes are in sp, so text follows the person's font size setting. Android
  enlarges large text less than small text itself, and the line height keeps its proportion.
- **Long text wraps.** A heading is never cut short. Text cut short by `maxLines` is still read
  in full by TalkBack.
- **Direction.** Each paragraph takes its direction from its first strong character, and
  aligns to its start.

Text and headings follow the
[Typography spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/typography/spec.yaml),
which the React and SwiftUI versions follow too.

## Working on these modules

```sh
./gradlew test licensee
```

It needs JDK 21 and the Android SDK (platform 37). The component tests run on the JVM with
Robolectric; no emulator is needed. `src/*/generated/` is written by `pnpm tokens:build`.
Component code may not name a color or write a size as a number; `pnpm test` checks.

## License

Apache-2.0.
