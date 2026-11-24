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

## Dialog, AlertDialog, and Sheet

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
  Button, Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@raincoat-ui/react";

<Dialog>
  <DialogTrigger asChild><Button>Rename</Button></DialogTrigger>
  <DialogContent initialFocus={nameField}>
    <DialogHeader>
      <DialogTitle level={2}>Rename file</DialogTitle>
      <DialogDescription>Everyone the file is shared with sees the new name.</DialogDescription>
    </DialogHeader>
    <DialogBody>{/* fields */}</DialogBody>
    <DialogFooter>
      <DialogClose asChild><Button>Cancel</Button></DialogClose>
      <Button variant="primary" type="submit">Rename</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<AlertDialog>
  <AlertDialogTrigger asChild><Button variant="danger">Delete</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle level={2}>Delete this address?</AlertDialogTitle>
      <AlertDialogDescription>It is removed from your account.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction destructive onClick={remove}>Delete address</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

`Sheet` has the same parts (`SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`,
`SheetDescription`, `SheetBody`, `SheetFooter`, `SheetClose`).

| Prop                   | On                               | Type                         | Default    | Notes                                                                    |
| ---------------------- | -------------------------------- | ---------------------------- | ---------- | ------------------------------------------------------------------------ |
| `open`, `onOpenChange` | `Dialog`, `AlertDialog`, `Sheet` |                              |            | Control it, to keep it open while it holds unsaved changes               |
| `size`                 | `DialogContent`                  | `"sm" \| "md" \| "lg"`       | `"md"`     | Its width. On a narrower window, it spans the window less a margin       |
| `edge`                 | `SheetContent`                   | `"bottom" \| "end"`          | `"bottom"` | An end sheet comes from the bottom on a window less than twice its width |
| `closeLabel`           | `DialogContent`, `SheetContent`  | `string`                     |            | Shows the close button, with this name. Give it when there is no Cancel  |
| `initialFocus`         | `DialogContent`, `SheetContent`  | `RefObject<HTMLElement>`     | The title  | Where focus goes on open, such as the first field of a short form        |
| `returnFocus`          | every content                    | `RefObject<HTMLElement>`     |            | Where focus goes on close when the control that opened it is gone        |
| `container`            | every content                    | `HTMLElement`                | `body`     | Where it is rendered                                                     |
| `level`                | every title                      | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | Required   | The title's heading level. It looks the same at every level              |
| `destructive`          | `AlertDialogAction`              | `boolean`                    | `false`    | A danger button, for an action that destroys something                   |

- **Focus.** It moves to the title when the dialog opens, or to `initialFocus`, stays inside,
  and returns to the control that opened the dialog. An alert dialog starts on Cancel.
- **Closing.** Escape, a click on the scrim, the close button, and anything in a `DialogClose`
  close a dialog or a sheet. An alert dialog closes on Escape and its buttons, never the scrim.
  There is no swipe to close on the web.
- **Scrolling.** The body scrolls between the header and the footer, with a hairline while
  content is beneath them; a body that scrolls and holds no control takes focus, so that the
  keyboard can scroll it. In a window too short for three lines of it, the whole dialog scrolls.
- **The footer's buttons** sit at the end edge, Cancel first and the primary action last. They
  stack, the primary action on top, when they do not fit in a row.
- **Theme and direction.** A dialog is rendered at the end of the page's body, so it takes the
  theme, density, and direction of the root element. Set `data-theme`, `data-density`, and
  `dir` there, or pass `container`.
- **Motion.** The scrim and a dialog fade; a sheet slides in from its edge. With reduced motion,
  everything fades. A dialog stacks above the page as shadcn/ui's overlays do (`z-index: 50`).

The Dialog, AlertDialog, and Sheet follow the
[Dialog spec](https://github.com/raincoat-ui/design-system/blob/main/specs/components/dialog/spec.yaml),
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
