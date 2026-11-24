# Reference app for the web (Next.js)

A Next.js app that renders every Raincoat component on a server the way an app does, and the
browser tests that drive it. It is never published or deployed.

It loads the styles the way the [package README](../../packages/web/README.md) describes for an
app with Tailwind CSS v4: Tailwind, then `@raincoat-ui/theme-base/theme.css`, then
`@raincoat-ui/react/tailwind.css`. Its own markup uses the shadcn/ui color names that the theme
maps, such as `bg-background` and `text-muted-foreground`, and the theme's tokens. It installs
the packages from this workspace, so it always runs the code in this repository, and resolves
them through their published `exports`, as an app does. After a release, it runs again with the
packages installed from npm.

The page (`app/page.tsx`) is a Server Component. It shows the Button in two ways:

- **In a Client Component** (`app/ButtonScreen.tsx`), in every state of its spec. The server
  renders it, then React hydrates it.
- **From the Server Component itself**, in forms that post to Server Actions (`app/actions.ts`).
  These Buttons reach the browser as HTML and are never hydrated.

The tests run the production build, served by `next start`, in Chromium, with Playwright, and
check what the [Vite app](../reference-web-vite/README.md) cannot:

- with JavaScript off: what assistive technology is given for each control in the server's
  HTML, that a busy button is disabled until React hydrates it, that a form posts to its Server
  Action through a submit Button and not through a plain one, and that a busy button's form
  cannot be sent by a click or by Enter in a field
- that React hydrates the page without a mismatch or an error, and that hydration changes only
  the busy button, which is then focusable and still refuses activation
- that a form posts to its Server Action without loading the page again
- that a busy Button rendered by the Server Component stays disabled, because it is never
  hydrated
- that the styles reach the page through Tailwind: each variant draws its token colors, a small
  button's touch target reaches past it on a touch screen, and the shadcn/ui colors follow the
  system's settings
- axe, with the system set to light, dark, and each with more contrast

## Run

From the root of the repository, once:

```sh
pnpm install
pnpm web:browsers
```

Then build the React package, and build and test both web apps:

```sh
pnpm web:reference
```

`pnpm --filter @raincoat-ui/reference-web-next dev` serves the app for a look in a browser,
after `pnpm web:build`.

CI runs the same tests on every pull request, once for each theme, in the
`reference app (web, <theme>)` jobs. `RAINCOAT_THEME=<id>` before `pnpm test` builds the app with
another theme than the base one (`tools/reference/web-theme.mjs`).

### Against a published release

To install `@raincoat-ui/react` and `@raincoat-ui/theme-base` from npm into both web apps
instead of this workspace, then check their types and build and test them:

```sh
node tools/release/use-published.mjs web
pnpm --filter "@raincoat-ui/reference-web-*" typecheck
pnpm --filter "@raincoat-ui/reference-web-*" --workspace-concurrency=1 --no-bail test
```

The script installs the version this checkout names, or the one given after `web`. It changes
the apps' `package.json` files and `pnpm-lock.yaml`; restore them with git and run `pnpm install`
to go back.

This app needs a release after 0.1.0-next.1. In 0.1.0-next.1, a busy Button rendered by a Server
Component stops the page from rendering; this app found that bug.

## Adding a component

Add a Client Component for it in `app/`, with one example for each state in its spec, and render
it from the Server Component too, wherever it can be used there. Add a test file in `tests/`.
A component can have a page of its own: the Toast's is `app/toast/page.tsx`, a Server Component
that renders the `ToastProvider` around the page, as an app's layout does.

A component that holds no state, such as Typography, can have a page of its own that is a Server
Component alone: `app/typography/page.tsx`, at `/typography`. The Tabs, Client Components, have
a page that a Server Component renders: `app/tabs/page.tsx`, at `/tabs`.
The Card's page, `app/card/page.tsx` at `/card`, is a Server Component with one Client
Component inside it: the card that is a button, whose click handler is a function.

## Licenses

Next.js needs `caniuse-lite`, which is published under CC-BY-4.0. It is excepted for this app
alone in `licenses/curations.yml`, so `next` is a development dependency, like `vite` in the
Vite app.

## What the tests do not cover

- Firefox and WebKit, and what a screen reader says out loud. Both are planned for milestone 3
  and the manual accessibility audit of milestone 4.
- Streaming with Suspense, and the Pages Router.
