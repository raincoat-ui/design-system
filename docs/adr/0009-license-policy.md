# 0009. Apache-2.0, an allowlist, and a blocking license gate

- Status: accepted
- Date: 2026-11-14

## Context

Every tool, library, font, and icon set must be free or open source under an OSI-approved
license, and nothing copyleft may reach the applications that use Raincoat.

## Decision

**This project's license is Apache-2.0**: permissive, with an explicit patent grant, compatible
with every allowed dependency, and it lets the project be closed later without relicensing.
Brand assets of real brands are not covered and are marked `LicenseRef-Brand-Proprietary`.

**Allowlist.** `licenses/allowlist.yml` is the single source, published as
`licenses/ALLOWLIST.md`. Shipped code may use MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC,
0BSD, and Zlib. Development tooling may also use MPL-2.0, EPL-2.0, and Python-2.0. Fonts must be
OFL-1.1.

**Gate.** `pnpm licenses:check` fails the build on any npm dependency outside the allowlist,
evaluating SPDX expressions properly (`OR`, `AND`, `WITH`). `pnpm licenses:assets` fails on any
font or brand asset missing from `licenses/assets.yml`. Exceptions are individual, pinned to an
exact version, dated, and expire.

**Staging.** At milestone 0 the only ecosystem is npm, and the gate reads pnpm's own license
report. When Gradle and SwiftPM dependencies arrive in milestone 1, the gate is extended to them
with OSS Review Toolkit (Apache-2.0), which also produces the bill of materials; if it cannot
read this repository's lockfiles, the fallback is cdxgen (Apache-2.0) feeding the same allowlist.

## Consequences

- Adding a dependency with an unlisted license is a deliberate, reviewed act.
- Packages installed only on other operating systems are checked on the CI runner, not locally.

## Rejected

- **MIT** for this project. No patent grant.
- **MPL-2.0** for this project. File-level copyleft adds notice duties for applications.
- **APCA** for contrast math. Its license is not OSI-approved; WCAG 2.x math is used instead.
- **Renovate** (AGPL-3.0). Dependabot (MIT) covers the need.
