---
"@raincoat-ui/swift": patch
---

On iOS, the text of every component grows with the person's text size setting as much as the
system font of the text style it follows. Before, the scale came from SwiftUI's scaled metric,
which grows by a factor of its own: at the largest accessibility size, body-sized text was 3
times its default size instead of 3.12 times.
