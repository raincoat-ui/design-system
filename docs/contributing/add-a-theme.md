# Add a theme

A theme is a directory under `themes/`. Adding one is the whole change: the token build
generates every platform's package for it, and every test that runs per theme picks it up. This
page is the whole procedure.

Everything in this repository is public. It holds fictional themes, and a real brand only with
its owner's written consent. For a brand that must stay private, build the same directory in a
repository of your own with the published token build: see the README of
[`@raincoat-ui/tokens`](../../packages/tokens/README.md).

## 1. Open an issue

Use the "New theme" issue form. It records the theme's id and, for a real brand, the owner's
consent.

## 2. Make the directory

```text
themes/<id>/
  theme.json      its name and a one-line description
  brand.md        voice and usage
  tokens/         new values for tokens of the base source
```

The id is lowercase letters and digits, in words joined by hyphens, and becomes every package's
name: `@raincoat-ui/theme-<id>` on npm, `io.github.raincoat-ui:theme-<id>` in the Maven
repository, and `RaincoatTheme<Id>` in the Swift package.

```json
{
  "$schema": "../../schemas/theme.schema.json",
  "name": "Ink",
  "description": "Black and white only: black ink on white paper, white on black at night."
}
```

## 3. Override tokens

Each file under `tokens/` has the path of a base file, `tokens/<tier>/<name>.tokens.json`, and
holds only `$value`s, with an optional `$description` saying why. Types, descriptions, and
contrast declarations stay the base's.

| What a theme may change                 | Base file                                  |
| --------------------------------------- | ------------------------------------------ |
| The brand and neutral ramps             | `tokens/primitive/color.tokens.json`       |
| Font families and weights               | `tokens/primitive/font.tokens.json`        |
| The color each role takes, in each mode | `tokens/semantic/color.<mode>.tokens.json` |
| Radii                                   | `tokens/semantic/shape.tokens.json`        |

Only tokens the base marks `overridable` can change. Spacing, sizes, border widths, touch
targets, focus rules, and the red ramp used for danger are locked, and a theme can neither add
nor remove a token. A role changed in one color mode is changed in all four, so that no mode
keeps the base's value by accident.

```json
{
  "radius": {
    "sm": { "$value": "{dimension.0}" },
    "md": { "$value": "{dimension.0}" },
    "lg": { "$value": "{dimension.0}" }
  }
}
```

## 4. Check and build

```sh
pnpm tokens:lint                          # the theme rules, and every rule of the base
pnpm tokens:contrast -- --theme <id>      # every declared pair, in all four modes
pnpm tokens:build                         # every platform's files for every theme
pnpm install                              # links the new npm package into the workspace
```

`pnpm tokens:build` writes the theme's packages: `packages/web-themes/<id>/`,
`packages/ios/Sources/RaincoatTheme<Id>/` and its tests, and `packages/android/theme-<id>/`. It
also lists the theme in the files that name every theme: the Swift package manifest and the
component tests' theme lists. Commit them all, and the lockfile's new
`packages/web-themes/<id>: {}` entry; CI fails when a generated file differs from what the source
produces.

The React, SwiftUI, and Compose component tests then run in the new theme as well, in every
color mode and density, and the release rehearsal installs its packages one at a time.

## 5. Add a changeset and open the pull request

A new theme ships new packages, so run `pnpm changeset` and say what the theme is. Then open the
pull request with the "New theme" template (append `?template=new-theme.md` to its URL). It
touches `themes/<id>/`, generated files, and the changeset, and nothing else.

## Removing a theme

Delete `themes/<id>/`, then the directories the build reports as belonging to no theme. Removing
a published theme takes its packages away from the apps that use it, so it needs a major version.
