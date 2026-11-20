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
`data-loading`, `data-unhydrated`), and the styles select on them, so `buttonVariants()` gives the same classes in
every state. Hover and pressed styles apply only to a control that is neither disabled nor
busy.

**Loading.** A busy button is not disabled, so it keeps focus. It sets `aria-busy` and
`aria-disabled`, and a capture-phase handler cancels the click before any other handler sees
it, including the handler of a router link rendered with `asChild`. Because that handler is a
function, a busy button needs a Client Component; an idle one renders in a Server Component.

**Before hydration.** In HTML from a server, that handler exists only once React hydrates the
button, and with JavaScript off it never does. Until then the browser refuses activation
itself. A busy button is also `disabled`, which stops a click, Enter and Space on it, and
Enter in a field, which clicks the form's first submit button. A link rendered with `asChild`
that is busy or disabled cannot be disabled, so it leaves the Tab order and ignores the pointer
(`pointer-events: none`). Either carries `data-unhydrated` until React hydrates it, then drops
it with the rest: a busy button can take focus again, and the handler refuses activation from
then on. A busy button keeps its busy look throughout. The cost is that a busy button cannot be
focused before hydration; nothing a person did made it busy, so there is no focus to keep. A
button that becomes busy after hydration is never disabled. Hydration is read with
`useSyncExternalStore`, which Server Components do not have; there the Button does not ask, so
an idle one still renders in a Server Component. An idle Button is not rendered a second time
after hydration.

**Tests.** Component tests run in Chromium through Vitest's browser mode. Expected values come
from the token source, resolved separately from the stylesheet, so a comparison covers the path
from a token to what the browser draws. For server rendering, a test puts what
`react-dom/server` renders into the page, tries every way of activating it, and then hydrates
it.

**In an app.** `apps/reference-web-vite` is a React app built with Vite that shows the Button in
the states of its spec and loads the precompiled stylesheet. Its Playwright tests run the
production build in Chromium and check what only an app shows: the role, name, and state that
Chromium's accessibility tree gives each control, keyboard order, touch on a phone-sized
screen, the browser's font size setting, and axe in each system color and contrast setting.
Chromium moves a tap that lands near a target onto it, up to 8px beyond the edge in these tests,
so the edge of a touch target is checked by hit testing rather than by tapping.

## Consequences

- The precompiled stylesheet defines Tailwind's utility class names (`.inline-flex`,
  `.relative`). An app that gives those names another meaning should use the Tailwind path.
- Published JavaScript carries no comments. Tailwind finds class names by reading files as
  text, and a word such as "block" in a comment would otherwise become a class.
- `components.json` is not needed and is not present.
- Chart and sidebar entries of the shadcn/ui contract have no tokens yet and are not mapped.
- A link cannot be disabled in HTML. Before hydration a screen reader can still follow a busy or
  disabled link, as can a script that focuses it, since Enter then follows it.

## Rejected

For a busy button before hydration:

- `pointer-events: none` alone. It stops the pointer, but not Enter or Space on the button, nor
  Enter in a field.
- Rendering a busy button with `type="button"`. The button no longer submits, but Enter in a
  field then submits the form through its next submit button, or, with none, submits it with
  no click at all, which the handler cannot cancel even after hydration. A form with one field
  would submit twice.
- Leaving it to the app. The busy button would submit its form, which is what a busy button
  exists to prevent.

## Not yet done

- Visual snapshots, and Firefox and WebKit runs (milestone 3).
- A scheduled comparison of `.shadcn-upstream/` with the live registry (milestone 4).
- Bundled fonts. Until a theme ships its font files, text falls back to system fonts.
