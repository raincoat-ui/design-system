# @raincoat-ui/tokens

The Raincoat token build. It checks a token source and its themes, checks their contrast in
every color mode, and generates each platform's code: a stylesheet for the web, a Swift package
for iOS, and Kotlin modules for Android.

The Raincoat repository builds its own themes with it. Use it yourself to build a **theme pack**:
themes kept in a repository of your own, such as brands that must not be public.

## A theme pack

A theme pack is a directory with one directory per theme:

```text
my-themes/
  package.json
  themes/
    focus/
      theme.json
      tokens/
        primitive/color.tokens.json
        semantic/color.light.tokens.json
        semantic/color.dark.tokens.json
        semantic/color.light-hc.tokens.json
        semantic/color.dark-hc.tokens.json
        semantic/shape.tokens.json
```

Install the token build at the version of Raincoat your apps use, so that the themes are built
on the base they will run with:

```sh
npm install --save-dev --save-exact @raincoat-ui/tokens@0.1.0-next.5
```

`theme.json` names the theme and says where its packages are published:

```json
{
  "$schema": "../../node_modules/@raincoat-ui/tokens/base/schemas/theme.schema.json",
  "name": "Focus",
  "description": "Black and white only; red is kept for danger.",
  "packages": { "npm": "@acme/theme-focus", "maven": "com.acme" }
}
```

Each file under `tokens/` has the name of a file of the base token source and gives new values
to tokens that file marks overridable: the brand and neutral color ramps, each color role in each
mode, font families and weights, radii, the shadows of raised surfaces, and the few component
tokens marked overridable, such as `card.border.default`. A token changed in one color mode is
changed in all four. Spacing, sizes, touch targets, focus rules, and the red used for danger are locked, and a
theme can neither add nor remove a token.

```json
{
  "radius": {
    "sm": { "$value": "{dimension.0}" },
    "md": { "$value": "{dimension.0}" },
    "lg": { "$value": "{dimension.0}" }
  }
}
```

## Commands

```sh
npx raincoat-tokens lint       # every rule the base is held to, plus the theme rules
npx raincoat-tokens contrast   # every declared color pair, in every theme and color mode
npx raincoat-tokens build      # every theme's packages, into dist/ (--out <dir> to change)
npx raincoat-tokens build --check   # fails if dist/ is out of date
```

`build` writes one package per platform, each depending on Raincoat's published packages of the
same version:

| Directory        | What it is                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| `dist/npm/<id>/` | The theme's stylesheet, as an npm package                                   |
| `dist/swift/`    | A Swift package with a product `RaincoatTheme<Id>` per theme, and its tests |
| `dist/android/`  | A Gradle build with a module `theme-<id>` per theme, and its tests          |

The Swift package and the Gradle build each run the themes' contract tests: `swift test` in
`dist/swift`, and `gradle test` in `dist/android`.

## License

Apache-2.0.
