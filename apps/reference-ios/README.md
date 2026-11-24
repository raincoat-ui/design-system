# Reference app for iOS

An iOS app that shows every Raincoat component the way an app uses it, and the UI tests that
drive it on a simulator. It uses the Swift package in `packages/ios` directly, so it always
runs the code in this repository. After a release, it runs again with the package resolved from
the Swift mirror.

The UI tests check what the package's unit tests cannot:

- the role and name that assistive technology is given for each component
- activation by touch, and that disabled and loading components ignore it
- what a loading component says, in more than one language
- the room a component takes, and the touch area the system reports for it
- growth at a large text size
- the system's accessibility audit (`performAccessibilityAudit`)

## Run

Open `ReferenceApp.xcodeproj` in Xcode 26 or later and run the `ReferenceApp` scheme, or from the
command line:

```sh
xcodebuild test \
  -project apps/reference-ios/ReferenceApp.xcodeproj \
  -scheme ReferenceApp \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

The app links and applies the base theme. To run it in another theme, run
`node tools/reference/ios-theme.mjs <id>` first: it switches the theme product the project links
and the theme the app and its tests apply, as an app selects its theme. Restore the three files
with git to go back.

CI runs the same tests on every pull request, once for each theme, in the
`reference app (ios, <theme>)` jobs. It starts the
simulator and waits for it first, because a simulator that is still starting can refuse to
launch the app. Each test may take two minutes, and a test that fails is run once more, so a
second failure is a real one.

The test run's first launch of the app is slow, once: on CI it has taken more than two minutes,
and every later launch a few seconds. So that no test's time limit counts it, every test class
is a subclass of `ReferenceAppTestCase`, which launches the app once before the class's first
test.

### Against a published release

To take the package from the Swift mirror, `raincoat-ui/design-system-swift`, at exactly one
version instead of from `packages/ios`:

```sh
node tools/release/use-published.mjs ios 0.1.0-next.1
```

Then run the tests as above. Without a version, the script uses the one this checkout names. It
changes only the package reference in `ReferenceApp.xcodeproj/project.pbxproj`; restore that file
with git to go back. The release workflow runs the app this way once it has published a
version, and a maintainer can for any version: Actions, reference apps, Run workflow.

## Adding a component

Add a screen for it in `ReferenceApp/`, with one example for each state in its spec, and a test
class in `ReferenceAppUITests/` that subclasses `ReferenceAppTestCase`. Both folders are
synchronized with the project, so new files need no change to the project file.

The app shows one screen: the Button's, unless the launch argument `-screen <name>` names another
(`ReferenceApp.swift` lists them). A test class opens its component's screen with it, as
`TypographyTests` does with `-screen typography`, `DialogTests` with `-screen dialog`, and
`TabsTests` with `-screen tabs`. A test class other than `ButtonTests` imports no theme module,
because the theme switch links only the theme under test.

## What the audit does not cover

Two kinds of audit finding are ignored, each for a stated reason in `ButtonTests.swift`:

- Contrast of a disabled control, which accessibility guidelines exempt.
- Dynamic Type. The audit reports any font that was not made from a system text style, and
  Raincoat scales its token sizes itself. `testButtonsGrowWithTheTextSize` checks the growth
  directly.

`DialogTests.swift` also ignores two findings:

- About an element of the system keyboard, or of the typing predictions over it, which a dialog
  with a field in focus shows. They are the system's, and the app cannot describe them.
- Text clipped, for an element inside the open dialog's sheet only. The audit reports every text
  in a sheet shorter than the screen as one that may be clipped at larger text sizes, the
  system's own text and buttons included, in any layout; it reports none in a full-screen
  cover. `testEachDialogGrowsWithItsTextAndShowsEveryTextWhole` checks the dialogs' text
  directly instead: at the default and the largest text size, each sheet grows with its text,
  and every title, description, body, and button lies wholly inside it, where it can be touched.
  Text clipped anywhere else still fails.
