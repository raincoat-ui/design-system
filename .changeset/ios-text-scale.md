---
"@raincoat-ui/swift": patch
---

On iOS, the text of every component grows with the person's text size setting as much as the
system text style it follows. Before, the scale was read from a rounded value, so text could
come out smaller or larger than the system's: at the largest accessibility size, body-sized
text was 3 times its default size instead of 3.12 times.
