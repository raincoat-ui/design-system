# 0019. Visual snapshots: one matrix from the specs, baselines recorded in CI

- Status: accepted
- Date: 2026-11-24
- Amends: [0015](0015-web-components.md), [0016](0016-native-components.md)
- Amended: 2026-11-24, iOS draws its snapshots in a simulator, through a window rather than
  `ImageRenderer`, at a scale of 2, in a job of its own, with its baselines in
  `packages/ios/__screenshots__`

## Context

Milestone 3 ends when Vietnamese, CJK, right-to-left, and text-expansion snapshots are in place.
The Definition of Done asks every component for snapshots in every theme, all four color modes,
left-to-right and right-to-left, the largest text size, and the Vietnamese, Chinese, Japanese,
Korean, and expanded-text locales. Seven components need them, on three platforms. Record 0015
left visual snapshots, and Firefox and WebKit runs, to this milestone. CONTRIBUTING already says
that baselines are recorded in CI, never on a contributor's machine.

## Decision

**One matrix, defined once.** `specs/snapshots.yaml` lists the snapshots every component has, in
every theme. It covers each dimension once rather than every combination of them: the four color
modes in English, then, in the light mode, Arabic right to left, the largest text size, and
Vietnamese, Chinese (Simplified), Japanese, Korean, and expanded English. That is 11 snapshots
per theme and component. A snapshot draws all the examples of the component's spec together, as
a specimen, so an example added to a spec is in every snapshot without an edit to the matrix.
`schemas/snapshots.schema.json` and the spec linter (`pnpm tokens:lint`) check the matrix.

**The examples' text, defined once.** `specs/components/<id>/strings.yaml` gives the text of each
example of the spec, by the content it fills, such as `label`, in every locale of the matrix. The
linter fails when an example or a locale has no text, when text is given for anything else, when
an example's English differs from a label its spec gives, and when text is not in Unicode's
composed form (NFC), which is how apps ship Vietnamese. The expanded pseudo-locale, `en-XA` (the
tag Android gives its own), is never written by hand: the token build derives it from English,
with every letter accented above or below, whole words added until the text is about 40% longer,
and brackets around it.

**Generated for every platform.** `pnpm tokens:build` writes the matrix, and each spec's examples
with every property of each instance and their text in every locale, into each platform's tests:
`packages/web/test/snapshots/generated/snapshots.ts`,
`packages/ios/Tests/RaincoatTests/Generated/Snapshots.swift`, and
`packages/android/ui/src/test/kotlin/io/github/raincoatui/ui/generated/Snapshots.kt`. A property
with a fixed set of values has the type generated from the spec, as components do. Each platform
writes only the harness that draws one instance.

**The largest text size** is 200% of the root font size on the web, the size at which WCAG asks
text to work; the `accessibility5` Dynamic Type size on iOS, the largest there is; and a font
scale of 2 on Android, the largest Android 14 offers. The matrix states each.

**Web.** The snapshots are Vitest browser tests in Chromium, one project per theme, like the
component tests, and they load the theme's stylesheet the same way. A specimen is a stage 480px
wide with the snapshot's `data-theme`, `dir`, and `lang`, and the root font size of its text
size. `toMatchScreenshot` compares it with
`packages/web/test/snapshots/__screenshots__/<theme>/<component>/<snapshot>.png`; no pixel may
differ beyond pixelmatch's default color threshold. No theme ships its fonts yet (0015), so the
text is set in the system's fonts: on the runner, Ubuntu's `fonts-noto-core` and
`fonts-noto-cjk`. `pnpm web:test` leaves the snapshots out and `pnpm web:snapshots` runs them.

**Baselines are recorded in CI, and accepted from what CI drew.** Only CI compares. A missing or
different baseline fails the `web snapshots` job, which uploads what it drew for those as the
`web-snapshots` artifact: `actual/`, laid out as the baselines are, and `diff/`, which marks
where each differs from its baseline. A contributor downloads the artifact, looks at each image,
copies `actual/` over the baselines, and commits them; CONTRIBUTING has the steps. Anywhere else,
`pnpm web:snapshots` saves the images under `packages/web/test-results/`, which git ignores, and
never writes a baseline, because a machine's fonts and browser are not the runner's. Before the
snapshots run, a check fails on a component spec that has no snapshot test, and on a baseline
that belongs to no theme, component, or snapshot.

**iOS and Android implement the same matrix** in the pixel tests they already have, from the
generated `allSnapshots` and `<component>Examples`:

- iOS draws with `ImageRenderer` at a scale of 1, as `ButtonRenderingTests` does: for each theme
  in `allThemes` and each snapshot, the component's examples with the text of the snapshot's
  locale, in its color mode, with `\.layoutDirection`, `\.locale`, and `dynamicTypeSize` from the
  snapshot. It encodes the image as PNG and compares it with a baseline in a `__screenshots__`
  directory of the same layout. The `swift package (macos)` job runs it and uploads what it drew;
  Linux has no SwiftUI and skips it.
- Android draws with Robolectric and `captureToImage` at one pixel per dp, as
  `RaincoatButtonTest` does: the same examples with `LocalLayoutDirection`, a `Density` whose
  `fontScale` is the snapshot's, and the snapshot's locale. The `android modules` job runs it and
  uploads what it drew.

Both record baselines only in CI, fail on a missing or different one, and have them accepted the
same way as the web.

**Amended 2026-11-24: iOS.** Building the iOS snapshots changed five things above and settled
what was left open.

- iOS draws the snapshots in an iPhone simulator, with `xcodebuild test`, not on macOS. On
  macOS the components' scaled metrics ignore the Dynamic Type size: there, `accessibility5`
  drew text at its default size, and the check below failed. The simulator draws with iOS and
  its fonts, as an iPhone does. The tests are compiled for iOS only.
- iOS draws a specimen through a window, not with `ImageRenderer`. `ImageRenderer` draws only
  the views SwiftUI draws itself, and leaves out those UIKit provides, such as the text field of
  an Input and the scroll view of the Tabs. The specimen is shown by a `UIHostingController` in a
  window of its own, 480 points wide, in the test runner's scene, and the window's traits are the
  snapshot's: light or dark, the contrast, the text size, and the layout direction. The window is
  drawn with `drawHierarchy(in:afterScreenUpdates:)`, which draws nothing for a window that is
  not shown in a scene; a snapshot it cannot draw fails. Nothing in the window animates, so a
  spinner is drawn where it starts.
- An alert dialog is left out of the iOS snapshots. On iOS it is the system alert, which the
  platform draws, not Raincoat.
- iOS draws at a scale of 2, the smaller of an iPhone's two, so a specimen 480 points wide is 960
  pixels wide and its text can be read as a person sees it.
- The snapshots run in an `ios snapshots` job of their own, as the web's do, which uploads the
  `ios-snapshots` artifact. They run only when `RAINCOAT_SNAPSHOTS` is set, which xcodebuild
  passes to the tests from `TEST_RUNNER_RAINCOAT_SNAPSHOTS`. The simulator reads the baselines
  from the checkout and writes what it drew there, where the job collects it.
- The baselines are in `packages/ios/__screenshots__/<theme>/<component>/<snapshot>.png`, outside
  the package's targets. SwiftPM warns about every file in a target that is not source, and the
  Swift mirror, which every app that uses the package clones, copies `Tests/`.
- A drawn pixel matches its baseline when each of its channels is within 8 of 255 of the
  baseline's. One pixel that does not match fails the snapshot.
- The text is set in the snapshot's language (`typesettingLanguage`), as on a device set to that
  language, so that line height, line breaks, and spacing follow its script.
- Each snapshot checks that its text size is in effect: the largest one enlarges text.
- Each component's test is `Tests/RaincoatTests/Snapshots/<Component>Snapshots.swift`. The run
  fails when a spec that names a SwiftUI implementation has no such test, and on a baseline that
  belongs to no theme, component, or snapshot.
- At a scale of 2 an iOS baseline is larger than a web one: 2.1 MB for the Button's 22, and
  5.1 MB for Typography's, whose largest-text specimen is 7,015 pixels tall.

**Firefox and WebKit.** The React component tests, not the snapshots, also run in Firefox and
WebKit, in CI, one job per browser, chosen with `RAINCOAT_BROWSER`. What a test asks of the
browser beyond the page (moving the pointer away, emulating reduced motion or a dark color
scheme) goes through Playwright, which does it in every browser, rather than Chromium's DevTools
protocol. Only Chromium can turn on a touch screen in a page that is already open, so the one
test of touch targets runs in Chromium alone. The snapshots stay in Chromium: each browser sets
text a little differently, and three sets of baselines would triple what a reviewer looks at
without testing more of the components.

## Consequences

- A new component needs a `strings.yaml` before the token build passes, and a web snapshot test
  before the snapshots run. The Definition of Done asks for both.
- A change to how a component looks fails CI until the new baselines are committed, in the same
  pull request, where reviewers see the images.
- A new runner image, new fonts in Ubuntu, or a Playwright update that brings a new Chromium can
  change many baselines at once. Each is accepted the same way, in the pull request that brings
  the change; a dependency update of Playwright cannot merge without it.
- The baselines add about 30 KB per image: about 700 KB for the Button's 22 on the web.
- Until themes ship their fonts, the snapshots show the system's fonts, not each theme's.
- Firefox gives a button `:active`, which a pressed fill selects, only while a pointer presses
  it. A button held down with Space keeps its fill at rest there, where Chromium and WebKit show
  it pressed. The tests press with the pointer in every browser, and check a held key as each
  browser draws it.
- A specimen taller than the snapshots' viewport (4096px) fails, since a screenshot shows nothing
  below it.

## Rejected

- Every combination of theme, color mode, direction, text size, and locale: about 220 images per
  component on each platform, too many to review, for little more than the 11 show.
- One image per example: six times as many files for the Button, and the examples are easier to
  compare side by side.
- Recording baselines locally, or in a container that imitates the runner: CONTRIBUTING rules out
  the first, and the second still depends on each contributor's setup.
- Playwright Test's `toHaveScreenshot`: the component tests already run in Vitest's browser mode,
  and a second runner would repeat the per-theme projects and the stylesheet setup.
- A hosted visual review service: an account, a token in CI, and baselines kept outside the
  repository.
- Loading each theme's own font in the snapshots: the base theme's font is part of the
  documentation site, not of the theme, and an app without it sees the system's fonts.
- Writing the expanded pseudo-locale by hand: it would drift from the English it stands for.
