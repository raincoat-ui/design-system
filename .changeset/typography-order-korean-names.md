---
"@raincoat-ui/swift": patch
"@raincoat-ui/android": patch
---

Typography fixes.

- **SwiftUI:** a heading is no longer drawn smaller than the heading one level below it at the
  largest text sizes. iOS enlarges its large title less than its smaller titles, so at the
  largest accessibility size `headingXl` was smaller than `headingLg`. Each heading now grows to
  at least the size of the look below it.
- **Compose:** Korean text breaks only between whole words, from Android 13, and every language
  breaks by the strict rules, as the Button's label does. Korean headings broke in the middle of
  a word.
- **Every platform:** the guidelines now say what each platform does with a name inside a
  sentence. A paragraph takes its direction from its first strong character, but a name in
  another script takes the punctuation and numbers beside it into its own run, as in "Message
  from 2 ,مريم الحسيني minutes ago". Isolate the name: in a `Text` span with `dir="auto"` on the
  web, and between U+2068 and U+2069 on iOS and Android.
