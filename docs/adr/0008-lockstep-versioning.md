# 0008. One version for every package

- Status: accepted
- Date: 2026-11-14

## Context

A token change ships to every platform at once, and statements such as "Button is stable on all
platforms" need a single version to refer to.

## Decision

All published packages share one semantic version, managed with Changesets (MIT) as a fixed
group. Changesets is added with the first publishable package in milestone 1.

Deprecation policy: an API or token is deprecated in a minor release, with generated deprecation
markers on each platform and a kept alias. It is removed no earlier than the next major release,
at least two minor releases and 90 days later. CI blocks earlier removal.

Before 1.0, minor releases may break, with migration notes.

## Consequences

- A fix on one platform releases a new version of all packages. That is acceptable for the
  clarity it buys.
- Rollback is a forward fix or moving the npm `latest` tag back; nothing is unpublished.

## Rejected

- **Independent versions per package.** Flexible, but parity becomes a matrix of versions.
- **release-please** (Apache-2.0). No fixed-group model across ecosystems.
