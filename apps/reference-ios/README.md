# Reference app for iOS

An iOS app that shows every Raincoat component the way an app uses it, and the UI tests that
drive it on a simulator. It uses the Swift package in `packages/ios` directly, so it always
runs the code in this repository.

The UI tests check what the package's unit tests cannot:

- the role and name that assistive technology is given for each component
- activation by touch, and that disabled and loading components ignore it
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

CI runs the same tests on every pull request, in the `reference app (ios)` job.

## Adding a component

Add a screen for it in `ReferenceApp/`, with one example for each state in its spec, and a test
class in `ReferenceAppUITests/`. Both folders are synchronized with the project, so new files
need no change to the project file.

## What the audit does not cover

Two kinds of audit finding are ignored, each for a stated reason in `ButtonTests.swift`:

- Contrast of a disabled control, which accessibility guidelines exempt.
- Dynamic Type. The audit reports any font that was not made from a system text style, and
  Raincoat scales its token sizes itself. `testButtonsGrowWithTheTextSize` checks the growth
  directly.
