# @raincoat-ui/react

Raincoat components for React 19. They are [shadcn/ui](https://ui.shadcn.com) components on
[Radix](https://www.radix-ui.com) primitives, and every color, size, and duration they use comes
from a Raincoat theme.

Prereleases are published to npm with the `next` tag. The
[releases page](https://github.com/raincoat-ui/design-system/releases) says which registries each
version has reached.

## Install

```sh
pnpm add @raincoat-ui/react@next @raincoat-ui/theme-base@next
```

`@raincoat-ui/theme-base` is the base theme. Every theme is a package of its own,
`@raincoat-ui/theme-<id>`, and the
[themes page](https://raincoat-ui.github.io/design-system/foundations/themes/) lists them; install
the one your app uses, and import it where these examples import the base theme.

Then load the styles in one of two ways.

**With Tailwind CSS v4**, in the app's stylesheet:

```css
@import "tailwindcss";
@import "@raincoat-ui/theme-base/theme.css";
@import "@raincoat-ui/react/tailwind.css";
```

`tailwind.css` tells Tailwind where the components' class names are. It also maps the shadcn/ui
color names onto the theme, so `bg-background`, `text-muted-foreground`, `border-border`, and
`rounded-md` follow the theme in your own markup.

**Without Tailwind**, import the compiled stylesheet instead:

```css
@import "@raincoat-ui/theme-base/theme.css";
@import "@raincoat-ui/react/ui.css";
```

It contains no reset and styles nothing but Raincoat components. It does define Tailwind's
utility class names, such as `.inline-flex` and `.relative`; if your app uses those names for
something else, use the Tailwind path.

## Color mode and density

A theme follows the system's light or dark setting and its contrast setting. To choose a mode
yourself, set `data-theme` to `light`, `dark`, `light-hc`, or `dark-hc` on any element. Set
`data-density="compact"` for smaller controls. Both can be nested.

```html
<html data-theme="dark" data-density="compact">
```

Do not use Tailwind's `dark:` variant with Raincoat colors. The tokens already change with the
mode.

## Button

```tsx
import { Button } from "@raincoat-ui/react";

<Button variant="primary" onClick={save}>Save changes</Button>
<Button loading={saving}>Save changes</Button>
<Button aria-label="Delete page" leadingIcon={<TrashIcon />} variant="danger" />
<Button asChild variant="ghost"><a href="/guide">Read the guide</a></Button>
```

| Prop           | Type                                              | Default       | Notes                                                                                    |
| -------------- | ------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `variant`      | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"secondary"` | At most one primary button in a view                                                     |
| `size`         | `"sm" \| "md" \| "lg"`                            | `"md"`        |                                                                                          |
| `fullWidth`    | `boolean`                                         | `false`       | Stretches to the container                                                               |
| `disabled`     | `boolean`                                         | `false`       | Cannot be focused or activated                                                           |
| `loading`      | `boolean`                                         | `false`       | Shows a spinner, keeps the label and focus, ignores activation. Needs a Client Component |
| `leadingIcon`  | `ReactNode`                                       |               | An SVG before the label. Pass the icon of an icon-only button here                       |
| `trailingIcon` | `ReactNode`                                       |               | An SVG after the label                                                                   |
| `asChild`      | `boolean`                                         | `false`       | Styles the single child element, such as a link, instead of rendering a button           |
| `type`         | `"button" \| "submit" \| "reset"`                 | `"button"`    | Unlike a plain `<button>`, it does not submit a form unless you ask                      |

Every other prop of a `<button>` is passed through, including `ref`.

- **A button needs a name.** Give it a label, or `aria-label` when an icon is all it shows.
  TypeScript reports a button with neither.
- **Long labels wrap.** The button grows taller; the label is never cut off.
- **Icons are decoration.** They are hidden from assistive technology and take their size from
  the theme. In right-to-left layouts the leading icon is on the right.
- **Touch.** On a touch screen a small button can still be hit across the theme's minimum
  target size. The extra area takes no room in the layout, so leave 8px or more between small
  buttons.
- **Before hydration.** A busy button rendered on a server is disabled until React hydrates
  it, and for good with JavaScript off. Nothing submits its form until then: not a click, not
  Enter or Space, and not Enter in a field. It cannot take focus until then either. A busy or
  disabled link (`asChild`) leaves the Tab order and ignores the pointer until then, but a
  screen reader can still follow it, because a link cannot be disabled in HTML. Either one
  carries `data-unhydrated` until React hydrates it. A button that becomes busy after
  hydration keeps focus as usual.
- **Server Components.** A Button can be rendered by a React Server Component. It is never
  hydrated there, so a busy Button or a disabled link stays as it is before hydration, for
  good. For a busy state that ends, or an `onClick`, render the Button in a Client Component.

`buttonVariants({ variant, size, fullWidth })` returns the class names alone.

The Button follows the
[Button spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/button/spec.yaml),
which the SwiftUI and Compose Buttons follow too.

## Text and Heading

```tsx
import { Heading, Text } from "@raincoat-ui/react";

<Heading level={1}>Settings</Heading>
<Heading level={3} variant="heading-sm">Recent files</Heading>
<Text>Your files are kept on this device and in the cloud.</Text>
<Text variant="caption" color="muted">Synced 2 minutes ago</Text>
<Text as="label" htmlFor="email" variant="label-md">Email</Text>
<Text maxLines={2}>{message.preview}</Text>
```

| Prop       | Type                                                                                         | Default     | Notes                                                       |
| ---------- | -------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `variant`  | `"body-lg" \| "body-md" \| "body-sm" \| "label-lg" \| "label-md" \| "label-sm" \| "caption"` | `"body-md"` | The text style                                              |
| `color`    | `"default" \| "muted" \| "danger"`                                                           | `"default"` | One of the theme's text roles                               |
| `maxLines` | `number`                                                                                     |             | Ends the text in an ellipsis after that many lines          |
| `as`       | `"p" \| "span" \| "div" \| "label"`                                                          | `"p"`       | The element. Its own props, such as `htmlFor`, are accepted |

| Prop      | Type                                                           | Default           | Notes                                                               |
| --------- | -------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| `level`   | `1 \| 2 \| 3 \| 4 \| 5 \| 6`                                   | Required          | Renders `h1` to `h6`. Choose it for the outline of the page         |
| `variant` | `"heading-xl" \| "heading-lg" \| "heading-md" \| "heading-sm"` | Follows the level | 1 `heading-xl`, 2 `heading-lg`, 3 `heading-md`, 4 to 6 `heading-sm` |
| `color`   | `"default" \| "muted"`                                         | `"default"`       |                                                                     |

Every other prop of the element is passed through, including `ref`.

- **Server Components.** Text and Heading hold no state, so they render in a React Server
  Component and need no JavaScript in the browser.
- **The look is not the level.** A heading's level places it in the outline of the page, which
  is how people move through it with a screen reader. Choose the level first, then set
  `variant` if the default look does not fit.
- **Long text wraps.** Nothing is cut off unless you set `maxLines`, which a Heading does not
  have. Text cut short is still read in full by assistive technology. Headings balance their
  lines where the browser can.
- **Text from people.** Set `dir="auto"` on the Text that holds a name or a message, so that its
  direction comes from its first strong character.
- **Languages.** Text aligns to the start edge. Lines break strictly in Japanese and between
  whole words in Korean, read from the `lang` attribute of the text or of any element around it.
- **Margins.** Neither has a margin: spacing between paragraphs and headings is your layout's.

`textVariants()` and `headingVariants()` return the class names alone.

Text and Heading follow the
[Typography spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/typography/spec.yaml),
which the SwiftUI and Compose versions follow too.

## Browsers

Chrome and Edge 111, Safari 16.4, Firefox 128, and later.

## Working on this package

```sh
pnpm web:browsers    # once: the Chromium build the tests run in
pnpm web:typecheck
pnpm web:test        # builds dist/, checks it, then runs the component tests in Chromium
```

- `src/generated/` is written by `pnpm tokens:build` from the component specs.
- A new component starts from the shadcn/ui registry. Save the unmodified source in
  `.shadcn-upstream/`, record it in `shadcn.lock.json`, then adapt a copy in
  `src/components/ui/`. See
  [decision record 0015](https://github.com/raincoat-ui/design-system/blob/main/docs/adr/0015-web-components.md).
- Component classes may use only Raincoat tokens. The tests fail on a literal color or size.

## License

Apache-2.0. The components are adapted from shadcn/ui, which is MIT licensed; see `NOTICE`.
