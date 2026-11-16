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

M1 is in progress. One token source now drives all three platforms at the token level:

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

Still to come in M1:

- **npm and the Swift mirror for 0.1.0-next.0.** Both are pending a credential: a one-time
  token for the two new npm package names, and a credential for the mirror repository. The
  runbook has the steps; running the `release` workflow by hand then finishes the release.
- The reference apps with their accessibility audits.
