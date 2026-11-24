# RFC 0006: Dialog and Sheet

- Status: proposed
- Kind: component
- Proposed: 2026-11-24
- Decided:

## Summary

Adds the modal surfaces: a **Dialog** centered over the screen, an **alert dialog** that asks
people to confirm something consequential, and a **Sheet** that rises from the bottom edge or
slides in from the end edge. They share one anatomy, one focus model, and one set of tokens,
including a new scrim and the overlay shadow. It is for any app that interrupts a task to ask
for something or to confirm it.

## Problem

Modal surfaces are where accessibility most often breaks: focus escapes behind the dialog, is
not returned when it closes, or lands on a destructive button; a screen reader reads the page
behind; nothing says how to get out. Every app also has to decide how a modal looks on a phone
and on a large screen, and the three platforms answer differently. iOS presents a modal task as
a sheet; Android and the web usually center a dialog.

An example: deleting a saved address asks "Delete this address?" with Cancel and Delete. The
Delete button must not be where focus starts, Escape must mean Cancel, and on iOS people expect
the system's own alert.

## Proposal

### Kinds and presentations

| Kind         | Presentation                               | For                                                        | Dismissed by                                                       |
| ------------ | ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Dialog       | Centered; sizes `sm`, `md` (default), `lg` | A short task: rename, choose, fill in a few fields         | Escape, the scrim, the close button or Cancel, the back gesture    |
| Alert dialog | Centered; `sm`                             | Confirming something consequential or irreversible         | Escape, Cancel, and the back gesture, all as Cancel. Not the scrim |
| Sheet        | `edge`: `bottom` (default) or `end`        | A longer task, or one that keeps the screen behind in view | As a dialog, and by dragging it away on touch screens              |

- On a narrow window a dialog spans the width less a margin, and an end sheet comes from the
  bottom instead.
- On iOS every dialog and sheet is presented as the system sheet, which is how iOS presents a
  modal task: from the bottom on iPhone and centered on iPad. An alert dialog on iOS is the
  system alert. See Platform notes.

### Anatomy

| Part         | Required                         | Notes                                                                                                       |
| ------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Scrim        | Yes                              | Covers the screen behind and makes it inert                                                                 |
| Container    | Yes                              | Raised surface with a hairline outline                                                                      |
| Title        | Yes                              | `heading-md`. It names the dialog. It wraps; it is never truncated                                          |
| Description  | No                               | A sentence under the title that the dialog is described by                                                  |
| Body         | No                               | Any content. It scrolls between the header and the footer when it does not fit                              |
| Footer       | No (yes for an alert dialog)     | Buttons, at the end edge, the primary action last. They stack, primary first, when they do not fit in a row |
| Close button | When the footer has no Cancel    | An icon-only ghost Button at the end of the header. Its name is given by the app                            |
| Drag handle  | Bottom sheets on touch platforms | A visual cue only. Dragging is never the only way to close                                                  |

Every dialog and sheet has a visible way out: a Cancel in the footer or the close button.

### Focus

- **On open**, focus moves into the dialog: to the title by default, so a screen reader starts at
  the top and nothing is activated by accident. The app can name another target, such as the
  first field of a form. In an alert dialog focus starts on the least destructive action,
  usually Cancel.
- **While open**, focus stays inside, and everything behind is hidden from assistive technology.
- **On close**, focus returns to the control that opened it. If that control is gone, the app
  says where focus goes.

### Scrolling

The header and footer stay in place and the body scrolls. A hairline appears under the header
and above the footer while content is scrolled beneath them. When the window is too short to
show the header, the footer, and three lines of the body, as at 400% zoom, the whole container
scrolls as one instead.

### Tokens

New semantic tokens:

| Token                         | Type      | Holds                                           | Light            | Dark             | Light HC         | Dark HC          |
| ----------------------------- | --------- | ----------------------------------------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| `color.bg.scrim`              | color     | The veil over the screen behind a modal surface | `color.scrim.40` | `color.scrim.60` | `color.scrim.60` | `color.scrim.80` |
| `shadow.overlay`              | shadow    | The shadow of dialogs, sheets, and toasts       | `shadow.none`    | `shadow.none`    | `shadow.none`    | `shadow.none`    |
| `size.panel.sm`, `.md`, `.lg` | dimension | The widths of panels above the page             | 400, 560, 800px  | The same         | The same         | The same         |

The scrim and the shadow are overridable; the panel widths are not, like every other size.
`shadow.none` is the primitive RFC 0005 adds.

New primitives, which need no RFC: `color.scrim.40`, `.60`, and `.80` (`neutral.1000` at 40%,
60%, and 80% opacity), and `dimension.400`, `.560`, and `.800`. The token pipeline already
accepts colors with alpha; the scrim is never a background for a contrast check, because what is
under it is unknown.

Component tokens, `tokens/component/dialog.tokens.json`:

| Token                                | Value                                                           |
| ------------------------------------ | --------------------------------------------------------------- |
| `dialog.scrim`                       | `color.bg.scrim`                                                |
| `dialog.bg`                          | `color.bg.raised`                                               |
| `dialog.border.width`, `.color`      | `border-width.thin`, `color.border.default`                     |
| `dialog.radius`                      | `radius.lg`                                                     |
| `dialog.shadow`                      | `shadow.overlay`                                                |
| `dialog.width.sm`, `.md`, `.lg`      | `size.panel.sm`, `.md`, `.lg`                                   |
| `dialog.margin`                      | `space.4`, the least space between a dialog and the window edge |
| `dialog.padding`                     | `space.6`                                                       |
| `dialog.gap`                         | `space.4`, between header, body, and footer                     |
| `dialog.footer.gap`                  | `space.2`, between buttons                                      |
| `dialog.title`, `dialog.description` | `type.heading.md`, `type.body.md`                               |
| `dialog.fg`                          | `color.fg.default`                                              |
| `dialog.divider`                     | `color.border.default`, the hairline under a scrolled header    |
| `sheet.width.end`                    | `size.panel.sm`                                                 |
| `sheet.max-width.bottom`             | `size.panel.md`; centered on wider windows                      |
| `sheet.handle.color`                 | `color.border.strong`                                           |
| `dialog.enter.duration`, `.easing`   | `motion.duration.normal`, `motion.easing.interactive`           |
| `dialog.exit.duration`, `.easing`    | `motion.duration.fast`, `motion.easing.leave`                   |

Motion: the scrim and a dialog fade in; a sheet slides in from its edge. With reduced motion,
everything fades and nothing moves.

Usage rules that will go into the guidelines:

- Use a dialog for a task that must be finished or abandoned before going on. If people need the
  screen behind to do the task, use a sheet or put it in the page.
- Use an alert dialog only to confirm something consequential. Its title says what will happen
  ("Delete this address?"), and its confirming button repeats the verb ("Delete address"), as the
  Button guidelines ask of danger buttons.
- Do not open a dialog from a dialog. Replace the content, or close the first.
- Do not use a dialog for a message that needs no decision. A toast (RFC 0008) or an inline
  message interrupts less.

## Prior art

Read from each system's public documentation on 2026-11-24. Material is read from its Android
and Material Web documentation on GitHub and the Compose documentation, because m3.material.io
shows nothing without JavaScript. Fluent 2 (web) and AWS Cloudscape were also read and appear
below where they differ.

| Question                                    | IBM Carbon                                                                                            | Adobe Spectrum                                                                                     | Google Material                                                                                                          | GitLab Pajamas                                                      | Raincoat                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Parts (anatomy)                             | Header with title and close button, body, footer, overlay; primary on the right                       | Title, description, up to three buttons with the primary rightmost, optional close button, overlay | Dialog: icon, headline, supporting text, buttons at the end, scrim. Bottom sheet: container, optional drag handle, scrim | Title, close icon, message, one to three actions, backdrop          | Title, optional description, body, footer with the primary last, close button when there is no Cancel, scrim |
| Variants and sizes                          | XS to L; passive, transactional, danger, acknowledgment, progress                                     | S to L, at 90% width on small screens; alert variants; tray and full-screen in React               | Basic and full-screen dialogs; modal and standard bottom sheets, at most 640dp wide; side sheets                         | sm, md, lg; a 400px drawer that is full width at the smallest size  | Dialog `sm`, `md`, `lg`; alert dialog; bottom or end sheet, the end sheet from the bottom on narrow windows  |
| States                                      | The body scrolls under a fixed header and footer                                                      | Text wraps; buttons stack when narrow; focus moves after the entry animation                       | Sheets drag and settle                                                                                                   | Prefers page scroll to scrolling inside the modal                   | Fixed header and footer; the whole container scrolls when the window is very short                           |
| Keyboard behaviour                          | Focus trapped; starts on the first input, else the primary button, but on Cancel for destructive ones | Tab cycles the buttons; Escape equals Cancel; the first focus is configurable                      | Focus trapped on the web; the first focus is configurable; Escape fires cancel                                           | Focus starts on the title, stays inside, and returns to the trigger | Trapped; starts on the title, or on Cancel in an alert; returns to the trigger                               |
| Screen-reader role, name, and announcements | `dialog`, `aria-modal`, named by the title                                                            | Alert dialogs use `alertdialog` and need a name                                                    | Named by the headline; an alert type announces itself as an alert dialog                                                 | `dialog`, named by the title                                        | `dialog` or `alertdialog`, modal, named by the title, described by the description                           |
| Dismissal                                   | Close button and Escape always; outside click for passive modals only                                 | Escape always; the overlay only when there is a close button                                       | Tap outside, Escape, the scrim; sheets by dragging and predictive back                                                   | Close, Cancel, Escape, and outside click, always                    | Escape, back, and Cancel always; the scrim, except for an alert dialog                                       |
| Right-to-left and long-text behaviour       | Not read                                                                                              | Mirrors, with the buttons on the left; long text wraps                                             | A side sheet's edge follows the layout direction                                                                         | A drawer's content aligns right                                     | Mirrors: buttons and close button at the end, on the left; the end sheet on the left; titles wrap            |

Where the systems disagree, and which way Raincoat goes:

- **First focus.** Pajamas starts on the title, Cloudscape on the close button, Fluent on the
  first control, and Carbon on the first input or the primary button. Raincoat starts on the
  title, as Pajamas does: a screen reader begins at the top, and a keyboard user is one Tab from
  the first control. Starting on a primary button risks confirming by accident. In an alert
  dialog, Raincoat starts on Cancel, as Carbon does for destructive modals.
- **Escape in an alert dialog.** Fluent allows only the footer buttons; Spectrum treats Escape
  as Cancel. Raincoat follows Spectrum: Escape is the keyboard's way out everywhere, and Cancel is
  always safe.
- **The scrim.** Pajamas always closes on an outside click, Carbon only for passive modals,
  Spectrum only when there is a close button, and Fluent for modal dialogs but not alerts.
  Raincoat closes standard dialogs and sheets on the scrim, and never an alert dialog, where a
  stray tap must not count as an answer.
- **Close button and Cancel together.** Pajamas and Carbon always show the close button;
  Spectrum says a dismissible dialog has no footer buttons; Fluent adds Close only when there is no
  Cancel. Raincoat follows Fluent: one visible way out, not two that mean the same.
- **Scrolling.** Carbon and Fluent keep the header and footer fixed; Pajamas avoids scrolling
  inside the modal. Raincoat keeps them fixed, and lets go of them at very large zoom, as Fluent
  does for drawers.
- **Role.** Cloudscape uses `alert` for its modal. The others keep `alertdialog` for alert
  dialogs, as Raincoat does.

## Accessibility

| Requirement                                                      | How it is tested                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Role and name: a modal dialog or alert dialog named by its title | Web: accessibility tree and axe. iOS: UI test of the sheet and alert. Android: pane title and semantics       |
| Focus moves in on open, stays inside, and returns on close       | Web: Playwright keyboard tests. Android: focus tests. iOS: Full Keyboard Access UI test                       |
| Alert dialogs start on Cancel; Escape and back mean Cancel       | Interaction tests on each platform                                                                            |
| Content behind is hidden from assistive technology               | Web: the page behind is not in the accessibility tree. iOS and Android: tests read only the dialog's elements |
| Every dialog can be closed without dragging or a pointer         | Keyboard tests on the web and Android; VoiceOver's escape action on iOS                                       |
| The close button has a name                                      | Each platform's API requires it whenever the button is shown; the role-and-name tests read it                 |
| Reflow: usable at 400% zoom and the largest text size            | Web: 320 CSS pixel width. iOS: largest accessibility size. Android: font scale 2.0                            |
| Reduced motion: nothing slides                                   | Snapshot and motion test with the reduced-motion setting                                                      |

## Internationalization

- **Right-to-left.** Footer buttons, the close button, and the end sheet all sit at the end
  edge, which is the left. Nothing is placed by left or right.
- **Long and expanded text.** Titles and descriptions wrap. Buttons stack when their translated
  labels do not fit in a row; snapshots in the expanded pseudo-locale show the stacked footer.
  Cloudscape notes that translations can be three times as long as English.
- **Vietnamese and CJK** snapshots show a dialog with a two-line title and an alert dialog in each
  locale.

## Platform notes

- **Web.** shadcn/ui's `dialog`, `alert-dialog`, and `sheet` sources, adapted, on Radix, which the
  package already depends on. Radix traps focus, hides the page behind from assistive technology,
  and locks scrolling. There is no swipe to dismiss on the web; Radix does not offer it, and
  adding a library for it is not worth a gesture that must never be the only way out.
- **iOS.** Dialogs and sheets use SwiftUI's `sheet`, sized to their content with presentation
  detents, with the tokens inside it. The system draws the drag indicator, closes the sheet on a
  swipe or VoiceOver's escape gesture, and lets the app refuse while there are unsaved changes.
  An alert dialog is SwiftUI's `alert`, with the confirming button given the destructive role
  where it destroys something. The system alert follows the person's text size, bold text, and
  contrast settings, and is what people on iOS recognize as a request to confirm. The cost is
  that the theme does not reach it: on iOS an alert looks like the system's, not the brand's.
  This follows ADR 0016: where the platform provides a behaviour people can configure, use it.
- **Android.** Compose's `Dialog` window with content built from the tokens. A sheet is a dialog
  window whose content is dragged with Compose Foundation's anchored dragging, because Material's
  bottom sheet would add the Material dependency ADR 0016 leaves out. The system back gesture,
  including predictive back, closes a dialog or sheet as Cancel.

## Migration

None. These are new components.

## Alternatives considered

- **Themed alerts on iOS.** One look on every platform, but a custom alert does not follow the
  system's accessibility settings as fully as the system's own, and people on iOS know the
  system alert.
- **A side sheet as its own component.** It shares every part and rule with the bottom sheet, so
  it is an edge, not a component.
- **Full-screen dialogs on phones.** Material offers them for long tasks. A bottom sheet covers
  the same need and can still be dismissed by dragging.
- **Swipe to dismiss on the web.** shadcn/ui's drawer does this with an extra library, `vaul`.
  It adds a dependency for a gesture that is never required.
- **Starting focus on the first control.** Radix's default. It reads well for a form, which is
  why the app can choose it, but in a dialog that starts with a link or a destructive button it
  puts focus somewhere surprising.
