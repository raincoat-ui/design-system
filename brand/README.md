# Raincoat brand marks

The mark is a capital R drawn as a raincoat seen from the side, hood up. The bowl is the hood, the
stem is the coat's back and the leg is its front, falling to the hem. The ink R is the layer
Raincoat provides, and the yellow lining showing in the hood is the app it protects. That is the
README's line, "the layer that protects you when you are out in the rain", drawn as a letter.

These files are Raincoat's own identity, licensed with the rest of the repository. They are not a
theme asset: brand apps built on Raincoat never show them.

| File                           | Use                                                              |
| ------------------------------ | ---------------------------------------------------------------- |
| `raincoat-logo.svg`            | Mark and wordmark, on light backgrounds                          |
| `raincoat-logo-reversed.svg`   | Mark and wordmark, on dark backgrounds                           |
| `raincoat-logo-mono.svg`       | One color (`currentColor`), for print or embossing               |
| `raincoat-mark.svg`            | The mark alone, on light backgrounds                             |
| `raincoat-mark-reversed.svg`   | The mark alone, on dark backgrounds                              |
| `raincoat-mark-mono.svg`       | The mark alone in one color (`currentColor`)                     |
| `raincoat-app-icon.svg`        | Rounded-square tile, for avatars and app icons                   |
| `raincoat-app-icon-square.svg` | The tile with square corners, for platforms that round their own |
| `social-preview.html`          | The source of the docs site's share image                        |

The docs site's icons and share image come from these files:

- `apps/docs/public/favicon.svg` is the app icon at 32 units.
- `apps/docs/public/apple-touch-icon.png` is the square tile at 180 px. iOS rounds the corners
  itself, and would fill transparent corners with black.
- `apps/docs/public/social-preview.png` is `social-preview.html` at 1200 × 630 px, the size link
  previews expect. It is set like the site's cover, from the logo, the site's fonts and the base
  theme's colors.

Render the two images again after changing a source. The commands use the repository's own
Playwright, so run `pnpm web:browsers` once first:

```sh
cd packages/web
pnpm exec playwright screenshot --viewport-size "180, 180" "file://$PWD/../../brand/raincoat-app-icon-square.svg" ../../apps/docs/public/apple-touch-icon.png
pnpm exec playwright screenshot --viewport-size "1200, 630" --wait-for-timeout 500 "file://$PWD/../../brand/social-preview.html" ../../apps/docs/public/social-preview.png
```

## Construction

- The R is drawn on a 64-unit grid, from y = 4 to the baseline at y = 60. The hood is a circle of
  radius 18 centered at (28, 22). The stem drops from its left edge to the baseline, 11 units wide.
- The hood's opening is a circle of radius 10, set 3 units forward of the hood's center and
  0.5 units lower. The hood wall is therefore 11 units at the back, the stem's width, and thins to
  5 at the brim, the way a hood frames a face.
- The leg is the coat's front. Its outer edge leaves the hood 22° below the hood's right-hand
  side and runs straight to the hem at x = 54. Its inner edge starts where the hood meets the
  stem, so the space under the hood is a single triangle. The hem is 12.5 units wide.
- On light and dark backgrounds a yellow lining fills the opening. It is drawn under the R and a
  unit larger than the opening, so no seam shows at its edge. In one color the opening is left
  open.
- The wordmark is "raincoat" set lowercase in Be Vietnam Pro SemiBold (OFL-1.1), the system's own
  `font.family.sans`, tracked at −0.015 em and converted to outlines. The SVGs embed no font.
- Colors are primitive tokens: ink `color.neutral.900` (`#191b1d`) for the R and the wordmark,
  and yellow `color.brand.400` (`#f7d22a`) for the lining. On dark backgrounds the R and the
  wordmark turn white and the lining stays yellow. The app icon is the white R on an ink tile.

## Rules

- Keep clear space of at least the brim's width (5/64 of the mark's height) on every side.
- Use the mark at 16 px or larger, or the app icon below that. Use the full logo at 20 px tall or
  larger.
- Do not recolor the R, outline the mark, add effects, or set the wordmark in another typeface.
  The lining is the only part that may change color, and only to show what theming does.
