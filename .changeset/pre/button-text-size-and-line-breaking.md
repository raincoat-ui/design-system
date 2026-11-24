---
"@raincoat-ui/react": patch
"@raincoat-ui/swift": patch
"@raincoat-ui/android": patch
---

The Button keeps its padding at large text sizes, and breaks Japanese and Korean labels by
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
