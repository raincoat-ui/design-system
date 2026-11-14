# 0004. Web: React, Tailwind CSS v4, shadcn/ui on Radix

- Status: accepted
- Date: 2026-11-14

## Context

The web target is React with shadcn/ui. shadcn/ui made Base UI its default primitive library in
July 2026 and continues to support Radix.

## Decision

React 19, Tailwind CSS 4, and shadcn/ui components generated with the Radix base
(`shadcn add <component> -b radix`), all MIT. Components are copied into the repository and
restyled only through tokens. A lock file records each component's upstream hash, a pristine
copy is kept for three-way merges, and a scheduled job reports upstream changes.

Theming is CSS variables only, so it works in server components with no provider. Interactive
components are marked as client components file by file.

Tailwind v4 is configured in CSS, so the "preset" this project ships is a CSS file that maps
shadcn's variable contract onto Raincoat's semantic tokens.

## Consequences

- Radix receives new shadcn components later than Base UI may. The component specs do not name
  the primitive library, so switching later is an internal change.

## Rejected

- **Base UI** (MIT). The new shadcn default, but not the stack this project set out to use.
