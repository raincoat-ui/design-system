# Raincoat brand marks

The mark is a yellow raincoat with its hood up. The coat is the layer Raincoat provides, and the
ink inside the hood is the app it protects. That is the README's line, "the layer that protects
you when you are out in the rain", drawn as the coat itself. Every brand app gets the same cut,
and a theme changes only its color.

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

- The coat is drawn on a 64-unit grid and fills a 56-unit square, 4 units in from every edge. The
  hood is a circle of radius 11 centered at (32, 15). Its sides drop straight to the shoulders, the
  sleeves hang from the shoulders and end square at the cuff, 8.5 units wide, and the body flares
  from the underarm to a straight hem.
- The hood's opening is a circle of radius 6 on the same center, so the hood wall is 5 units all
  the way round. The opening narrows to a point at the collar and runs on as the closed front,
  2 units wide, to the hem. The coat is one shape with this opening cut into it: on light
  backgrounds an ink lining fills the opening, and on dark backgrounds and in one color it is
  left open.
- The wordmark is "raincoat" set lowercase in Be Vietnam Pro SemiBold (OFL-1.1), the system's own
  `font.family.sans`, tracked at −0.015 em and converted to outlines. The SVGs embed no font.
- Colors are primitive tokens: yellow `color.brand.400` (`#f7d22a`) for the coat, and ink
  `color.neutral.900` (`#191b1d`) for the lining and the wordmark. On dark backgrounds the coat
  stays yellow, the lining is left open and the wordmark turns white. The app icon is the coat in
  yellow on an ink tile.

## Rules

- Keep clear space of at least the hood wall's width (5/64 of the mark's height) on every side.
- Use the mark at 16 px or larger, or the app icon below that. Use the full logo at 20 px tall or
  larger.
- Do not recolor the lining, outline the mark, add effects, or set the wordmark in another
  typeface. The coat is the only part that may change color, and only to show what theming does.
