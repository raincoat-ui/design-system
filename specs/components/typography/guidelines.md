# Typography guidelines

## When to use

Use Text for running text, labels, and short facts, and Heading for the title of a screen or
of a part of it. Set every piece of text in one of them, so that its size, weight, and color
come from the theme and grow with the person's text size setting.

A component that has text of its own, such as a Button, sets it itself. Do not wrap it in Text.

## Choosing a heading's level

The level is the heading's place in the outline of the screen. Assistive technology lists
headings by level, and people move from one to the next with it.

- Choose the level for the heading's place in the outline, then its look if the default does
  not fit. Setting `variant` changes the look and keeps the level.
- Do not skip levels: a level 4 heading follows a level 3 one.
- Give a screen one level 1 heading: its title.

By default the look follows the level:

| Level | Look         |
| ----- | ------------ |
| 1     | `heading-xl` |
| 2     | `heading-lg` |
| 3     | `heading-md` |
| 4–6   | `heading-sm` |

## Choosing a look

| Variant      | Use it for                                     | Avoid                            |
| ------------ | ---------------------------------------------- | -------------------------------- |
| `heading-xl` | The title of a screen                          | More than one on a screen        |
| `heading-lg` | Sections of a screen                           | Titles inside a card or a dialog |
| `heading-md` | The title of a dialog or a sheet, subsections  |                                  |
| `heading-sm` | The title of a card, group titles in a list    |                                  |
| `body-lg`    | An introductory paragraph under a title        | More than one paragraph          |
| `body-md`    | Running text: the default                      |                                  |
| `body-sm`    | Secondary running text, such as help text      | The main text of a screen        |
| `label-*`    | Text that names a control, at the control size | Running text                     |
| `caption`    | Timestamps, counts, and short secondary facts  | Prose, or text to act on         |

## Color

- Use `default` for most text, and `muted` for text that supports it, such as a caption.
- Use `danger` for an error, or for text about something destructive. Say what is wrong in
  words: color alone does not reach everyone.
- Headings take `default` or `muted`. There is no danger heading.

## Writing

- Set emphasis in semibold, not in italics. Chinese, Japanese, and Korean faces have no italics.
- Keep running text under about 70 characters a line. Give the paragraph a maximum width, not a
  smaller style.
- Use sentence case for headings, as for labels.

## Long text and truncation

Text and headings wrap and grow taller. Nothing is cut short unless you ask for it.

- Do not truncate headings, labels, or anything a person must read to decide. A heading has no
  `max-lines`.
- Truncate only text that is repeated elsewhere, such as the preview of a message. Assistive
  technology reads the whole text, but a person reading the screen sees only its start.
- Leave room for translation: text in other languages can be about 40% longer.

## Text from people

Names, messages, and other text that people write can be in any language, in either direction.

- **A whole paragraph** takes its direction from its first strong character. On the web, set
  `dir="auto"` on the Text that holds it. iOS and Android do this by default.
- **A name inside a sentence** must be isolated by the app. Without that, the punctuation and
  numbers beside it join it: "Message from مريم الحسيني, 2 minutes ago" is drawn as "Message
  from 2 ,مريم الحسيني minutes ago". This happens on every platform, also to a string built from
  a translation with the name filled in.

| Platform | Isolate the name                                                                         |
| -------- | ---------------------------------------------------------------------------------------- |
| Web      | `<Text as="span" dir="auto">{name}</Text>` inside the sentence                           |
| iOS      | `"\u{2068}\(name)\u{2069}"`: U+2068 first strong isolate, U+2069 pop directional isolate |
| Android  | `"⁨$name⁩"`, or `BidiFormatter.getInstance().unicodeWrap(name)`                            |

## Do and don't

| Do                                             | Don't                                          |
| ---------------------------------------------- | ---------------------------------------------- |
| Pick the level from the outline, then the look | Pick a level for its size                      |
| Let headings and labels wrap                   | Truncate a heading or a label with an ellipsis |
| Use semibold for emphasis                      | Use italics, or color alone, for emphasis      |
| Use `caption` for a timestamp under a row      | Use `caption` for a paragraph                  |
