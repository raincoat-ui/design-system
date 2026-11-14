# 0005. Minimum OS and browser targets

- Status: accepted
- Date: 2026-11-14

## Decision

| Platform            | Target                                                   | Reason                                                                      |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| iOS                 | iOS 17.0 and later; `swift-tools-version` 6.2            | Observation and current SwiftUI APIs, four OS versions back                 |
| iOS toolchain in CI | Xcode 26.6 on GitHub's `macos-26` image                  | The newest generally available image. Xcode 27 is preview-only on GitHub    |
| Android             | minSdk 26, compileSdk and targetSdk 37                   | API 26 gives variable fonts and `java.time`. Compose requires compileSdk 37 |
| Browsers            | Chrome and Edge 111, Safari 16.4, Firefox 128, and later | The floor of Tailwind CSS v4                                                |

## Consequences

- The Swift package must build on Xcode 26.6 and on newer local Xcode versions, which is why the
  tools version is 6.2.
- Visual snapshots are compared strictly only in CI, because local toolchains differ.
- The iOS 17 simulator is not preinstalled on the CI image; a nightly job downloads it.

## Rejected

- **iOS 15 or 16.** Loses Observation and needs compatibility shims.
- **minSdk 23**, Compose's own floor. No variable fonts.
