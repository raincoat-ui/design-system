# 0001. One monorepo with pnpm workspaces and Turborepo

- Status: accepted
- Date: 2026-11-14

## Context

Tokens and component specs are one source that must drive three platforms. A token change has to
land together with every platform's regenerated output, or the outputs drift.

## Decision

One repository holds the token source, the specs, and all platform packages. pnpm 12.18.0 (MIT)
manages JavaScript workspaces. Turborepo (MIT) orchestrates tasks, including the Gradle and
SwiftPM builds, once the first workspace package exists in milestone 1.

## Consequences

- One pull request can change a token and all outputs, and one drift check covers them.
- CI must filter by path so that a web-only change does not build iOS.
- pnpm 12 is a new major line. If tooling lags behind it, the fallback is pnpm 11.

## Rejected

- **A repository per platform.** Guarantees drift and triples CI and governance.
- **Nx** (MIT). More machinery than this project needs.
