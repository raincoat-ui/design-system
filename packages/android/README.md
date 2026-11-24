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

## Toast

Put a toast host over the screen's content, at the bottom, and show toasts from a coroutine:

```kotlin
val toasts = remember { RaincoatToastHostState() }
val scope = rememberCoroutineScope()

Box(Modifier.fillMaxSize()) {
    Inbox(onArchive = {
        scope.launch {
            val result = toasts.show("Message archived", actionLabel = "Undo", closeLabel = "Close")
            if (result == RaincoatToastResult.ActionPerformed) undoArchive()
        }
    })
    RaincoatToastHost(toasts, Modifier.align(Alignment.BottomCenter))
}
```

- `show(message)` shows a toast without an action; `show(message, actionLabel, closeLabel)` one
  with an action, which must have a named close button. Each suspends until its toast closes and
  says how.
- One toast is shown at a time; other calls wait, in order.
- A toast never takes focus. Its message is a polite live region: TalkBack says it after whatever
  it is saying, and offers to dismiss the toast.
- Without an action, a toast closes after 6 seconds, or after the person's accessibility timeout
  ("Time to take action") when that is longer. The time stops while a mouse pointer is over it,
  while keyboard focus is in it, and while the app is in the background. A toast with an action
  stays until the action is used or the toast is closed.
- A swipe down closes a toast.
- The host keeps its toasts above the on-screen keyboard and the system bars. To keep them above
  a bar of your own, place the host above the bar.
- `RaincoatToast(...)` draws a toast on its own, standing still, for previews and tests.

`Modifier.raincoatShadow(shadow, shape, fill)` fills a shape and draws a token shadow, such as
`toast.shadow`, with it, as CSS draws a `box-shadow`. Use it in place of `background`.

The Toast follows the
[Toast spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/toast/spec.yaml).

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
  aligns to its start. A name or a message inside a sentence must be isolated, or the
  punctuation and numbers beside it join it: `"Message from ⁨$name⁩"`, or
  `BidiFormatter.getInstance().unicodeWrap(name)` before it goes into `stringResource`.
- **Line breaking.** Lines break by the strict rules, and Korean between whole words, in the
  person's language. Korean needs Android 13 for that. Every component's text does the same.

Text and headings follow the
[Typography spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/typography/spec.yaml),
which the React and SwiftUI versions follow too.

## Dialogs, alert dialogs, and sheets

```kotlin
RaincoatDialog(
    open = renaming,
    onDismissRequest = { renaming = false },
    title = "Rename file",
    titleLevel = 2,
    description = "Everyone the file is shared with sees the new name.",
    initialFocus = nameField,
    actions = {
        RaincoatButton("Cancel", onClick = { renaming = false })
        RaincoatButton("Rename", onClick = ::rename, variant = ButtonVariant.Primary)
    },
) {
    BasicTextField(name, onValueChange = { name = it }, modifier = Modifier.focusRequester(nameField))
}

RaincoatAlertDialog(
    open = confirming,
    onCancel = { confirming = false },
    onConfirm = { delete(); confirming = false },
    title = "Delete this address?",
    titleLevel = 2,
    confirmLabel = "Delete address",
    cancelLabel = "Cancel",
    destructive = true,
)

RaincoatSheet(open = filtering, onDismissRequest = { filtering = false }, title = "Filters", titleLevel = 2,
    edge = SheetEdge.End, closeLabel = "Close") { FilterList() }
```

| Parameter          | On            | Type              | Default            | Notes                                                                    |
| ------------------ | ------------- | ----------------- | ------------------ | ------------------------------------------------------------------------ |
| `open`             | all           | `Boolean`         | Required           | Whether it is shown. It fades or slides in and out                       |
| `onDismissRequest` | dialog, sheet | `() -> Unit`      | Required           | Back, Escape, the scrim, the close button, and a drag ask through this   |
| `titleLevel`       | all           | `Int`             | Required           | 1 to 6. The title is set in `HeadingMd`                                  |
| `size`             | dialog        | `DialogSize`      | `DialogSize.Md`    | Its width. On a narrower window, it spans the window less a margin       |
| `edge`             | sheet         | `SheetEdge`       | `SheetEdge.Bottom` | An end sheet comes from the bottom on a window less than twice its width |
| `closeLabel`       | dialog, sheet | `String?`         | `null`             | Shows the close button, with this name. Give it when there is no Cancel  |
| `initialFocus`     | dialog, sheet | `FocusRequester?` | `null`             | Where keyboard focus goes on open                                        |
| `destructive`      | alert dialog  | `Boolean`         | `false`            | The confirming button is a danger button                                 |

- **A window of its own.** Each is a dialog window over a scrim in the theme's color. The screen
  behind cannot be used, and TalkBack is given only the dialog, as a pane named by its title.
- **Closing.** Back, predictive back, Escape, a tap on the scrim, and the close button call
  `onDismissRequest`; set `open` to false there, or keep it open while it holds unsaved changes
  and ask first. A bottom sheet also asks when it is dragged down, and settles back if it stays
  open. An alert dialog calls `onCancel` for back and Escape, and ignores the scrim.
- **Focus.** With a keyboard, focus goes to `initialFocus`, or Cancel in an alert dialog.
- **Scrolling.** The body scrolls between the header and the footer, with a hairline while
  content is beneath them; in a window too short for three lines of it, the whole dialog scrolls.
- **The footer's buttons** sit at the end edge and stack, the primary action on top, when they
  do not fit in a row.
- **Shadow.** The panel is drawn with `Modifier.raincoatShadow`, which draws the theme's overlay
  shadow; the base theme has none.

They follow the
[Dialog spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/dialog/spec.yaml),
which the React and SwiftUI versions follow too.

## Card

```kotlin
// Static: a container, which can hold links and buttons.
RaincoatCard(
    title = "Storage",
    level = 3,
    footer = { RaincoatButton("Manage storage", onClick = ::manageStorage) },
) {
    RaincoatText("4.2 GB of 15 GB used", color = TextColor.Muted)
}

// Interactive: the whole card is one button.
RaincoatCard(
    title = "Order 1042",
    level = 3,
    onClick = { openOrder(1042) },
    media = {
        Image(
            painterResource(R.drawable.parcel),
            contentDescription = "A parcel at a front door",
            modifier = Modifier.fillMaxWidth().height(120.dp),
            contentScale = ContentScale.Crop,
        )
    },
) {
    RaincoatText("Delivered on Monday", color = TextColor.Muted)
}
```

| Parameter           | Type                        | Default  | Notes                                                                            |
| ------------------- | --------------------------- | -------- | -------------------------------------------------------------------------------- |
| `title`             | `String`                    | Required | A heading in the `HeadingSm` look. It wraps and is never cut short               |
| `level`             | `Int`                       | Required | 1 to 6, for the card's place in the outline of the screen                        |
| `onClick`           | `(() -> Unit)?`             | `null`   | Makes the whole card one button. `null` is a static card                         |
| `media`             | `(@Composable () -> Unit)?` | `null`   | An image at the top, edge to edge, with the card's top corners. Give it a height |
| `footer`            | `(@Composable () -> Unit)?` | `null`   | Buttons at the end edge of a static card. They wrap when they do not fit         |
| `interactionSource` | `MutableInteractionSource?` | `null`   | Observes or drives an interactive card's presses, hovers, and focus              |
| `content`           | `(@Composable () -> Unit)?` | `null`   | The body                                                                         |

- **One action per interactive card.** With `onClick`, the card is one button: a touch, a
  click, Enter, or Space anywhere on it activates it, and its semantics merge its content, title
  first. Put no other controls in it. Compose has no link role, so a card that opens another
  screen is a button too.
- **States.** An interactive card's outline steps to the strong border color under a mouse, and
  its fill changes while it is pressed. Keyboard focus draws the focus ring around the whole
  card, from the focus ring tokens.
- **Media** is drawn at the top. TalkBack reads the title first.
- **Width.** A card fills the width it is given and grows with its content. The list or grid
  around it is the app's; give a list collection semantics, or use a lazy list, so that TalkBack
  says how many cards there are.

The Card follows the
[Card spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/card/spec.yaml),
which the React and SwiftUI Cards follow too.

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
