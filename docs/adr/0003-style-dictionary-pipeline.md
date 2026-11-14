# 0003. Style Dictionary compiles the tokens

- Status: accepted
- Date: 2026-11-14

## Context

The token source has to become CSS variables, Swift, and Kotlin, deterministically.

## Decision

Style Dictionary 5.8 (Apache-2.0) with custom formats per platform. It supports DTCG 2025.10.
The build runs once per combination of theme, color mode, and density. Themes are composed by
this project's own manifest, not by Style Dictionary's support for the DTCG Resolver module,
which was unconfirmed when this was written.

Generated files are committed. CI regenerates them and fails on any difference.

## Consequences

- Output is reviewable in pull requests and cannot be edited by hand unnoticed.
- The custom formats are code this project owns and tests.

## Rejected

- **Terrazzo** (MIT). Strong web output, but no first-party Swift or Kotlin targets.
