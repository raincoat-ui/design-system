# 0010. Themes are overlays, shipped one artifact per theme

- Status: accepted
- Date: 2026-11-14

## Context

Raincoat serves several unrelated brands. Apps must differ by theme, never by forked components,
and one client must never receive another client's brand.

## Decision

A theme is a directory of overrides on top of the base tokens. It may override only tokens
flagged as overridable: brand and neutral colors, semantic color mappings per mode, typography,
radius, default density, shadow style, icon set, and an allowlist of component tokens. Spacing,
breakpoints, minimum target sizes, focus ring rules, and all contrast minimums are locked, and a
theme can never add or remove a token.

Each theme supports four color modes (light, dark, and a high-contrast version of each) and two
densities.

Each theme is built and published as its own artifact on every platform. An app selects its
theme at build time by depending on that artifact.

**Where a theme lives.** This repository is public. It carries fictional example themes. A real
brand is committed here only with its owner's written consent; otherwise it lives in a private
theme pack, a small repository built with the published token CLI.

## Consequences

- Adding an app means adding a theme directory.
- Test matrices grow with every theme, so CI runs only what a change affects.
- The token engine must work on a theme directory outside this repository.

## Rejected

- **One package containing all themes.** Leaks brands between clients.
