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

## Input

```kotlin
var email by rememberSaveable { mutableStateOf("") }
RaincoatInput(email, { email = it }, label = "Email", type = InputType.Email)
RaincoatInput(email, { email = it }, label = "Email", invalid = !valid, error = "Enter an email address")
RaincoatInput(query, { query = it }, label = "Search", type = InputType.Search, labelHidden = true)
RaincoatInput(message, { message = it }, label = "Message", multiline = true)
```

| Parameter           | Type                        | Default          | Notes                                                                   |
| ------------------- | --------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `type`              | `InputType`                 | `InputType.Text` | `Text`, `Email`, `Password`, `Search`, `Tel`, `Url`: the keyboard       |
| `size`              | `InputSize`                 | `InputSize.Md`   | `Sm`, `Md`, `Lg`: the heights of the Button's sizes                     |
| `description`       | `String?`                   | `null`           | Between the label and the field, and read after its name                |
| `placeholder`       | `String?`                   | `null`           | An example of the format, shown while the field is empty                |
| `invalid`           | `Boolean`                   | `false`          | Shows the error below the field, and sets the field's error semantics   |
| `error`             | `String?`                   | `null`           | What to do to make the value acceptable. An invalid field must have one |
| `multiline`         | `Boolean`                   | `false`          | Starts `rows` lines tall (3) and grows with its content                 |
| `enabled`           | `Boolean`                   | `true`           | A disabled field cannot be focused or changed                           |
| `readOnly`          | `Boolean`                   | `false`          | The value can be focused and selected, not changed                      |
| `labelHidden`       | `Boolean`                   | `false`          | Hides the label from view. It is still the field's name                 |
| `leadingIcon`       | `Painter?`                  | `null`           | Decoration; it has no description and takes the value's color           |
| `keyboardActions`   | `KeyboardActions`           | default          | What the keyboard's action key does                                     |
| `interactionSource` | `MutableInteractionSource?` | `null`           | Observes focus and presses                                              |

- The field is built on Compose Foundation's `BasicTextField`. The label, the description, and
  the error are part of it, so that a touch on them focuses it and assistive technology is given
  them with it: the label as its name, then the description. An invalid field carries Compose's
  error semantics with its message.
- Android has no required state: mark the fields that are optional in their label.
- To move focus to the first field in error on submit, pass `Modifier.focusRequester(...)`.
- The focus ring is drawn whenever the field has focus.
- The field takes the room it shows. The area that takes touches is at least 48dp tall, so
  around a small field it reaches past the edges.
- Email, phone, and web address fields stay left-to-right in a right-to-left layout, their icon
  included.

The Input follows the
[Input spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/input/spec.yaml),
which the React and SwiftUI Inputs follow too.

## Working on these modules

```sh
./gradlew test licensee
```

It needs JDK 21 and the Android SDK (platform 37). The component tests run on the JVM with
Robolectric; no emulator is needed. `src/*/generated/` is written by `pnpm tokens:build`.
Component code may not name a color or write a size as a number; `pnpm test` checks.

## License

Apache-2.0.
