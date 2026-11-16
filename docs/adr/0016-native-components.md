# 0016. Native components follow the platform where it knows better

- Status: accepted
- Date: 2026-11-16

## Context

The component specs are platform-neutral, and the tokens are the same values everywhere. Building
the SwiftUI Button raised four places where copying the web implementation would have made a
worse iOS component.

## Decision

A native component follows its spec and takes every color and size from tokens. Where the
platform already provides a behavior that people can configure, the component uses the
platform's.

| Topic        | Decision                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names        | Swift types carry the prefix `Raincoat` when the plain name belongs to SwiftUI: `RaincoatButton`, not `Button`. A `ButtonStyle`, `.raincoat(variant:size:)`, gives the same look to a `Link`, a `Menu`, or a `NavigationLink`             |
| Disabled     | The platform's own mechanism: `disabled(_:)` on iOS. There is no `disabled` parameter                                                                                                                                                     |
| Focus        | iOS draws the system focus indicator. People set its color, contrast, and size under Full Keyboard Access, and a ring of our own would override their choice. The focus ring tokens are used on the web                                   |
| Touch target | The button's layout size is at least the minimum target, and the visible container is centered in it. A small button therefore takes more room than it shows, which is how both platforms' own controls behave                            |
| Text size    | The label and icons grow with the person's text size setting. The space above and below the label stays as it is, so the button grows taller instead of clipping                                                                          |
| Loading      | The button stays enabled, so it keeps focus, and ignores activation. The spinner presents itself to assistive technology as the system's progress indicator, which says "in progress" in the person's language without strings of our own |
| Fonts        | A text style uses the first family of its font stack that is installed or registered by the app, and the system font otherwise                                                                                                            |

Component code is linted (`tools/component-lint`): a color built from literal values, a system
color, or a size written as a number fails `pnpm test`.

## Testing

- The mapping from variant, size, and state to tokens is pure Swift and is tested on Linux and
  macOS. Expected values are looked up by token id, not by repeating the mapping.
- On macOS the tests draw real buttons into a bitmap and read the pixels back: heights, fills,
  outlines, the touch target, wrapping, right-to-left order, and the spinner.

## Not yet done

- **Accessibility as assistive technology sees it.** SwiftUI builds its accessibility tree only
  for a real assistive client, so unit tests cannot read it. The role, the name, the busy
  announcement, and an accessibility audit are checked by UI tests in the iOS reference app,
  which is the next piece of milestone 1. Until then the loading announcement is unverified.
- Tests at larger text sizes, which need an iOS simulator.
- Theme font files. Until a theme bundles them, text uses the system font.
