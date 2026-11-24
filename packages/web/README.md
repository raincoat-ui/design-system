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

## Input

```tsx
import { Input } from "@raincoat-ui/react";

<Input label="Full name" name="name" autoComplete="name" />
<Input label="Email" type="email" description="We send the receipt here." placeholder="name@example.com" />
<Input label="Email" type="email" invalid={!valid} error="Enter an email address, like name@example.com" />
<Input label="Search the docs" labelHidden type="search" leadingIcon={<SearchIcon />} />
<Input label="Message" multiline rows={4} />
```

| Prop          | Type                                                            | Default  | Notes                                                                       |
| ------------- | --------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `label`       | `ReactNode`                                                     |          | Required. Above the field; the field's name                                 |
| `labelHidden` | `boolean`                                                       | `false`  | Hides the label from view. It is still the name                             |
| `description` | `ReactNode`                                                     |          | Between the label and the field                                             |
| `invalid`     | `boolean`                                                       | `false`  | Needs `error`. Sets `aria-invalid` and shows the error below the field      |
| `error`       | `ReactNode`                                                     |          | Shown only while `invalid`. It does not replace the description             |
| `size`        | `"sm" \| "md" \| "lg"`                                          | `"md"`   | The same heights as the Button's sizes                                      |
| `type`        | `"text" \| "email" \| "password" \| "search" \| "tel" \| "url"` | `"text"` | Chooses the keyboard and what autofill offers                               |
| `multiline`   | `boolean`                                                       | `false`  | A `<textarea>` that starts `rows` lines tall (3) and grows with its content |
| `leadingIcon` | `ReactNode`                                                     |          | A decorative SVG at the start of the field                                  |
| `className`   | `string`                                                        |          | Classes for the whole: label, description, field, and error                 |

Every other prop goes to the native `<input>`, or to the `<textarea>` of a multi-line field,
including `ref`, `value`, `defaultValue`, `onChange`, `name`, `required`, `disabled`, `readOnly`,
`placeholder`, and `autoComplete`.

- **A field needs a label,** and an invalid one an error message. TypeScript reports either one
  missing.
- **Description and error.** The field is described by the description, then the error. Errors
  are not announced as they appear: when a form is submitted, move focus to the first field in
  error, which then reads its label, its state, and its message.
- **Required.** `required` sets the field's required state, and with it the browser's own check
  when the form is submitted. If your app checks fields itself, add `noValidate` to the form.
- **Input methods.** While a Vietnamese or CJK input method composes a character, the field
  keeps the error state it had, and Enter that commits the character does not submit the form.
  The value is always what the input method wrote.
- **Focus.** The focus ring is drawn whenever the field has focus.
- **Touch.** On a touch screen a small field can still be touched across the theme's minimum
  target size. The extra area takes no room in the layout.
- **Left to right.** Email, phone, and web address fields stay left-to-right in a right-to-left
  layout, their icon included.
- **Multi-line.** Where the browser can size a field to its content (Chrome and Edge), it grows
  as text is added. Elsewhere it can be made taller by hand.
- **A Client Component.** The Input marks itself `"use client"`. A Server Component can render
  it, and its HTML works before any script runs, in a form that posts to a Server Action too.

The Input follows the
[Input spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/input/spec.yaml),
which the SwiftUI and Compose Inputs follow too.

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
