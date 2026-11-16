# @raincoat-ui/theme-base

The Raincoat base theme: every design token as a CSS custom property, for four color modes and
two densities.

```css
@import "@raincoat-ui/theme-base/theme.css";
```

```css
.card {
  background: var(--rc-color-bg-surface);
  color: var(--rc-color-fg-default);
  border-radius: var(--rc-radius-md);
  padding: var(--rc-space-4);
}
```

## Color mode and density

Without any attribute, the theme follows the system: light or dark, and the "more contrast"
setting. To choose yourself, set `data-theme` on any element to `light`, `dark`, `light-hc`, or
`dark-hc`. Set `data-density="compact"` for smaller controls. Both can be nested.

```html
<html data-theme="dark" data-density="compact">
```

## Names

Every property starts with `--rc-`, followed by the token's path: the token
`color.bg.surface` is `--rc-color-bg-surface`. Use the semantic tokens (`--rc-color-*` by role,
`--rc-space-*`, `--rc-radius-*`, `--rc-type-*`) and the component tokens. The color ramps
(`--rc-color-neutral-500`) are the theme's raw material and may change between themes.

The [token reference](https://raincoat-ui.github.io/design-system/) lists every token with its
value in each mode.

The file is generated from the token source in
[raincoat-ui/design-system](https://github.com/raincoat-ui/design-system). Components for React
are in `@raincoat-ui/react`.

## License

Apache-2.0.
