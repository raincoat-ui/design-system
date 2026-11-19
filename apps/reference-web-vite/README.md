# Reference app for the web (Vite)

A React app, built with Vite, that shows every Raincoat component the way an app uses it, and
the browser tests that drive it. It is never published.

It loads the styles the way the [package README](../../packages/web/README.md) describes for an
app without Tailwind: `@raincoat-ui/theme-base/theme.css`, then `@raincoat-ui/react/ui.css`. It
installs the packages from this workspace, so it always runs the code in this repository, and
resolves them through their published `exports`, as an app does. The release's own check
installs the packed packages into an empty project.

The tests run the production build in Chromium, with Playwright, and check what the component
tests in `packages/web` cannot:

- what the browser gives assistive technology for each control: its role, its name, and
  whether it is focusable, disabled, or busy, read from Chromium's accessibility tree
- that the styles reach the page through the build: each variant draws its token colors
- a click, Enter, and Space, the order of keyboard focus, and that disabled and loading buttons
  ignore input
- the browser's font size setting, at twice the default
- on a phone-sized touch screen: the page fits the width, a long label wraps, a tap runs the
  action, and a small button takes only the room it shows while its touch target reaches past it
- axe, with the system set to light, dark, and each with more contrast

## Run

From the root of the repository, once:

```sh
pnpm install
pnpm web:browsers
```

Then build the React package, and build and test the app:

```sh
pnpm web:reference
```

`pnpm --filter @raincoat-ui/reference-web-vite dev` serves the app for a look in a browser,
after `pnpm web:build`.

CI runs the same tests on every pull request, in the `reference app (web)` job.

## Adding a component

Add a screen for it in `src/`, with one example for each state in its spec, and a test file in
`tests/`.

## What the tests do not cover

- A tap cannot show where a touch target ends: Chromium moves a tap that lands near a target
  onto it. The target's edge is checked by hit testing instead.
- Firefox and WebKit, and what a screen reader says out loud. Both are planned for milestone 3
  and the manual accessibility audit of milestone 4.
