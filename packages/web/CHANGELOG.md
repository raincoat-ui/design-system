# @raincoat-ui/react

## 0.1.0-next.5

### Minor Changes

- 9035080: Card: a surface that groups content about one subject, on every platform.
  - A card has a title, which is a heading in `heading-sm` at the level you give, and optionally
    media at the top, edge to edge, a body, and Buttons in a footer at the end. Its outline, fill,
    and shadow come from the theme. It fills the width it is given and grows with its content.
  - A card is static, a container that can hold links and buttons, or interactive: the whole card
    is one link or one button, named by its title, and holds no other controls. An interactive
    card's outline steps to the strong border color under a pointer, its fill changes while it is
    pressed, and keyboard focus draws the focus ring around the whole card.
  - **React:** `Card`, `CardMedia`, `CardTitle`, `CardBody`, and `CardFooter`. A `CardLink` or a
    `CardButton` in the title makes the card interactive. A static card and a link card render in
    a Server Component.
  - **SwiftUI:** `RaincoatCard`, with `.media { }` and `.footer { }`. A `Button` or
    `NavigationLink` whose label is a `RaincoatCard`, with `.buttonStyle(.raincoatCard)`, is an
    interactive card, read by VoiceOver as one element, title first.
  - **Compose:** `RaincoatCard`, on Compose Foundation. With `onClick` it is interactive: one
    button whose semantics merge the card's content.
  - The shadow is drawn from `card.shadow`; the base theme's is none.
- 6de19ce: Dialog, alert dialog, and Sheet: the modal surfaces, on every platform.
  - **Dialog**: a panel centered over the screen, `sm`, `md` (the default), or `lg` wide, and
    across the window less a margin on a narrower one. It closes on Escape, the scrim, the close
    button or Cancel, and the back gesture on Android.
  - **Alert dialog**: confirms something consequential. Focus starts on Cancel; Escape and back
    mean Cancel; the scrim does nothing. Mark the confirming action `destructive` when it destroys
    something.
  - **Sheet**: rises from the `bottom` edge (the default) or slides in from the `end` edge, which
    becomes the bottom on a window less than twice the sheet's width. On iOS and Android a bottom
    sheet also closes when dragged down.
  - Every one has a title, which names it and wraps, an optional description, a body that scrolls
    between a fixed header and footer (with a hairline while content is beneath them, and the
    whole surface scrolling instead in a very short window), and a footer whose buttons stack,
    the primary first, when they do not fit. The close button is shown only when you give it a
    name. Focus moves to the title on open, or to a target you name, and back to the control that
    opened the dialog on close.
  - **React:** `Dialog`, `AlertDialog`, and `Sheet`, each with a trigger, content, header, title,
    description, body, and footer, on Radix. The dialog renders at the end of the page's body: set
    `data-theme` and `dir` on the root element, or pass `container`.
  - **SwiftUI:** `.raincoatDialog`, `.raincoatSheet`, and `.raincoatAlertDialog`. Dialogs and
    sheets are the system sheet, sized to their content; an alert dialog is the system alert.
  - **Compose:** `RaincoatDialog`, `RaincoatAlertDialog`, and `RaincoatSheet`, in a dialog window
    on Compose Foundation alone.

  For spec authors: when a part of a spec has the component's own name, the generated type of any
  part of an example is named `<Component>PartExampleProperties`.
- 1b0c94b: The Input: a text field with its label, an optional description, and an error message, in one
  line or several. It follows `specs/components/input/spec.yaml`.
  - **React.** `<Input label="Email" type="email" />`, on a native `<input>`, or a `<textarea>`
    with `multiline`. The field is described by its description and then its error, and sets
    `aria-invalid` and `required`. While a Vietnamese or CJK input method composes, the field
    keeps the error state it had, and Enter that commits the composition does not submit the
    form. Email, phone, and web address fields stay left-to-right in a right-to-left layout.
    Japanese breaks into lines by the strict rules, and Korean between whole words, in the field
    and in its label, description, and error. The Input is a Client Component that a Server
    Component can render.
  - **SwiftUI.** `RaincoatInput("Email", text: $email, type: .email)`, on `TextField` and
    `SecureField`. VoiceOver reads the description as the hint and, since iOS has no invalid
    state, an invalid field's error after its label. `.textFieldStyle(.raincoat())` gives any text
    field the look of the field alone.
  - **Compose.** `RaincoatInput(value, onValueChange, label = "Email", type = InputType.Email)`, on
    Compose Foundation's `BasicTextField`. An invalid field carries Compose's error semantics with
    its message, and the description is part of the field's semantics after its name. Its texts
    break into lines as every Raincoat text style does: Korean only between whole words.

  Every size is as tall as the Button of the same size. A field shorter than the minimum touch
  target still takes touches across that target, without taking more room than it shows. As the
  person's text size grows, the value, the label, and the leading icon grow with it, and the space
  above and below the value stays as it is, so the field grows taller, as the Button does. The
  generated `InputSize` and `InputType` types are exported on every platform.
- 2fda7f2: Tabs: a row of tabs that switches between panels of related content in one view.
  - **React.** `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`, also from
    `@raincoat-ui/react/tabs`. The arrow keys select the tab they reach, or only move focus with
    `activationMode="manual"`; the tabs follow the page's direction; `keepMounted` keeps a panel's
    content while its tab is not selected. When the tabs do not fit, the list scrolls sideways, with
    previous and next buttons for a mouse.
  - **SwiftUI.** `RaincoatTabs` and `RaincoatTab`. VoiceOver is told the row is a tab bar, and the
    selected tab carries the selected trait.
  - **Compose.** `RaincoatTabs` and `RaincoatTab`: a selectable group of tabs with the tab role.
    Enter or Space selects.

  Selection is controlled by the app or kept by the tabs. Labels stay on one line and are never
  truncated. There are no disabled tabs.
- 9caed42: The Toast: a short message near the bottom of the screen that says something has happened, such
  as "Message archived", optionally with one action such as Undo.
  - **React.** Put `ToastProvider` around the app, with a `label` for the region that holds the
    toasts, such as "Notifications". `useToast().show({ message })` shows a toast from anywhere
    inside it; `show({ message, action: { label, onClick }, closeLabel })` shows one with an action.
    F8 moves focus to the toast and back. `bottomInset` keeps the toasts above a bar of your own.
    `Toast` draws a toast standing still, for documentation and tests.
  - **SwiftUI.** `raincoatToastHost()` puts a host on a screen, and the `showRaincoatToast`
    environment action shows a `RaincoatToast` from anywhere inside it.
    `raincoatShadow(_:in:fill:)` fills a shape behind a view and draws a token shadow with it.
  - **Compose.** `RaincoatToastHost` shows the toasts of a `RaincoatToastHostState`, whose `show`
    suspends until the toast closes and says how. `RaincoatToast` draws a toast on its own.
    `Modifier.raincoatShadow(shadow, shape, fill)` fills a shape and draws a token shadow with it.

  On every platform one toast is shown at a time, and others wait in order. A toast never takes
  focus, and its message is announced politely. Without an action, a toast closes after 6 seconds;
  the time stops while a pointer is over it, while it has focus, and while the app is in the
  background, and on Android the person's accessibility timeout replaces it when longer. A toast
  with an action stays until the action is used or the toast is closed, so it must have a named
  close button. A swipe down closes a toast. The packages ship no text for it: every word comes
  from the app.
- 9e8e1d7: Typography: Text, for running text and labels, and Heading, for headings, on every platform.
  - **Text** sets text in a body, label, or caption style (`body-lg`, `body-md`, `body-sm`,
    `label-lg`, `label-md`, `label-sm`, `caption`) and the `default`, `muted`, or `danger` text
    color. With `max-lines` it ends in an ellipsis after that many lines; assistive technology
    still reads all of it.
  - **Heading** takes a required `level`, from 1 to 6, which places it in the outline of the
    screen. Its look follows the level (1 `heading-xl`, 2 `heading-lg`, 3 `heading-md`, 4 to 6
    `heading-sm`) unless `variant` says otherwise. Its color is `default` or `muted`. It wraps and
    is never cut short.
  - **React:** `<Text>` renders a `p`, or a `span`, `div`, or `label` with `as`. `<Heading>`
    renders `h1` to `h6`. Both render in a Server Component.
  - **SwiftUI:** `.raincoatText(_:color:maxLines:)` on any `Text`, `Label`, or `TextField`, and
    `.raincoatHeading(level:variant:color:)`, which adds the header trait and the heading level.
    Each style grows with Dynamic Type relative to the system text style nearest its role.
  - **Compose:** `RaincoatText` and `RaincoatHeading`, on Compose Foundation's `BasicText`.
    `RaincoatHeading` sets heading semantics; Android has no heading levels.

  For spec authors: a component spec can have parts, each with properties of its own, and a
  property can be a whole number with a range. A default can follow another property.

### Patch Changes

- 0c21bea: The Button keeps its padding at large text sizes, and breaks Japanese and Korean labels by
  their rules.
  - **Web.** At a larger text size, the space above and below the label is what it is at the
    default size, so the button grows taller. Before, the padding shrank as the text grew, and at
    twice the default size the label touched the top and bottom of the button. Icons and the
    spinner now grow with the text, as on iOS and Android.
  - **Web.** Lines of a label break by the strict rules, so no line of Japanese starts with a
    small kana or a prolonged sound mark. A Korean label breaks only between words.
  - **Android.** The label breaks by the strict rules too.
  - **All platforms.** A button that shows only an icon keeps the space around its icon at a
    larger text size, so it grows and stays square. Before, on iOS and Android, the button kept
    its size until the icon filled it.
- 5b73560: Tabs: a tab panel that holds a link or a control is never a Tab stop itself, not even just
  after its tab is selected. Before, when an arrow key selected a tab, its panel took focus for a
  moment, so a Tab pressed at once went to the panel instead of the link in it.
- 5b73560: Escape in a dialog closes the dialog, also while a toast is on the screen.
  - **Toast.** Escape closes a toast only while focus is in it, as the spec says. Before, a toast
    shown while a dialog was open, as from an action in the dialog, closed on an Escape pressed
    anywhere. An Escape pressed elsewhere now goes on to the page as if there were no toast.
  - **Dialog, alert dialog, and Sheet.** Escape pressed in one closes it even when a toast was
    shown after it opened. Before, that Escape closed the toast and never reached the dialog.
    `onOpenChange` is called once for each Escape, and `onEscapeKeyDown` can still keep the dialog
    open.

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
