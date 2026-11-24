# Contributing to Raincoat

Thank you for helping. This page tells you what a change needs before it can merge. Every rule
here is enforced by CI, so a green pull request is a mergeable one.

## Before you start

- **Small fixes** (typos, bugs, docs): open a pull request directly.
- **A new component, or adding, renaming, or removing a token**: open an
  [RFC](rfcs/README.md) first. CI rejects such changes when they do not reference an accepted RFC.
- **A new theme**: use the "New theme" issue form. Themes of real brands are only accepted with
  the brand owner's consent, because everything in this repository is public.

## Setup

```sh
pnpm install     # Node.js 24 and pnpm; installs pinned tools and git hooks
pnpm validate    # the checks CI runs
```

Each platform package has tests of its own:

| Package                     | Command                                  | Needs                                             |
| --------------------------- | ---------------------------------------- | ------------------------------------------------- |
| React (`packages/web`)      | `pnpm web:typecheck` and `pnpm web:test` | Chromium, installed once with `pnpm web:browsers` |
| Swift (`packages/ios`)      | `swift test --package-path packages/ios` | Swift 6.2 or later                                |
| Kotlin (`packages/android`) | `./gradlew test licensee`                | JDK 21 and the Android SDK (platform 37)          |

CI also runs the React tests in Firefox and WebKit, one job each. `RAINCOAT_BROWSER=firefox` or
`RAINCOAT_BROWSER=webkit` runs them in that browser on your machine, once Playwright has
installed it.

The reference apps show the components in an app and test them on a simulator
([iOS](apps/reference-ios/README.md)), an emulator ([Android](apps/reference-android/README.md)),
and in Chromium, in a single-page app ([Vite](apps/reference-web-vite/README.md)) and in an app
rendered on a server ([Next.js](apps/reference-web-next/README.md)), both with
`pnpm web:reference`; each README has the command.

## Commits and pull requests

1. **Sign off every commit.** Use `git commit -s`. The sign-off line certifies the
   [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change or
   have the right to submit it under the project license. There is no separate contributor
   agreement.
2. **Use Conventional Commits** for commit messages and the pull request title, for example
   `feat(tokens): add focus ring tokens` or `fix(web): restore dialog focus on close`.
   Pull requests are squash-merged, so the title becomes the commit on `main`.
3. **Say what changed for the people who use the packages.** If the change alters what a package
   ships (component code, tokens, the theme), run `pnpm changeset` and commit the file it writes.
   Tests, documents, and development dependencies do not need one. See
   [.changeset/README.md](.changeset/README.md).
4. **Keep generated files generated.** Never edit a file marked `GENERATED`. Change its source
   and regenerate; CI compares the two.
5. **Do not record snapshot baselines locally.** Visual baselines are recorded in CI so that no
   one's machine influences them. See [Visual snapshots](#visual-snapshots) for how to accept
   them.

## What CI checks

| Check              | What fails it                                                              |
| ------------------ | -------------------------------------------------------------------------- |
| Lint and format    | `pnpm lint` reports anything                                               |
| Unit tests         | `pnpm test` fails                                                          |
| License gate       | A dependency with a license outside [the allowlist](licenses/ALLOWLIST.md) |
| Asset licenses     | A font or brand asset missing from `licenses/assets.yml`                   |
| Changeset          | A change to what a package ships with no changeset file                    |
| Release rehearsal  | The packages cannot be built, packed, or installed the way an app would    |
| Sign-off and title | A commit without `Signed-off-by`, or a non-conventional pull request title |
| Secret scan        | A credential in the diff or history                                        |
| Vulnerability scan | A dependency with a known vulnerability                                    |
| Workflow lint      | An unsafe or invalid GitHub Actions workflow                               |
| Visual snapshots   | A snapshot with no baseline, or one that differs from its baseline         |

Two more checks cover the token source: `pnpm tokens:lint` fails on an invalid token, a broken
reference, or a tier violation, and `pnpm tokens:contrast` fails when any declared color pair
misses its contrast requirement in any color mode. See
[docs/contributing/add-a-token.md](docs/contributing/add-a-token.md).

The React components add three more: they are tested in Chromium, Firefox, and WebKit against
the token source (colors, sizes, keyboard, focus, and an automated accessibility audit in every
color mode); the built stylesheet may contain no literal color or size; and every component must
have an entry in `packages/web/shadcn.lock.json`.

Every component is also tested in the reference apps, on an iOS simulator, an Android emulator,
and in Chromium: what assistive technology is told, touch targets, and each platform's
accessibility audit.

## Visual snapshots

Each component is drawn in every snapshot of [`specs/snapshots.yaml`](specs/snapshots.yaml), in
every theme: all the examples of its spec together, in the four color modes, right to left, at
the largest text size, and in Vietnamese, Chinese, Japanese, Korean, and expanded English. The
text the examples show is in the component's `strings.yaml`, beside its spec. CI compares each
drawing with its baseline, and fails when a baseline is missing or differs. Each platform has a
job of its own:

| Platform | Job               | Artifact            | Baselines                                      |
| -------- | ----------------- | ------------------- | ---------------------------------------------- |
| Web      | `web snapshots`   | `web-snapshots`     | `packages/web/test/snapshots/__screenshots__`  |
| iOS      | `ios snapshots`   | `ios-snapshots`     | `packages/ios/__screenshots__`                 |
| Android  | `android modules` | `android-snapshots` | `packages/android/ui/src/test/__screenshots__` |

A drawing differs from its baseline when a single pixel does: on the web, by more than
pixelmatch's default color threshold; on iOS, when one of the pixel's channels differs by more
than 8 of 255.

Baselines are recorded in CI, never on your machine, because your fonts, browser, and system are
not the runner's. When a change alters how a component looks, or adds one:

1. Push it. The platform's job fails and uploads what it drew as the run's artifact: `actual/`
   holds the new images, laid out as the baselines are, and `diff/` marks in red where each
   differs from its baseline.
2. Download the artifact, from the run's summary page or with the GitHub command line:

   ```sh
   gh run download <run-id> --name web-snapshots --dir /tmp/web-snapshots
   ```

3. Look at every image. Accept only the changes you meant.
4. Copy them over the baselines, commit, and push. The job then passes.

   ```sh
   cp -R /tmp/web-snapshots/actual/. packages/web/test/snapshots/__screenshots__/
   git add packages/web/test/snapshots/__screenshots__
   git commit -s -m "test(web): accept the new snapshots of the button"
   ```

   For iOS, download `ios-snapshots` and copy its `actual/` over `packages/ios/__screenshots__/`.

You can also draw the snapshots on your machine, to look at them. That compares nothing and
writes no baseline; do not copy what it draws over the baselines.

- Web: `pnpm web:snapshots` draws them into `packages/web/test-results/snapshots/local/`.
- iOS, on a Mac with Xcode, in an iOS simulator, from `packages/ios`:

  ```sh
  TEST_RUNNER_RAINCOAT_SNAPSHOTS=1 xcodebuild test -scheme Raincoat-Package \
    -destination 'platform=iOS Simulator,name=iPhone 17' \
    -only-testing:RaincoatTests/VisualSnapshots
  ```

  It draws them into `packages/ios/test-results/snapshots/local/`. Without that variable the
  snapshots are left out, and `swift test` on macOS never draws them: SwiftUI there does not
  enlarge text for a larger Dynamic Type size.

**Android.** The Compose components' snapshots are drawn with Robolectric, in the
`android modules` job, and compared with `packages/android/ui/src/test/__screenshots__`. The job
uploads what it drew as the `android-snapshots` artifact, with `actual/` and `diff/` as on the
web. Accept them the same way:

```sh
gh run download <run-id> --name android-snapshots --dir /tmp/android-snapshots
cp -R /tmp/android-snapshots/actual/. packages/android/ui/src/test/__screenshots__/
git add packages/android/ui/src/test/__screenshots__
```

`./gradlew :ui:testDebugUnitTest` draws them on your machine, into
`packages/android/ui/build/snapshots/local/`, and compares nothing. A component with an Android
implementation needs `<Component>SnapshotTest.kt` in
`packages/android/ui/src/test/kotlin/io/github/raincoatui/ui/snapshots/`, which draws one instance
of its generated examples, as `ButtonSnapshotTest.kt` does; the tests fail until it has one.

To give a new component its snapshots, write its `strings.yaml` (`pnpm tokens:lint` says what is
missing), run `pnpm tokens:build`, and add a test on each platform that draws one instance of its
examples:

- Web: `packages/web/test/snapshots/<id>.snapshots.test.tsx`.
- iOS: `packages/ios/Tests/RaincoatTests/Snapshots/<Component>Snapshots.swift`, a test in the
  `VisualSnapshots` suite that passes `<component>Examples` to `expectSnapshot`, as
  `ButtonSnapshots.swift` does.

The web snapshots fail when a component spec has no snapshot test, and the iOS snapshots when a
spec that names a SwiftUI implementation has none. [Record 0019](docs/adr/0019-visual-snapshots.md)
describes the matrix, and how iOS and Android draw it.

## Dependencies

Every dependency, font, and icon must be free or open source under an OSI-approved license on
the allowlist. Fonts must be OFL-1.1. If you believe an exception is justified, say why in the
pull request; exceptions are individual, dated, and recorded in `licenses/curations.yml`.

Versions are pinned exactly, and versions published less than seven days ago are refused, except
Raincoat's own `@raincoat-ui` packages, which the reference apps install as soon as a release is
published.

## Borrowing from other design systems

Compare against the systems in [docs/research/prior-art.md](docs/research/prior-art.md), and
borrow behaviour and naming conventions freely. Copy code, tokens, or assets only when the
source license is on the allowlist, and add the attribution to `NOTICE`. Never copy brand assets.

## License of your contribution

By contributing you agree that your contribution is licensed under
[Apache-2.0](LICENSE), the license of this project.
