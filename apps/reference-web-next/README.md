# Reference app for the web (Next.js)

A Next.js app, with the App Router, that renders every Raincoat component on the server, the way
an app with React Server Components uses it, and the browser tests that drive it. It is never
published.

The page is a Server Component, so the browser receives every button in the page's HTML. A
Server Component cannot give the browser an `onClick` handler, so the buttons that run an action
submit a form to a Server Action instead, which works before React has hydrated the page and
without JavaScript at all. The loading buttons are in a Client Component, as the Button's
`loading` prop needs: a busy button refuses activation with an event handler.

It loads the styles the way the [package README](../../packages/web/README.md) describes for an
app with Tailwind CSS v4: `tailwindcss`, then `@raincoat-ui/theme-base/theme.css`, then
`@raincoat-ui/react/tailwind.css`. The page's own colors use the shadcn/ui names that
`tailwind.css` maps onto the theme, such as `bg-background` and `text-muted-foreground`. Like the
[Vite app](../reference-web-vite/README.md), it installs the packages from this workspace, and
after a release it runs again with the packages installed from npm.

The tests run the production build, served by `next start`, in Chromium, with Playwright. They
check what the Vite app cannot:

- the HTML the server sends: every button, with its variant, size, type, and state, its token
  class names, the link styled as a button, and the stylesheet
- the page with JavaScript turned off: what assistive technology is given for each control,
  each variant's token colors, and a button that submits the form to the Server Action
- hydration: no error or warning, and nothing that assistive technology is given changes
- with JavaScript, a click, Enter, and Space call the Server Action without reloading the page,
  and a disabled or busy button does not call it
- the Tailwind CSS path: the components' class names reach the build, and the page's own
  shadcn/ui colors follow the theme in each of the system's color and contrast settings
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

To build and test only this one, after `pnpm web:build`:

```sh
pnpm --filter @raincoat-ui/reference-web-next typecheck
pnpm --filter @raincoat-ui/reference-web-next test
```

`pnpm --filter @raincoat-ui/reference-web-next dev` serves the app for a look in a browser, after
`pnpm web:build`. Next.js reports anonymous usage to Vercel unless `NEXT_TELEMETRY_DISABLED=1` is
set; CI sets it.

CI runs the same tests on every pull request, in the `reference app (web, next)` job.

### Against a published release

To install `@raincoat-ui/react` and `@raincoat-ui/theme-base` from npm instead of this
workspace, in both web apps, then check this app's types and build and test it:

```sh
node tools/release/use-published.mjs web 0.1.0-next.1
pnpm --filter @raincoat-ui/reference-web-next typecheck
pnpm --filter @raincoat-ui/reference-web-next test
```

Without a version, the script installs the one this checkout names. It changes the apps'
`package.json` files and `pnpm-lock.yaml`; restore them with git and run `pnpm install` to go
back. The release workflow runs the app this way once it has published a version, and a
maintainer can for any version: Actions, reference apps, Run workflow.

## Adding a component

Add it to the page in `app/page.tsx`, with one example for each state in its spec. A state that
needs an event handler goes in a Client Component, next to `app/Loading.tsx`. Add a test file in
`tests/`.

## What the tests do not cover

- **A busy button before hydration.** It refuses activation with an event handler, so until
  React has hydrated it, or without JavaScript, a busy submit button still submits its form.
  The tests check a busy button only once the page is hydrated.
- Touch, the browser's font size, and the order of keyboard focus. The Vite app's tests cover
  them, and the components are the same.
- Firefox and WebKit, and what a screen reader says out loud, as for the Vite app.
