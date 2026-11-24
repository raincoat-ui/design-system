---
"@raincoat-ui/swift": patch
---

On iOS, a dialog or a sheet that the keyboard covers the bottom of now keeps to what shows above
it. Its scrolling area ends above the keyboard, so the field being edited and the footer's
buttons scroll into view and stay there, and the field being edited is brought into view when
the keyboard comes up. Before, at the largest text sizes, the dialog went on under the keyboard,
and what was scrolled into view slid back behind it.
