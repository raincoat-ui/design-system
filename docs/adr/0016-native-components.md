# 0016. Native components follow the platform where it knows better

- Status: accepted
- Date: 2026-11-16
- Amended: 2026-11-16, touch targets no longer take layout space; the loading state is said in
  words on iOS

## Context

The component specs are platform-neutral, and the tokens are the same values everywhere. Building
the SwiftUI and Compose Buttons raised several places where copying the web implementation would
have made a worse native component.

## Decision

A native component follows its spec and takes every color and size from tokens. Where the
platform already provides a behavior that people can configure, the component uses the
platform's.

| Topic          | iOS (SwiftUI)                                                                                                                                                                            | Android (Compose)                                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names          | `RaincoatButton`, because `Button` belongs to SwiftUI. A `ButtonStyle`, `.raincoat(variant:size:)`, gives the same look to a `Link` or a `NavigationLink`                                | `RaincoatButton`, because most apps also import Material's `Button`                                                                                                                                                                          |
| Dependencies   | SwiftUI only                                                                                                                                                                             | Compose Foundation only. No Material dependency, so an app is free to use Material beside it, or not                                                                                                                                         |
| Disabled       | SwiftUI's `disabled(_:)`. There is no parameter                                                                                                                                          | An `enabled` parameter, as Compose controls have                                                                                                                                                                                             |
| Focus          | The system focus indicator. People set its color, contrast, and size under Full Keyboard Access, and a ring of our own would override their choice                                       | Android draws no keyboard focus indicator for Compose content: the app's theme has to. The ring is drawn from the focus ring tokens, as on the web. TalkBack and Switch Access draw their own highlight, which follows the person's settings |
| Touch target   | The layout size is the visible size. The hit shape is at least the minimum target, so around a smaller button it reaches past the container. Assistive technology is given the same area | The same. Compose grows the touch area of a small target itself: for touches and not for a mouse, and a touch in two areas goes to the nearer button. The minimum is the larger of the token and the platform's own (48dp)                   |
| Text size      | The label and icons grow with the text size setting. The space above and below the label stays as it is, so the button grows taller                                                      | The same. Line height is a multiple of the font size, so it keeps its proportion when Android enlarges big text less                                                                                                                         |
| Loading        | The button stays enabled, so it keeps focus, and ignores activation. iOS has no busy state, so the button's accessibility value says "In progress", translated in the package            | The same. The button carries indeterminate progress semantics, for which Compose supplies the words "in progress" in the person's language                                                                                                   |
| Reduced motion | Color changes are immediate when Reduce Motion is on                                                                                                                                     | Compose makes animations immediate when the person has turned them off                                                                                                                                                                       |
| Fonts          | The first family of the font stack that is installed or registered by the app, and the system font otherwise                                                                             | The system font that the font stack ends in. Named families join when themes ship font files                                                                                                                                                 |

A button takes the room it shows on every platform. In 0.1.0-next.0 the minimum target was part
of the layout size on iOS and Android, so a small button took more room than it showed and did
not line up with its neighbours as drawn. The maintainer chose to change that. The cost is that
the touch areas of small buttons placed closer than 8px reach onto each other; the Button
guidelines say how to space them.

iOS adds a tolerance of its own around any target: measured on an iOS 26.5 simulator, a touch
up to about 19 points outside a button still reaches it when nothing else is there. The hit shape is declared anyway,
because that tolerance is not documented and assistive technology does not see it.

### Words for assistive technology on iOS

Until 0.1.0-next.0 the spinner presented itself as the system's progress indicator. The
reference app showed that this does not reach VoiceOver through a button: a loading button was
read as its label alone. The button now carries the words itself, as its accessibility value.

That makes the Swift package the first one to ship text. The rules for it:

- Only words that assistive technology speaks and that an app cannot supply through the
  component's own parameters. Everything a person reads on screen comes from the app.
- Translated into the languages the system is tested in: English, Vietnamese, Simplified and
  Traditional Chinese, Japanese, and Korean. Any other language gets English.
- iOS uses a package's translation only for a language the app itself supports, or when the app
  sets `CFBundleAllowMixedLocalizations`. The package's README says so.

Component code is linted (`tools/component-lint`): a color built from literal values, a system
color, or a size written as a number fails `pnpm test`.

## Testing

- The mapping from variant, size, and state to tokens is plain Swift and plain Kotlin. Expected
  values are looked up by token id, not by repeating the mapping. The Swift tests also run on
  Linux.
- **iOS.** On macOS the tests draw real buttons into a bitmap and read the pixels back: heights,
  fills, outlines, wrapping, right-to-left order, and the spinner.
- **iOS, on a simulator.** `apps/reference-ios` is an app that shows the Button in the states of
  its spec. Its UI tests check what unit tests cannot: the role and name each button is given,
  activation, the disabled and loading states, what a loading button says in English,
  Vietnamese, and Japanese, the room a small button takes and the touch area the system reports
  for it, growth at a large text size, and the system's accessibility audit.
- **Android.** The tests run on the JVM with Robolectric. They read the semantics that
  assistive technology is given, drive the button with touch, mouse, and keys, and read pixels
  back, including the pressed and hovered fills, the focus ring, and a doubled font size. Touches
  are sent just inside and just outside the minimum target, with a mouse, and between two small
  buttons.
- **Android, on an emulator.** `apps/reference-android` is the same app for Android. It installs
  the modules from a Maven repository, as an app does, and its tests check what an
  accessibility service such as TalkBack is given (the name, the "In progress" state, whether
  the button is available, and the area it covers) and run Google's Accessibility Test
  Framework over the screen. A clickable picture planted without a name made that check fail,
  which it had not done under Robolectric.

What the emulator showed about Compose, which the tests now rely on:

- A service is given a button as a container that takes focus and clicks, with the name and a
  node that says "button" under it. A screen reader reads them as one item.
- A service is given the touch target of a small button, not only the visible button, except
  where another item touches it: there the neighbour keeps its own area.

## Not yet done

- **What a screen reader says out loud.** The tests read what each platform gives an assistive
  service; they do not run VoiceOver or TalkBack. On Android a loading button carries "In
  progress" as its state on a node of the progress-bar class, and how TalkBack words that is
  to be heard in the manual audit that precedes a minor release.
- **The audit's Dynamic Type check is not used.** It reports every font that was not made from
  a system text style, and Raincoat scales its token sizes itself. A UI test checks instead that
  buttons grow at a large text size.
- Theme font files. Until a theme bundles them, text uses the system font.
