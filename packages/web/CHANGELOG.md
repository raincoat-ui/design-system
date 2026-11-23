# @raincoat-ui/react

## 0.1.0-next.4

No changes in this release.

## 0.1.0-next.3

No changes in this release.

## 0.1.0-next.2

### Patch Changes

- a3a352b: A busy Button no longer submits its form before React hydrates the page.

  In server-rendered HTML, a loading button refused activation only through a click handler that
  exists once React hydrates it. Before that, and with JavaScript off, a click, Enter, Space, or
  Enter in a field submitted its form. Until hydration a busy button is now also `disabled`: nothing
  submits through it, and it cannot take focus. It keeps its busy look, and after hydration it is
  focusable again. A button that becomes busy after hydration keeps focus as before.

  A busy or disabled link rendered with `asChild` leaves the Tab order and ignores the pointer until
  hydration. A screen reader can still follow it, because a link cannot be disabled in HTML.

  Until hydration, either one carries `data-unhydrated`.
- 5c93d59: A busy Button, or a disabled link rendered with `asChild`, can now be rendered by a React Server
  Component.

  Such a Button refuses activation with a click handler, and React refuses to render a Server
  Component that gives an element a function, so the page failed to render. The handler is now
  added only once React has hydrated the Button; until then the browser already refuses activation
  for it. A Button rendered by a Server Component is never hydrated, so a busy one stays disabled
  there, and its form cannot be sent. To show progress that ends, render the Button in a Client
  Component.

## 0.1.0-next.1

No changes in this release.

## 0.1.0-next.0

### Minor Changes

- 7b10fa2: The first prerelease. It contains the base theme in four color modes and two densities, and
  the Button for React, SwiftUI, and Jetpack Compose, all three built from one token source and
  one component spec.
