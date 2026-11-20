---
"@raincoat-ui/react": patch
---

A busy Button, or a disabled link rendered with `asChild`, can now be rendered by a React Server
Component.

Such a Button refuses activation with a click handler, and React refuses to render a Server
Component that gives an element a function, so the page failed to render. The handler is now
added only once React has hydrated the Button; until then the browser already refuses activation
for it. A Button rendered by a Server Component is never hydrated, so a busy one stays disabled
there, and its form cannot be sent. To show progress that ends, render the Button in a Client
Component.
