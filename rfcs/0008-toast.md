# RFC 0008: Toast

- Status: proposed
- Kind: component
- Proposed: 2026-11-24
- Decided:

## Summary

Adds Toast: a short message near the bottom of the screen that says something has happened,
such as "Message sent", optionally with one action such as Undo. It does not take focus or
block the screen. It is for any app that needs to confirm an action without interrupting the
next one.

## Problem

After an action with no visible result on the screen (archiving an item, copying a link, saving
in the background), people need to know it worked. Apps build their own toasts and get the same
things wrong: the message is not announced to a screen reader, it disappears before someone
using one can reach its Undo, a keyboard user has no way to reach it at all, or it covers the
on-screen keyboard. Each platform also differs: Android has Material's snackbar, the web has
nothing built in, and iOS has nothing for this at all.

## Proposal

### Anatomy

| Part         | Required                     | Notes                                                                                   |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------------- |
| Container    | Yes                          | A raised surface with an ink outline, so it stands apart from any content it covers     |
| Message      | Yes                          | One sentence, in `type.body.md`. It wraps; it is never truncated                        |
| Action       | No                           | One Button, `ghost` and `sm`. It moves below the message when it does not fit beside it |
| Close button | When the toast has an action | An icon-only ghost Button at the end. Its name is given by the app                      |

There is **one look**: no info, success, warning, or error variants. In the base, color is not a
status and red is kept for danger. A toast reports something that has already happened; a failure
people must act on belongs next to the thing that failed or in a dialog, where it stays.

### Behaviour

| Aspect         | Decision                                                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Placement      | Bottom center, above the on-screen keyboard and any bottom bar the app declares. At most `size.panel.md` wide                                                                                                   |
| Number         | One at a time. Others wait in a queue, in order                                                                                                                                                                 |
| Without action | Closes after 6 seconds. The timer pauses while a pointer is over it, while it has focus, and while the app is in the background. On Android, the person's accessibility timeout setting replaces it when longer |
| With action    | Stays until the action is used or the toast is closed                                                                                                                                                           |
| Focus          | Never moved to the toast                                                                                                                                                                                        |
| Announcement   | Politely: after what the screen reader is saying, without interrupting it                                                                                                                                       |
| Reaching it    | Web: F8 moves focus to the toast, and back. Touch: it is in the reading order like any other element                                                                                                            |
| Closing        | The close button, Escape while it has focus, or a swipe on touch screens                                                                                                                                        |

### Tokens

No new semantic tokens. The toast uses `color.bg.raised` (RFC 0005), `shadow.overlay` and
`size.panel.md` (RFC 0006).

Component tokens, `tokens/component/toast.tokens.json`:

| Token                                    | Value                                                               |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `toast.bg`                               | `color.bg.raised`                                                   |
| `toast.border.width`, `.color`           | `border-width.thin`, `color.border.strong`                          |
| `toast.radius`                           | `radius.lg`                                                         |
| `toast.shadow`                           | `shadow.overlay`                                                    |
| `toast.max-width`                        | `size.panel.md`                                                     |
| `toast.margin`                           | `space.4`, from the edges of the window and from what it sits above |
| `toast.padding-block`, `.padding-inline` | `space.3`, `space.4`                                                |
| `toast.gap`                              | `space.3`, between message, action, and close button                |
| `toast.message`                          | `type.body.md`                                                      |
| `toast.fg`                               | `color.fg.default`                                                  |
| `toast.enter.duration`, `.easing`        | `motion.duration.normal`, `motion.easing.interactive`               |
| `toast.exit.duration`, `.easing`         | `motion.duration.fast`, `motion.easing.leave`                       |

The outline is `color.border.strong`, not the hairline dialogs use: a toast has no scrim behind
it, so its edge alone separates it from whatever it covers. In the base that is an ink outline,
3:1 or more against the toast's own fill in every mode. The toast slides up a short way as it
fades in; with reduced motion it only fades.

Usage rules that will go into the guidelines:

- Say what happened in a short sentence: "Address deleted", not "Success!".
- Use a toast only for something people can also see or find elsewhere. A toast is gone in
  seconds and cannot be read again.
- Offer an action only to undo or to go to what was made, and label it with one or two words:
  "Undo", "View".
- Do not use a toast for errors that need action, for anything that needs a decision, or for a
  message longer than one sentence.
- Do not show a toast for an action whose result is already visible on the screen.

## Prior art

Read from each system's public documentation on 2026-11-24. Material is read from the Jetpack
Compose documentation and Material Components for Android, because m3.material.io shows nothing
without JavaScript. Fluent 2 (web) and AWS Cloudscape's Flashbar, a page-level notification
rather than a toast, were also read and appear below where they differ.

| Question                                    | IBM Carbon                                                                                              | Adobe Spectrum                                                                                                 | Google Material                                                              | GitLab Pajamas                                                                         | Raincoat                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Parts (anatomy)                             | Icon, title, body, close button; an actionable toast adds one button                                    | Icon, text, at most one button, close button                                                                   | Supporting text, optional action, optional close button                      | Message, an optional single action that is discouraged, Dismiss button                 | Message, optional action, close button when there is an action                                     |
| Variants and placement                      | Info, success, warning, error; top right, newest on top                                                 | Neutral, informative, positive, negative; bottom center; up to three shown                                     | No statuses; bottom of the screen; one at a time in Compose, the rest queued | No statuses; bottom center on small screens, bottom left on large                      | No statuses; bottom center; one at a time, queued                                                  |
| Timing                                      | Persists by default; optional 5-second dismissal; an actionable toast stays                             | Closes only with its button by default; at least 5 seconds when it closes itself; an actionable one never does | Short, long, or indefinite; "snackbars with an action should not timeout"    | 5 seconds by default, 1 second at least; pauses on hover                               | 6 seconds without an action, pausing on hover, focus, and in the background; with an action, stays |
| Keyboard behaviour                          | Takes no focus and is not in the Tab order; an actionable toast takes and traps focus; Escape closes    | Tab between button and close; Escape closes; React Spectrum reaches toasts with F6                             | Not read                                                                     | No shortcut; warns that toasts at the end of the page are hard to reach before they go | Takes no focus; F8 reaches it on the web; Escape closes it                                         |
| Screen-reader role, name, and announcements | `alert`, `log`, or `status`; `alertdialog` when actionable; the information must be available elsewhere | `alert` in Spectrum Web Components; a landmark labelled "Notifications" in React Spectrum                      | The text is passed to TalkBack; add a dismiss action to an indefinite one    | No messages that need an action or must survive a refresh                              | A polite status announcement; a labelled landmark on the web                                       |
| Right-to-left and long-text behaviour       | 288px wide, two lines at most; longer text goes elsewhere                                               | Mirrored; under two lines in English; the button drops below the text first                                    | A long action can go on its own line                                         | One sentence; wraps at its maximum width                                               | Mirrored; wraps; the action drops below the message first                                          |

Where the systems disagree, and which way Raincoat goes:

- **Lifetime.** Carbon, Spectrum, and Cloudscape keep toasts until closed; Pajamas (5 seconds),
  Fluent (7 seconds), and Compose's short duration close them. Raincoat closes a toast without
  an action after 6 seconds, the longer of the two minimums Adobe publishes, because a message
  that only confirms should not need tidying away. A toast with an action stays, as Carbon,
  React Spectrum, and Material keep theirs, so that nobody loses an Undo to a timer.
- **Urgency.** Spectrum Web Components uses `alert` for every toast, and Fluent is assertive for
  everything but info. Raincoat is always polite: anything urgent enough to interrupt belongs in
  a dialog.
- **Focus.** Carbon traps focus in an actionable toast, which makes it a dialog. Raincoat never
  moves focus, and gives keyboard users a shortcut, as React Spectrum and Fluent do.
- **Statuses.** Carbon, Spectrum, Fluent, and Cloudscape color toasts by status; Material and
  Pajamas do not. Raincoat does not, for the reasons above.
- **Number.** Material shows one, Spectrum three, Fluent four. Raincoat shows one, so a screen
  reader announces them in order and the newest never hides under another.
- **Placement.** Carbon puts toasts top right, Pajamas bottom left on large screens, and
  Spectrum and Material at the bottom center. Raincoat uses the bottom center on every screen,
  which needs no mirroring and is where thumbs and eyes already are on a phone.

## Accessibility

| Requirement                                                                                     | How it is tested                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The message is announced once, politely, without moving focus                                   | Web: a `status` live region in the accessibility tree. iOS: an announcement in UI tests. Android: a polite live region |
| A toast with an action stays until it is used or closed (WCAG 2.2.1)                            | Interaction tests with a fake clock on each platform                                                                   |
| Timers pause on hover, on focus, and in the background, and use Android's accessibility timeout | Interaction tests with a fake clock                                                                                    |
| Keyboard users can reach the toast and return (web: F8), and close it with Escape               | Playwright keyboard tests                                                                                              |
| A toast with an action has a close button with a name                                           | Each platform's API requires the name; the role-and-name tests read it                                                 |
| It never covers the on-screen keyboard, focused content, or the app's bottom bar                | Reference app tests with the keyboard shown                                                                            |
| Reduced motion: it fades and does not move                                                      | Snapshot and motion test with the reduced-motion setting                                                               |

On the web, the toast region is a landmark named by the app ("Notifications" in English), so
it can be found by landmark navigation too. Its name and the F8 hint are the app's words: the
package ships no text.

## Internationalization

- **Right-to-left.** The action and close button sit at the end edge, on the left. The toast is
  centered, so its position does not change.
- **Long and expanded text.** The message wraps. When the message and action do not fit on one
  line, the action moves below the message, end-aligned. Snapshots cover the expanded
  pseudo-locale.
- **Vietnamese and CJK** snapshots show a toast with an action in each locale.
- **Timing and length.** A translated message can be longer and take longer to read. The
  6-second minimum and the pause on hover and focus cover a sentence; a message that needs more
  time is too long for a toast.

## Platform notes

- **Web.** Radix's Toast primitive, from the `radix-ui` package the components already use. It
  provides the live region, the F8 shortcut, Escape, swipe on touch, and pausing. shadcn/ui's
  current registry offers a toast only through the `sonner` library, which would be a new
  dependency, so the component is written on Radix without a shadcn/ui source, and the lock file
  records that. A provider and a `useToast()` hook show toasts from anywhere in the app.
- **iOS.** A view modifier puts a toast host on a screen, and an environment action shows toasts.
  The message is posted to VoiceOver as an announcement, so a toast without an action never has
  to be reached to be read.
- **Android.** `RaincoatToastHost` with a host state whose `show` suspends until the toast
  closes, as Compose's snackbar host does, built on Compose Foundation. The timer comes from the
  accessibility manager's recommended timeout, which follows the person's "time to take action"
  setting.

## Migration

None. This is a new component.

## Alternatives considered

- **Status variants.** Most systems have them. In the base, they would need three new color
  roles in four modes each, and the base's rule is that red means danger. A toast reports
  something done; when it failed, the message belongs where the failure can be fixed.
- **Sonner on the web.** Polished and MIT-licensed, and what shadcn/ui now suggests. It would be
  a new dependency for what Radix's primitive, already installed, provides.
- **Several toasts at once.** Spectrum and Fluent stack them. A stack is harder to follow with a
  screen reader and covers more of a phone's screen.
- **Taking focus for a toast with an action,** as Carbon does. That is a dialog, and it
  interrupts the very task the toast was meant to leave alone.
