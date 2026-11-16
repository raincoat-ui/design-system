# 0015. Web components: adapted shadcn/ui source, styled only with tokens

- Status: accepted
- Date: 2026-11-16
- Amends: [0004](0004-web-stack.md)

## Context

Record 0004 chose React, Tailwind CSS v4, shadcn/ui, and Radix. Building the first component,
the Button, settled how that stack is used.

## Decision

**Source.** A component starts from the shadcn/ui registry source, fetched as JSON from
`https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`. The unmodified file is kept in
`packages/web/.shadcn-upstream/`, and `packages/web/shadcn.lock.json` records its address,
date, and SHA-256. A test fails when a component has no lock entry or an upstream copy has
changed. The shadcn command-line tool is not used: it needs path aliases this package does not
have, and reading the registry directly adds no dependency.

**Styling.** Component classes take every color, size, and duration from a Raincoat custom
property, for example `bg-(--rc-button-primary-bg-default)`. A check on the built stylesheet
fails on a literal color or size, and on any custom property that is not a token.

**Custom property prefix.** Theme stylesheets name every property `--rc-…`. Without a prefix,
names such as `--color-red-500` and `--radius-md` collide with Tailwind's own theme variables.

**Two ways to load the styles**, both tested with the same suite:

| App                  | Imports                                         | Notes                                                                                                                                         |
| -------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Uses Tailwind CSS v4 | A theme, then `@raincoat-ui/react/tailwind.css` | The file points Tailwind at the components' class names, defines two variants, and maps the shadcn/ui color contract onto tokens              |
| Does not             | A theme, then `@raincoat-ui/react/ui.css`       | Compiled ahead of time. No reset, and no cascade layer, so that an app's own unlayered rules (`button { border: 0 }`) cannot undo a component |

**State.** A component's state is in its attributes (`disabled`, `data-disabled`,
`data-loading`), and the styles select on them, so `buttonVariants()` gives the same classes in
every state. Hover and pressed styles apply only to a control that is neither disabled nor
busy.

**Loading.** A busy button is not disabled, so it keeps focus. It sets `aria-busy` and
`aria-disabled`, and a capture-phase handler cancels the click before any other handler sees
it, including the handler of a router link rendered with `asChild`. Because that handler is a
function, a busy button needs a Client Component; an idle one renders in a Server Component.

**Tests.** Component tests run in Chromium through Vitest's browser mode. Expected values come
from the token source, resolved separately from the stylesheet, so a comparison covers the path
from a token to what the browser draws.

## Consequences

- The precompiled stylesheet defines Tailwind's utility class names (`.inline-flex`,
  `.relative`). An app that gives those names another meaning should use the Tailwind path.
- Published JavaScript carries no comments. Tailwind finds class names by reading files as
  text, and a word such as "block" in a comment would otherwise become a class.
- `components.json` is not needed and is not present.
- Chart and sidebar entries of the shadcn/ui contract have no tokens yet and are not mapped.

## Not yet done

- Visual snapshots, and Firefox and WebKit runs (milestone 3).
- A scheduled comparison of `.shadcn-upstream/` with the live registry (milestone 4).
- Bundled fonts. Until a theme ships its font files, text falls back to system fonts.
