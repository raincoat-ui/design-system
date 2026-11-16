# 0014. One license gate per ecosystem, all reading one allowlist

- Status: accepted
- Date: 2026-11-16
- Amends: the "Staging" paragraph of [0009](0009-license-policy.md)

## Context

Record 0009 planned to extend the license gate to Gradle and SwiftPM with OSS Review Toolkit.
When the first Gradle modules were added, a lighter option was tried first and worked.

## Decision

Each ecosystem is gated by the smallest tool that does the job, and every gate reads the same
source, `licenses/allowlist.yml`:

| Ecosystem              | Gate                                                                           | What it checks                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| npm                    | `pnpm licenses:check`, this repository's own script over pnpm's license report | Shipped dependencies against the `ship` scope, development dependencies against `dev`                     |
| Gradle                 | `./gradlew licensee`, the licensee plugin 1.14.1 (Apache-2.0)                  | Dependencies that ship with each Android module, against the `ship` scope                                 |
| Swift                  | None needed yet                                                                | The Swift package has no third-party dependencies. Adding one requires adding its gate in the same change |
| Fonts and brand assets | `pnpm licenses:assets`                                                         | Every file against `licenses/assets.yml`                                                                  |

`pnpm licenses:render` writes `licenses/allowlist.json` from the YAML source for the Gradle
build to read, and CI fails if that file is out of date.

Both gates were proven the same way: a copyleft dependency was planted, the gate failed and
named it, and the gate passed once it was removed.

## Consequences

- No heavyweight scanner to install, configure, and keep current.
- **Known gap:** Gradle's test dependencies and build plugins are not checked. They are
  development tooling and never ship, but the `dev` scope is not yet enforced for Gradle. Closing
  this is part of the hardening milestone.
- The bill of materials for releases is produced separately, when releases are built.

## Rejected

- **OSS Review Toolkit** (Apache-2.0) for everything. One tool and one report, but a large
  installation and a long analysis for three small dependency trees.
