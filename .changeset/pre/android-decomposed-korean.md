---
"@raincoat-ui/android": patch
---

Decomposed Korean breaks between whole words, in every component.

Hangul can arrive decomposed, as letters rather than syllables, in Unicode's NFD form: file names
from macOS are written that way. Android breaks Korean by phrase only between composed
syllables, so a decomposed heading or label broke in the middle of a word. The components now
compose the read-only text they show (NFC) before laying it out: Text and Heading, a card's
title, the Button's label, a tab's label, the Toast's message, and an Input's label,
description, placeholder, and error. The two forms draw the same, and assistive technology reads
the composed text, which says the same. Text that is already composed is shown as it is. The
value of an Input, which the person edits, is never changed.
