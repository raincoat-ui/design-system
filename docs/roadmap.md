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
  [0.1.0-next.2](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.2) was published on 2026-11-20, and
  [its release run](https://github.com/raincoat-ui/design-system/actions/runs/44716343554) installed it into every reference app: from npm into the Next.js and
  Vite apps (14 and 13 tests passed in Chromium), from the Maven repository into the Android app
  (on an emulator), and from the Swift mirror into the iOS app (on a simulator). Every published
  file has a provenance attestation, and the bill of materials is attached to the release. It
  was the first release published to npm through trusted publishing: the workflow held no
  token, and the token used for the first publish has been revoked.

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

- The third prerelease, [0.1.0-next.2](https://github.com/raincoat-ui/design-system/releases/tag/v0.1.0-next.2), on 2026-11-20. The base theme takes the
  standards-manual look, a busy Button no longer submits its form before React hydrates the
  page, and a Server Component can render a busy or disabled Button. npm published it through
  trusted publishing, with no token.

M2, a second and deliberately different theme, is next.
