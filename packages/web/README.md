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

## Card

```tsx
import {
  Button, Card, CardBody, CardButton, CardFooter, CardLink, CardMedia, CardTitle, Text,
} from "@raincoat-ui/react";

// Static: a container, which can hold links and buttons.
<Card>
  <CardTitle level={3}>Storage</CardTitle>
  <CardBody><Text color="muted">4.2 GB of 15 GB used</Text></CardBody>
  <CardFooter><Button>Manage storage</Button></CardFooter>
</Card>

// Interactive: the whole card is the link, or the button, in its title.
<Card>
  <CardTitle level={3}><CardLink href="/orders/1042">Order 1042</CardLink></CardTitle>
  <CardMedia><img src={parcel} alt="A parcel at a front door" /></CardMedia>
  <CardBody><Text color="muted">Delivered on Monday</Text></CardBody>
</Card>
<Card>
  <CardTitle level={3}><CardButton onClick={startReturn}>Start a return</CardButton></CardTitle>
</Card>
```

| Part         | Element                    | Notes                                                                                  |
| ------------ | -------------------------- | -------------------------------------------------------------------------------------- |
| `Card`       | `div`                      | The surface. It fills the width it is given and has no role of its own                 |
| `CardTitle`  | `h1` to `h6`               | A `Heading`: `level` is required, and `variant` is `"heading-sm"` unless you set it    |
| `CardLink`   | `a`                        | In the title: makes the whole card a link. `asChild` takes a router's link             |
| `CardButton` | `button`, of type `button` | In the title: makes the whole card a button. It has no `disabled`                      |
| `CardMedia`  | `div` around an image      | Drawn at the top, edge to edge, with the card's corners, wherever it is in the card    |
| `CardBody`   | `div`                      | Any content, such as `Text`                                                            |
| `CardFooter` | `div`                      | Buttons at the end edge. They wrap, and stay at the bottom of a card in a row of cards |

Every prop of each element is passed through, including `ref`.

- **One action per interactive card.** A card whose title holds a `CardLink` or a `CardButton`
  is that link or button as a whole: a click anywhere on it activates it, and its name is the
  title alone. It holds no other links or buttons. A card that needs a Button stays static, and
  its title can be a plain link.
- **States.** An interactive card's outline steps to the strong border color under a pointer,
  and its fill changes while it is pressed. It draws the focus ring around itself when its link
  or button has keyboard focus. A static card has none of these states.
- **Read the title first.** Put `CardMedia` after `CardTitle`: the media is still drawn at the
  top, and a screen reader reads the title before it. Give the image an `alt` that says what it
  shows, or an empty one when it only decorates.
- **Text under an interactive card cannot be selected with a pointer.** The link or button
  covers the card, so a drag on it is a click. Selecting all and copying still includes it.
- **Collections.** Put cards in a `ul` or `ol`, so that a screen reader says how many there
  are. The grid, and the space between cards, are your layout's.
- **Server Components.** A static card and a link card hold no state, so they render in a React
  Server Component and work with JavaScript off. A button card needs a Client Component for its
  `onClick`, as any button does.

The Card follows the
[Card spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/card/spec.yaml),
which the SwiftUI and Compose Cards follow too.

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
  direction comes from its first strong character. Inside a sentence, put the name in a
  `<Text as="span" dir="auto">`: that also isolates it, so the punctuation and numbers beside it
  do not join it.
- **Languages.** Text aligns to the start edge. Lines break strictly in Japanese and between
  whole words in Korean, read from the `lang` attribute of the text or of any element around it.
- **Margins.** Neither has a margin: spacing between paragraphs and headings is your layout's.

`textVariants()` and `headingVariants()` return the class names alone.

Text and Heading follow the
[Typography spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/typography/spec.yaml),
which the SwiftUI and Compose versions follow too.

## Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@raincoat-ui/react";

<Tabs defaultValue="details">
  <TabsList aria-label="Product">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="reviews">Reviews</TabsTrigger>
    <TabsTrigger value="list" aria-label="List" leadingIcon={<ListIcon />} />
  </TabsList>
  <TabsContent value="details">…</TabsContent>
  <TabsContent value="reviews">…</TabsContent>
  <TabsContent value="list">…</TabsContent>
</Tabs>;
```

| Part          | Prop                     | Default       | Notes                                                                                 |
| ------------- | ------------------------ | ------------- | ------------------------------------------------------------------------------------- |
| `Tabs`        | `defaultValue`           |               | The tab selected first, when the tabs keep their own selection                        |
| `Tabs`        | `value`, `onValueChange` |               | The selection, when the app controls it                                               |
| `Tabs`        | `activationMode`         | `"automatic"` | `"manual"`: the arrow keys only move focus, and Enter or Space selects                |
| `Tabs`        | `dir`                    |               | Only to give the tabs a direction other than the page's                               |
| `TabsTrigger` | `value`                  |               | The value it selects                                                                  |
| `TabsTrigger` | `leadingIcon`            |               | An SVG before the label. Pass the icon of an icon-only tab here, with an `aria-label` |
| `TabsContent` | `value`                  |               | The tab whose panel it is                                                             |
| `TabsContent` | `keepMounted`            | `false`       | Keeps the panel's content in the page, hidden, while its tab is not selected          |

Every other prop of the element each part renders is passed through, including `ref`.

- **A tab needs a name.** Give it a label, or `aria-label` when an icon is all it shows.
  TypeScript reports a tab with neither. There are no disabled tabs: leave out a tab that leads
  nowhere.
- **Labels stay on one line.** When the tabs do not fit, the list scrolls sideways. Moving focus
  to a tab, or selecting it from the app, scrolls it into view. A mouse also gets previous and
  next buttons at the ends of the list; they are hidden from assistive technology and are not in
  the Tab order.
- **Keyboard.** The arrow keys move between the tabs and select, wrapping at the ends; Home and
  End go to the first and last. Right to left, the arrow keys swap. Tab moves on to the panel: to
  its first control, or to the panel itself when it has nothing focusable.
- **Direction.** The tabs follow the page's direction, read from the page when focus first
  enters them, so a right-to-left page needs nothing more.
- **Panels.** Only the selected tab's panel has content. The others are empty and hidden, so
  that each tab can point at its panel. Give the panel its own spacing.
- **Server Components.** Tabs are Client Components. A Server Component can render them with
  text and markup inside; the server sends the selected panel, and React hydrates the rest.

The Tabs follow the
[Tabs spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/tabs/spec.yaml),
which the SwiftUI and Compose Tabs follow too.

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
- **Text size.** The value, the label, and the leading icon grow with the person's text size.
  The space above and below the value stays as it is, so the field grows taller.
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
