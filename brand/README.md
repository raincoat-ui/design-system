# Raincoat brand marks

The mark is a layered raindrop. The ink shell is the layer Raincoat provides, and the yellow core
is the app it protects. That is the README's line, "the layer that protects you when you are out
in the rain", drawn as a shape.

These files are Raincoat's own identity, licensed with the rest of the repository. They are not a
theme asset: brand apps built on Raincoat never show them.

| File                         | Use                                                |
| ---------------------------- | -------------------------------------------------- |
| `raincoat-logo.svg`          | Mark and wordmark, on light backgrounds            |
| `raincoat-logo-reversed.svg` | Mark and wordmark, on dark backgrounds             |
| `raincoat-logo-mono.svg`     | One color (`currentColor`), for print or embossing |
| `raincoat-mark.svg`          | The mark alone, on light backgrounds               |
| `raincoat-mark-reversed.svg` | The mark alone, on dark backgrounds                |
| `raincoat-mark-mono.svg`     | The mark alone in one color (`currentColor`)       |
| `raincoat-app-icon.svg`      | Rounded-square tile, for avatars and app icons     |

The docs favicon (`apps/docs/public/favicon.svg`) is the app icon at 32 units.

## Construction

- The shell is a circle and its two tangents to an apex point. The hole and the core are the same
  shape inset by 6 and 10.25 units on a 64-unit grid, so the shell and the gap keep an even width
  all the way round, apex included.
- The wordmark is "raincoat" set lowercase in Be Vietnam Pro SemiBold (OFL-1.1), the system's own
  `font.family.sans`, tracked at −0.015 em and converted to outlines. The SVGs embed no font.
- Colors are primitive tokens: ink `color.neutral.900` (`#161b21`) and yellow `color.brand.400`
  (`#f7d22a`). On dark backgrounds the shell turns white and the core stays yellow.

## Rules

- Keep clear space of at least the shell's width (6/64 of the mark's height) on every side.
- Use the mark at 16 px or larger, or the app icon below that. Use the full logo at 20 px tall or
  larger.
- Do not recolor the shell, outline the mark, add effects, or set the wordmark in another
  typeface. The core is the only part that may change color, and only to show what theming does.
