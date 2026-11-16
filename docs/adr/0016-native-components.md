# 0016. Native components follow the platform where it knows better

- Status: accepted
- Date: 2026-11-16

## Context

The component specs are platform-neutral, and the tokens are the same values everywhere. Building
the SwiftUI and Compose Buttons raised several places where copying the web implementation would
have made a worse native component.

## Decision

A native component follows its spec and takes every color and size from tokens. Where the
platform already provides a behavior that people can configure, the component uses the
platform's.

| Topic          | iOS (SwiftUI)                                                                                                                                             | Android (Compose)                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Names          | `RaincoatButton`, because `Button` belongs to SwiftUI. A `ButtonStyle`, `.raincoat(variant:size:)`, gives the same look to a `Link` or a `NavigationLink` | `RaincoatButton`, because most apps also import Material's `Button`                                                                        |
| Dependencies   | SwiftUI only                                                                                                                                              | Compose Foundation only. No Material dependency, so an app is free to use Material beside it, or not                                       |
| Disabled       | SwiftUI's `disabled(_:)`. There is no parameter                                                                                                           | An `enabled` parameter, as Compose controls have                                                                                           |
| Focus          | The system focus indicator. People set its color, contrast, and size under Full Keyboard Access, and a ring of our own would override their choice        | Compose draws no focus indicator of its own, so the ring is drawn from the focus ring tokens, as on the web                                |
| Touch target   | The layout size is at least the minimum target, with the visible container centered in it                                                                 | The same, and the minimum is the larger of the token and the platform's own (48dp)                                                         |
| Text size      | The label and icons grow with the text size setting. The space above and below the label stays as it is, so the button grows taller                       | The same. Line height is a multiple of the font size, so it keeps its proportion when Android enlarges big text less                       |
| Loading        | The button stays enabled, so it keeps focus, and ignores activation. The spinner presents itself as the system's progress indicator                       | The same. The button carries indeterminate progress semantics, for which Compose supplies the words "in progress" in the person's language |
| Reduced motion | Color changes are immediate when Reduce Motion is on                                                                                                      | Compose makes animations immediate when the person has turned them off                                                                     |
| Fonts          | The first family of the font stack that is installed or registered by the app, and the system font otherwise                                              | The system font that the font stack ends in. Named families join when themes ship font files                                               |

On both platforms a small button therefore takes more room than it shows, which is how the
platforms' own controls behave.

Component code is linted (`tools/component-lint`): a color built from literal values, a system
color, or a size written as a number fails `pnpm test`.

## Testing

- The mapping from variant, size, and state to tokens is plain Swift and plain Kotlin. Expected
  values are looked up by token id, not by repeating the mapping. The Swift tests also run on
  Linux.
- **iOS.** On macOS the tests draw real buttons into a bitmap and read the pixels back: heights,
  fills, outlines, the touch target, wrapping, right-to-left order, and the spinner.
- **Android.** The tests run on the JVM with Robolectric. They read the semantics that
  assistive technology is given, drive the button with touch, mouse, and keys, and read pixels
  back, including the pressed and hovered fills, the focus ring, and a doubled font size.

## Not yet done

- **Accessibility as assistive technology sees it.** SwiftUI builds its accessibility tree only
  for a real assistive client, so unit tests cannot read it. The role, the name, the busy
  announcement, and an accessibility audit are checked by UI tests in the iOS reference app,
  which is the next piece of milestone 1. Until then the loading announcement is unverified.
- Tests at larger text sizes on iOS, which need a simulator.
- **Google's Accessibility Test Framework on Android.** It does nothing under Robolectric: a
  button planted without a name passed. It runs on an emulator, with the Android reference app.
- Theme font files. Until a theme bundles them, text uses the system font.
