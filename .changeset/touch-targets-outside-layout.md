---
"@raincoat-ui/swift": patch
"@raincoat-ui/android": patch
---

A Button takes the room it shows on iOS and Android.

The minimum touch target (44pt on iOS, 48dp on Android) was part of the layout size, so a small
button took more room than it showed. Now the layout size is the visible size, and the area
that takes touches reaches past a smaller button without taking room, as it already did on the
web. Layouts that relied on the extra room around a small or, on Android, medium button will
move: leave 8px or more between small buttons.

On Android a mouse now has to be on the button itself, and a touch between two buttons goes to
the nearer one.
