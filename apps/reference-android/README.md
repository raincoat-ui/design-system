# Reference app for Android

An Android app that shows every Raincoat component the way an app uses it, and the tests that
drive it on an emulator. It is never published.

The emulator tests check what the JVM tests of the components cannot:

- what an accessibility service, such as TalkBack, is given for each component: its name, its
  state, whether it is available, and the area it covers
- Google's Accessibility Test Framework, which checks names, touch targets, and contrast
- touches on a real Android runtime

## Run

The app is a Gradle build of its own. It installs the modules from a Maven repository, the way
an app does: by default the one this checkout stages. Start an emulator or connect a device with
Android 11 or later, then:

```sh
./gradlew publishAllPublicationsToStagingRepository
./gradlew -p apps/reference-android connectedDebugAndroidTest
```

Add `-PraincoatTheme=<id>` to build the app with another theme than the base one; CI runs the
tests once for each theme. Add `-PraincoatRepository=https://raincoat-ui.github.io/design-system/maven` and
`-PraincoatVersion=<version>` to run it against a published release instead, or run
`node tools/release/use-published.mjs android <version>` once, which writes both into the app's
own `gradle.properties`; delete that file to go back. The release workflow runs the app this way
once it has published a version, and a maintainer can for any version: Actions,
reference apps, Run workflow.

CI runs the same tests on every pull request, in the `reference app (android, <theme>)` jobs, on an
open-source Android 14 image without Google services, with the screen of a Pixel 6. The tests
expect a phone-sized screen.

## Adding a component

Add a screen for it in `src/main/`, with one example for each state in its spec, and a test
class in `src/androidTest/`.

`MainActivity` shows the Button. Another component's screen has an activity of its own, listed in
`AndroidManifest.xml`, which its test opens: `TypographyActivity` shows Typography, and
`DialogActivity` the Dialog, the alert dialog, and the Sheet.
