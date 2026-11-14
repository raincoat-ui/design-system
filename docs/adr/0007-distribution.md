# 0007. Distribution through npm, a static Maven repository, and a Swift mirror

- Status: accepted
- Date: 2026-11-14

## Decision

| Platform | Where                                                                                                           | How                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Web      | npmjs.com, scope `@raincoat-ui`                                                                                 | Published from CI by trusted publishing, with provenance and no stored token                  |
| Android  | A static Maven repository at `https://raincoat-ui.github.io/design-system/maven`, group `io.github.raincoat-ui` | Written by Gradle's `maven-publish` and served by GitHub Pages; consumers need no credentials |
| iOS      | SwiftPM over git from `raincoat-ui/design-system-swift`                                                         | A mirror repository that CI pushes to; never edited by hand                                   |

Each theme is its own artifact on every platform, so an app receives only its own brand.

Published versions are never overwritten, unpublished, or retagged.

## Consequences

- The Maven repository URL and group id are permanent parts of consumers' build files.
- The Swift mirror needs one stored secret, a deploy key.
- The first publish of a new npm package name may need a one-time token before trusted
  publishing can be enabled for it.

## Rejected

- **Maven Central.** Since October 2026 it is free only for community open source; artifacts
  that support a commercial offering need a paid tier, and a white-label design system risks
  that classification.
- **A `Package.swift` at the root of this repository.** Every consumer would clone all snapshot
  images.

Self-hosted fallbacks: Verdaccio (MIT) for npm, Reposilite (Apache-2.0) for Maven, any git host
for Swift.
