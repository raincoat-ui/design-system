# Roadmap

Each milestone is shippable and has explicit exit criteria. A milestone is done when every
criterion holds, not when the code exists.

| Milestone                          | Delivers                                                                                                                                                                                                   | Exit criteria                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 Bootstrap**                   | Repository rules, license and community files, pinned toolchain, CI skeleton, decision records                                                                                                             | A direct push to `main` is rejected. A pull request with a failing job cannot merge. The license gate fails on a planted GPL dependency and passes once it is removed. Workflow lint and OpenSSF Scorecard run clean.                                                                        |
| **M1 One source, three platforms** | Token tiers and schema, the token pipeline, one theme, and a Button on web, iOS, and Android                                                                                                               | One token edit changes every platform's output with no other edits. Drift, contract, contrast, and accessibility checks are green and required. A prerelease installs from npm, the Maven repository, and the Swift mirror into the reference apps, with provenance and a bill of materials. |
| **M2 Second theme**                | A second, deliberately different theme                                                                                                                                                                     | The change touches only the new theme directory and generated files. Every test matrix extends automatically. Each theme installs separately. A theme kept outside this repository builds with the published CLI.                                                                            |
| **M3 v1 components**               | Input, Card, Dialog/Sheet, Tabs, Toast, Typography on all platforms                                                                                                                                        | Each has an accepted RFC. The Definition of Done is green for all seven on three platforms. Vietnamese, CJK, right-to-left, and text-expansion snapshots are in place.                                                                                                                       |
| **M4 Hardening**                   | Performance budgets, deprecation tooling, a rehearsed rollback, a manual accessibility audit, Gradle dependency locking and checksum verification, a license gate for Gradle's test and build dependencies | A prerelease has been rolled back in rehearsal. Reproducible-build checks pass. No high-severity findings are open.                                                                                                                                                                          |
| **M5 1.0**                         | The first stable release                                                                                                                                                                                   | Published with provenance on every registry. Documentation is live. The deprecation policy is in force.                                                                                                                                                                                      |

## The v1 component set

Button, Input, Card, Dialog/Sheet, Tabs, Toast, and Typography. Together they exercise every
token family and every accessibility and localization mechanism, so later components are
additions rather than new foundations. Select, Checkbox, Radio, Switch, Menu, Tooltip, date
picker, table, and navigation bars follow in 1.x.

## Status

M0 was completed on 2026-11-14. Evidence for each exit criterion:

- A direct push to `main` was rejected by the `main` ruleset.
- [Pull request 1](https://github.com/raincoat-ui/design-system/pull/1) planted a
  GPL-2.0-only dependency. The license gate failed and named it, `ci-gate` failed, and the merge
  was refused. Removing the dependency makes the gate pass, as the runs on `main` show.
- Workflow lint and OpenSSF Scorecard ran successfully on the first push.

M1 was completed on 2026-11-20. Evidence for each exit criterion:

- **One token edit changes every platform's output with no other edits.**
  [Pull request 33](https://github.com/raincoat-ui/design-system/pull/33) changed the base
  theme's colors, radii, and label weights in the token source. The web theme stylesheet, the
  Swift package, and the Kotlin modules changed through their generated files alone; the one
  other edit in `packages/` was a sample value in the Kotlin generator's own test. CI fails when
  a generated file differs from what the source produces.
- **Drift, contract, contrast, and accessibility checks are green and required.** `ci-gate` is
  the only required status check on `main`, and it passes only when every job passed: the drift
  check and the contrast checker, the Swift and Kotlin contract tests, the React components'
  accessibility tests, and the reference apps' accessibility audits. It was green on the release
  pull request, [pull request 36](https://github.com/raincoat-ui/design-system/pull/36).
- **A prerelease installs from npm, the Maven repository, and the Swift mirror into the
  reference apps, with provenance and a bill of materials.**
  [0.1.0-next.2](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.2)
  was published on 2026-11-20, and
  [its release run](https://github.com/raincoat-ui/design-system/actions/runs/44716343554)
  installed it into every reference app: from npm into the Next.js and Vite apps (14 and 13
  tests passed in Chromium), from the Maven repository into the Android app (on an emulator),
  and from the Swift mirror into the iOS app (on a simulator). Every published file has a
  provenance attestation, and the bill of materials is attached to the release. It was the
  first release published to npm through trusted publishing: the workflow held no token, and
  the token used for the first publish has been revoked.

What M1 built, one token source driving all three platforms:

- The token source, its linter, and the contrast checker.
- The web theme stylesheet, the Swift package, and the Kotlin modules are generated from it,
  each with a contract test that compares the generated values with the source.

- The Button's spec, from which each platform's variant and size types are generated.
- The React Button (`@raincoat-ui/react`), tested in a real browser against the token source in
  every color mode and density.

- The SwiftUI Button (`RaincoatButton` and the `.raincoat` button style), tested by drawing it
  and reading the pixels back in every color mode and density.

- The Compose Button (`RaincoatButton` in `io.github.raincoat-ui:ui`), tested on the JVM: what
  assistive technology is told, touch, mouse, and keyboard input, and the pixels it draws.

- The release pipeline: one version for every package, a rehearsal of the release on every pull
  request, and publishing to npm, the Maven repository on GitHub Pages, and the Swift mirror,
  with provenance attestations and a bill of materials.

- The first prerelease, [0.1.0-next.0](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.0),
  on 2026-11-16. The Android modules are in the Maven repository and were installed from it by
  the release's own check. Every file has a provenance attestation, and the bill of materials
  is attached to the release.

- The second prerelease, [0.1.0-next.1](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.1),
  on 2026-11-16. A Button takes only the room it shows on iOS and Android, and on iOS a loading
  button says that it is in progress. It is the first release on all three registries: the
  Maven repository, npm (`@raincoat-ui/react` and `@raincoat-ui/theme-base`, with provenance),
  and the Swift mirror `raincoat-ui/design-system-swift`.

- The iOS reference app (`apps/reference-ios`), whose UI tests run the Button on a simulator:
  roles and names, activation, touch targets, text sizes, and the system's accessibility audit.
  It showed that VoiceOver was not told when a button was loading, which is fixed: the button
  says so in words, in six languages.

- The Android reference app (`apps/reference-android`), whose tests run the Button on an
  emulator: what an accessibility service is given, touch targets, and Google's accessibility
  checks.

- The web reference app (`apps/reference-web-vite`), a React app built with Vite, whose tests
  run its production build in Chromium: what assistive technology is given, the mouse, the
  keyboard, and touch, touch targets, the browser's font size, and axe in each system color and
  contrast setting.

- The reference apps on a published release. Each can install Raincoat from where an app
  installs it, npm, the Maven repository, or the Swift mirror, instead of from this
  repository's tree (`tools/release/use-published.mjs`). The release workflow runs all three
  this way once it has published a version, and a maintainer can run them so for any version.
  [The first such run](https://github.com/raincoat-ui/design-system/actions/runs/44600180198),
  on [pull request 31](https://github.com/raincoat-ui/design-system/pull/31), installed
  0.1.0-next.1 into all three: from npm into the web app, from the Maven repository into the
  Android app, and from the Swift mirror into the iOS app. Every test passed: in Chromium, on
  an emulator, and on a simulator.

- The web reference app on Next.js (`apps/reference-web-next`), which renders the Button on a
  server, both in a Client Component and from a Server Component, and loads the styles through
  Tailwind CSS. Its tests run its production build in Chromium: the HTML before any JavaScript
  runs, hydration without a mismatch, forms that post to Server Actions with JavaScript on and
  off, the token colors, touch targets, and axe in each system color and contrast setting. It
  found that a busy Button, or a disabled link styled as one, stopped a Server Component from
  rendering, which is fixed.

- The third prerelease, [0.1.0-next.2](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.2),
  on 2026-11-20. The base theme takes the standards-manual look, a busy Button no longer submits
  its form before React hydrates the page, and a Server Component can render a busy or disabled
  Button. npm published it through trusted publishing, with no token.

M2 was completed on 2026-11-23. Evidence for each exit criterion:

- **The change touches only the new theme directory and generated files.**
  [Pull request 41](https://github.com/raincoat-ui/design-system/pull/41) added Ink, a theme in
  black and white, with red kept for danger and every corner square. Of its 32 files, 15 are the
  theme's directory, `themes/ink/`, and 15 were written by `pnpm tokens:build`: the npm package,
  the Swift target and its contract test, the Gradle module, the Swift package manifest, and the
  theme lists the component tests run over. The other two are its changeset and the lockfile's
  entry for the new npm package. No code changed in the pipeline, the components, or the tests.
  Ink found two tests that held only for the base theme, and
  [pull request 42](https://github.com/raincoat-ui/design-system/pull/42) fixed them before it
  merged.
- **Every test matrix extends automatically.** On pull request 41, with no workflow edited,
  [CI](https://github.com/raincoat-ui/design-system/actions/runs/45056014560) ran every test a
  theme can change in both themes: the React components in Chromium, the SwiftUI and Compose
  components and the Swift and Kotlin contract tests, a reference app job for each platform and
  theme (six), and the release rehearsal. Every job passed.
- **Each theme installs separately.**
  [0.1.0-next.3](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.3) was
  published on 2026-11-22 with Ink in it: `@raincoat-ui/theme-ink` on npm, `theme-ink` in the
  Maven repository, and the product `RaincoatThemeInk` in the Swift mirror.
  [Its last release run](https://github.com/raincoat-ui/design-system/actions/runs/45141345159)
  installed each theme's npm package from the registry into an empty project of its own, and
  found no other theme there. Before publishing, the release built each theme's Swift product on
  its own from the mirror it published, and read each theme's Maven POM, which brings no
  Raincoat module but the token types.
- **A theme kept outside this repository builds with the published CLI.** The same run installed
  `@raincoat-ui/tokens` 0.1.0-next.3 from npm into a theme pack outside the checkout, with a
  fictional theme, and ran its command line there: lint, contrast, and build. The Swift package
  it built passed its tests against the published Swift mirror, and its Gradle build against
  the published Maven repository. The reference apps then passed their tests in both themes
  with the release installed from npm, the Maven repository, and the Swift mirror.

What M2 built, a second theme that needed no code:

- **Themes are directories** ([ADR 0018](adr/0018-theme-directories-and-theme-packs.md)). A
  theme is `themes/<id>/`: a `theme.json`, a `brand.md`, and files that give new values to the
  tokens the base marks overridable. The linter holds it to every rule of the base and to the
  theme rules: only overridable tokens, none added or removed, every color mode changed together.
  Contrast is checked for each theme, and the documentation shows every theme in every mode
  (Foundations, Themes).
- **Everything per theme is generated,** the files that list every theme included: its npm
  package, its Swift target and contract test, the Swift package manifest, its Gradle module,
  and the theme lists the component tests run over. Gradle, the release scripts, and the
  Changesets group find themes by themselves.
- **Every test a theme can change runs in each theme:** the contract tests on Swift and Kotlin,
  the React, SwiftUI, and Compose component tests in every color mode and density, the reference
  apps on a simulator, an emulator, and in Chromium, and the release rehearsal, which installs
  each theme's npm package, Swift product, and Maven module on its own.
- **The token build is published** as `@raincoat-ui/tokens`, with its base source inside. Run
  in a repository of its own, it builds that repository's themes into a theme pack. The release
  rehearsal builds a fictional pack (`tools/release/consumers/theme-pack`) with the packed
  command line from outside the checkout, and tests the Swift package and the Gradle build it
  produces against the staged Swift mirror and Maven repository.

M3 was completed on <DATE>. Evidence for each exit criterion:

- **Each has an accepted RFC.**
  [Pull request 52](https://github.com/raincoat-ui/design-system/pull/52) accepted an RFC for
  each of the six new components on 2026-11-24: [0004 Input](../rfcs/0004-input.md),
  [0005 Card](../rfcs/0005-card.md), [0006 Dialog and Sheet](../rfcs/0006-dialog-and-sheet.md),
  [0007 Tabs](../rfcs/0007-tabs.md), [0008 Toast](../rfcs/0008-toast.md), and
  [0003 Typography](../rfcs/0003-typography.md). The Button's,
  [RFC 0001](../rfcs/0001-foundation-tokens-and-button.md), was accepted in M1. No accepted RFC
  was edited afterwards. Where a component departs from its RFC, its pull request says so under
  "Deviations from the RFC".
- **The Definition of Done is green for all seven on three platforms.** Each new component was
  built on the web, iOS, and Android in one pull request. Each pull request goes through the
  [Definition of Done](../.github/PULL_REQUEST_TEMPLATE/new-component.md) item by item and says
  what was checked locally and what only CI checks:
  [Input](https://github.com/raincoat-ui/design-system/pull/56),
  [Card](https://github.com/raincoat-ui/design-system/pull/64),
  [Dialog and Sheet](https://github.com/raincoat-ui/design-system/pull/65),
  [Tabs](https://github.com/raincoat-ui/design-system/pull/60),
  [Toast](https://github.com/raincoat-ui/design-system/pull/57), and
  [Typography](https://github.com/raincoat-ui/design-system/pull/59). Each merged after
  `ci-gate` passed on its last commit:
  [Input](https://github.com/raincoat-ui/design-system/actions/runs/45435733852),
  [Card](https://github.com/raincoat-ui/design-system/actions/runs/45414062611),
  [Dialog and Sheet](https://github.com/raincoat-ui/design-system/actions/runs/45449162621),
  [Tabs](https://github.com/raincoat-ui/design-system/actions/runs/45390323072),
  [Toast](https://github.com/raincoat-ui/design-system/actions/runs/45424532437), and
  [Typography](https://github.com/raincoat-ui/design-system/actions/runs/45379418148). In each
  of those runs every job passed: the React components in Chromium, Firefox, and WebKit, the
  Swift package on Linux and macOS, the Compose components under Robolectric, the web snapshots,
  and a reference app job for each platform and theme. The reference apps run every component on
  a simulator, on an emulator, and in Chromium, with each platform's accessibility audit. The
  Button was built in M1. Its web snapshots came with pull request 55, and
  [pull request 62](https://github.com/raincoat-ui/design-system/pull/62) fixed the two faults
  they showed (below). The iOS and Android snapshots of all seven came last, in pull requests 61
  and 63. The one item no pull request ticks, the performance budget, applies from M4. The
  [parity matrix](https://raincoat-ui.github.io/design-system/components/parity-matrix/), which
  the documentation build reads from the specs and the source files, shows all seven on all
  three platforms. [<RELEASE-VERSION>](<RELEASE-URL>) was published on <DATE> with all seven, and
  [its release run](<RELEASE-RUN-URL>) installed it from npm, the Maven repository, and the Swift
  mirror into every reference app, whose tests passed in both themes.
- **Vietnamese, CJK, right-to-left, and text-expansion snapshots are in place.**
  [ADR 0019](adr/0019-visual-snapshots.md) defines one matrix for every platform,
  `specs/snapshots.yaml`: 11 snapshots for each component and theme. They are the four color
  modes in English, then, in the light mode, Arabic right to left, the largest text size, and
  Vietnamese, Chinese (Simplified), Japanese, Korean, and expanded English, about 40% longer. Each
  component's `strings.yaml` gives its examples' text in every locale, and the token build
  generates each platform's examples from it.
  [Pull request 55](https://github.com/raincoat-ui/design-system/pull/55) drew the matrix on the
  web, [pull request 61](https://github.com/raincoat-ui/design-system/pull/61) in the iOS
  simulator, and [pull request 63](https://github.com/raincoat-ui/design-system/pull/63) under
  Robolectric for Android. Each platform has 154 baselines, one for each component, theme, and
  snapshot. Each was recorded in CI and reviewed before it was committed. On every platform, CI
  fails on a snapshot that has no baseline or differs from it, on a baseline that belongs to no
  snapshot, and on a component with no snapshot test. The jobs that compare them, `web snapshots`,
  `ios snapshots`, and `android modules`, are all required by `ci-gate`, which passed on the last
  commit of [pull request 61](<PR61>) and [pull request 63](<PR63>).

What M3 built, six components beside the Button, on three platforms:

- **Six components** on the web (`@raincoat-ui/react`), iOS (the `Raincoat` product), and
  Android (`io.github.raincoat-ui:ui`), each from a spec and guidelines, styled only through
  tokens, and shown in each of the four reference apps: Typography's `Text` and `Heading`
  ([pull request 59](https://github.com/raincoat-ui/design-system/pull/59)), Input
  ([56](https://github.com/raincoat-ui/design-system/pull/56)), Card
  ([64](https://github.com/raincoat-ui/design-system/pull/64)), the dialog, alert dialog, and
  sheet ([65](https://github.com/raincoat-ui/design-system/pull/65)), Tabs
  ([60](https://github.com/raincoat-ui/design-system/pull/60)), and Toast
  ([57](https://github.com/raincoat-ui/design-system/pull/57)). On iOS a dialog or sheet is the
  system sheet, and an alert dialog the system alert.
- **Their tokens** ([pull request 54](https://github.com/raincoat-ui/design-system/pull/54)):
  four heading styles, a large body, and a caption; a raised background, a scrim, and outlines
  for controls, errors, and the selected tab; shadows and panel widths; and the tokens each
  component owns. Shadows have types in Swift and Kotlin, and one helper on each platform draws
  them. `card.border.default` is the first component token a theme may override.
- **Specs that describe more.** A spec can have parts, each with its own properties and types,
  as Typography's Text and Heading and the dialog's three kinds do. A property can be a whole
  number, and a default can follow another property. A spec names each platform's
  implementation, and the linter checks that the file exists and mentions it.
- **Documentation from the specs**
  ([pull request 53](https://github.com/raincoat-ui/design-system/pull/53)): a page for every
  component, with renditions drawn from the tokens, and the parity matrix. Foundations shows
  translucent colors, shadows, and panel widths
  ([pull request 58](https://github.com/raincoat-ui/design-system/pull/58)).
- **The snapshot matrix on every platform**, as above, and the React component tests in Firefox
  and WebKit as well as Chromium
  ([pull request 55](https://github.com/raincoat-ui/design-system/pull/55)).
- **What the new tests found, and what was fixed:**
  - The web Button's label lost its padding at the largest text size, and Japanese labels broke
    before a small kana. The web Button now keeps the space around its label and grows taller,
    as the native Buttons do, and Japanese labels break by the strict rules
    ([pull request 62](https://github.com/raincoat-ui/design-system/pull/62)).
  - On Android, Korean broke inside words. Under a Korean locale, text now breaks by phrase,
    which keeps Korean words whole, on Android 13 and later
    ([pull request 66](https://github.com/raincoat-ui/design-system/pull/66)). Android does so
    only between composed syllables, so the components now compose decomposed (NFD) text, such
    as a file name from macOS, before they draw it. An Input's value is left as typed
    ([pull request 63](https://github.com/raincoat-ui/design-system/pull/63)).
  - On iOS, text grew less than the system's at the largest text sizes. The components took the
    scale from `@ScaledMetric`, which scales by a factor of its own and rounds: at the largest
    size it gave 3, where the system's body text is 3.12 times as large. Each component now
    grows its text by the system font's ratio for the text style it follows, and a test compares
    each style with the system's fonts at every text size
    ([pull request 61](https://github.com/raincoat-ui/design-system/pull/61)). At the two
    largest sizes, heading-xl was also drawn smaller than heading-lg. Each heading now grows to
    at least the size of the one below it
    ([pull request 66](https://github.com/raincoat-ui/design-system/pull/66)).
  - On the web, Escape pressed in a dialog closed a toast shown from that dialog, and the dialog
    stayed open. A toast now closes on Escape only while it has focus, and the dialog takes the
    Escape. A Tab pressed right after an arrow key selected a tab could also focus the tab panel
    instead of the link in it. The panel now leaves the Tab order before the browser handles
    another event ([pull request 67](https://github.com/raincoat-ui/design-system/pull/67)).
  - The iOS accessibility audit reports all text in a sheet shorter than the screen as possibly
    clipped at larger text sizes, the system's own text included. The Dialog's UI tests ignore
    that report only inside the open dialog's sheet, and a test of their own checks that each
    dialog's text grows with the text size and lies wholly inside the sheet
    ([pull request 65](https://github.com/raincoat-ui/design-system/pull/65)).
  - Under Robolectric, the first frame Compose asks for after its content is set can be skipped,
    so a pixel capture could show only the window's background, and one Android test failed
    now and then. Every capture now redraws the window first
    ([pull request 63](https://github.com/raincoat-ui/design-system/pull/63)).
- **One limitation is documented, not fixed.** On the web, a toast shown while a dialog or sheet
  is open appears above it. On iOS and Android it appears on the screen behind, where the dialog
  covers it. The Toast guidelines say how to avoid it, and the fix, with an amendment to RFC 0008,
  is planned for M4 ([issue 68](https://github.com/raincoat-ui/design-system/issues/68)).
