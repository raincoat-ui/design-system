# Roadmap

Each milestone is shippable and has explicit exit criteria. A milestone is done when every
criterion holds, not when the code exists.

| Milestone                          | Delivers                                                                                       | Exit criteria                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 Bootstrap**                   | Repository rules, license and community files, pinned toolchain, CI skeleton, decision records | A direct push to `main` is rejected. A pull request with a failing job cannot merge. The license gate fails on a planted GPL dependency and passes once it is removed. Workflow lint and OpenSSF Scorecard run clean.                                                                        |
| **M1 One source, three platforms** | Token tiers and schema, the token pipeline, one theme, and a Button on web, iOS, and Android   | One token edit changes every platform's output with no other edits. Drift, contract, contrast, and accessibility checks are green and required. A prerelease installs from npm, the Maven repository, and the Swift mirror into the reference apps, with provenance and a bill of materials. |
| **M2 Second theme**                | A second, deliberately different theme                                                         | The change touches only the new theme directory and generated files. Every test matrix extends automatically. Each theme installs separately. A theme kept outside this repository builds with the published CLI.                                                                            |
| **M3 v1 components**               | Input, Card, Dialog/Sheet, Tabs, Toast, Typography on all platforms                            | Each has an accepted RFC. The Definition of Done is green for all seven on three platforms. Vietnamese, CJK, right-to-left, and text-expansion snapshots are in place.                                                                                                                       |
| **M4 Hardening**                   | Performance budgets, deprecation tooling, a rehearsed rollback, a manual accessibility audit   | A prerelease has been rolled back in rehearsal. Reproducible-build checks pass. No high-severity findings are open.                                                                                                                                                                          |
| **M5 1.0**                         | The first stable release                                                                       | Published with provenance on every registry. Documentation is live. The deprecation policy is in force.                                                                                                                                                                                      |

## The v1 component set

Button, Input, Card, Dialog/Sheet, Tabs, Toast, and Typography. Together they exercise every
token family and every accessibility and localization mechanism, so later components are
additions rather than new foundations. Select, Checkbox, Radio, Switch, Menu, Tooltip, date
picker, table, and navigation bars follow in 1.x.

## Status

M0 is in progress. The parts of M0 that need the hosted repository (merge rules, the first CI
run, Scorecard) are completed when the repository is first pushed.
