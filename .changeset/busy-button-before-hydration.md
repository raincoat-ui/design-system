---
"@raincoat-ui/react": patch
---

A busy Button no longer submits its form before React hydrates the page.

In server-rendered HTML, a loading button refused activation only through a click handler that
exists once React hydrates it. Before that, and with JavaScript off, a click, Enter, Space, or
Enter in a field submitted its form. Until hydration a busy button is now also `disabled`: nothing
submits through it, and it cannot take focus. It keeps its busy look, and after hydration it is
focusable again. A button that becomes busy after hydration keeps focus as before.

A busy or disabled link rendered with `asChild` leaves the Tab order and ignores the pointer until
hydration. A screen reader can still follow it, because a link cannot be disabled in HTML.

Until hydration, either one carries `data-unhydrated`.
