# 0011. The Claude Design output is optional and isolated

- Status: accepted
- Date: 2026-11-14

## Context

Claude can read a design system and produce on-brand work. That capability is proprietary, so
the repository must work identically without it.

## Decision

A separate package generates, per theme, the plain JSON, Markdown, and HTML files that Claude's
Design System format expects: flat token lists, a brand book, per-component guidelines, and live
previews of the web components. Native components are represented by their spec, guidelines, and
screenshots.

One Claude Design system is produced per app theme. The format gives per-theme values only to
colors and shadows, and unrelated brands also differ in type and radius, so brands cannot share
one system.

CI builds and validates the output. Publishing it needs a Claude login, so the maintainer does
that by hand after a release; it is never a CI step.

Nothing else in the repository imports this package. Deleting it and its CI job removes the
feature completely.

## Consequences

- The format's rules are checked in CI against a dated copy of its documentation, which is
  re-read periodically because the format may change.

## Rejected

- **One shared system with brands as theme ids.** Cannot express per-brand type and radius, and
  the format caps the number of color themes.
