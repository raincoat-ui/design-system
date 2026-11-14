# 0002. DTCG 2025.10 JSON is the token source; no design tool is

- Status: accepted
- Date: 2026-11-14

## Context

The token source must be readable by any tool, reviewable in a pull request, and free of
proprietary formats.

## Decision

Tokens are written by hand as JSON in the Design Tokens Community Group format, version 2025.10
(the first stable release). They live in three tiers: primitive, semantic, component. Each tier
may reference only the tier below it. Every token has a description.

Colors are restricted to sRGB, HSL, and OKLCH values or a reference to another token.

No design tool is a source of truth. Penpot (MPL-2.0) may import generated tokens, one way.

## Consequences

- Designers propose token changes through pull requests or an RFC.
- A JSON Schema and a lint step enforce the rules; nothing depends on a vendor.

## Rejected

- **Figma Variables.** Proprietary.
- **Penpot as the source.** Its export is not strict DTCG 2025.10.
- **The Tokens Studio format.** Tied to one tool's notion of sets and themes.
