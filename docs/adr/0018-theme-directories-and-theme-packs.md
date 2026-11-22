# 0018. A theme is a directory the build reads; theme packs use the published build

- Status: accepted
- Date: 2026-11-22
- Amends: [0010](0010-themes.md), [0017](0017-release-pipeline.md)

## Context

Record 0010 made a theme a directory of overrides on top of the base tokens, published as one
artifact per theme on every platform, and required the token engine to work on a theme kept
outside this repository. Until milestone 2 the base theme was the only one, and every list of
themes was written by hand: the Swift package manifest, the Gradle settings, the release scripts,
the Changesets group, and each platform's tests. Milestone 2 asks that adding a theme touch only
its directory and generated files, that every test matrix extend by itself, and that a theme
outside this repository build with the published command line.

## Decision

**A theme is `themes/<id>/`.** It holds `theme.json` (a name and a one-line description),
`brand.md` (voice and usage), and `tokens/<tier>/<name>.tokens.json` files that mirror files of
the base source and hold only new `$value`s. Types, descriptions, and contrast declarations stay
the base's, so every rule of the base applies to every theme. The base theme is the token source
itself, named by `tokens/theme.json`. A theme may also carry the web fonts it names, in
`fonts/`, with their licenses in its own `assets.yml`, which the asset license gate reads beside
`licenses/assets.yml`.

**The linter holds a theme to these rules,** on top of every rule of the base: it overrides only
tokens marked `overridable`; it adds and removes none; each override sits in the file that holds
the token in the base; and a role it changes in one color mode or density it changes in all of
them, so that no mode keeps the base's value by accident. Contrast is checked for each theme.

**Everything per theme is generated,** including the files that list every theme: the theme's
npm package (`package.json`, `README.md`, `LICENSE`, `NOTICE`, and the stylesheet), its Swift
target and contract test, the Swift package manifest, its Gradle module and build file, its
Kotlin contract test, and the lists of themes the SwiftUI and Compose component tests run over.
Gradle includes every generated `theme-<id>` module, and the release scripts and the Changesets
group find theme packages by name. The build reports generated directories that belong to no
theme rather than deleting them.

**Each theme installs alone.** The UI layers keep the base theme as their default, which is no
client's brand; every other theme is a package of its own that brings only the token types with
it. The release rehearsal installs each npm theme into an empty project, builds each Swift theme
product by itself, and reads each Maven theme module's dependencies.

**Every test that a theme can change runs in every theme, by discovery.** The React component
tests run as one Vitest project per theme; the SwiftUI and Compose component tests take the
generated theme list as a test argument; the contract tests are generated per theme; and the
reference apps run once per theme in CI, from a list the workflow reads from the repository. The
iOS reference app is switched to a theme the way an app selects one, by linking its product
(`tools/reference/ios-theme.mjs`); the Android app takes `-PraincoatTheme`, and the web apps
`RAINCOAT_THEME`.

**`@raincoat-ui/tokens` is published,** with the base source it was released with bundled
inside. Run in a directory that is not this repository, its command line builds that
directory's `themes/` into a theme pack: an npm package per theme, a Swift package whose
products depend on the Swift mirror at the same version, and a Gradle build whose modules depend
on the token types in the Maven repository at the same version. Each runs the themes' contract
tests. `theme.json` may name the pack's own npm package and Maven group; inside this repository
names follow record 0012. The release rehearsal builds a fictional pack with the packed command
line from outside the checkout and tests what it produces against the staged Swift mirror and
Maven repository; after a release the same check runs against the registries.

## Consequences

- Adding a theme is adding `themes/<id>/`, running `pnpm tokens:build` and `pnpm install`, and
  writing a changeset. The pull request touches nothing else.
- CI time grows with each theme, mostly in the reference apps' simulator and emulator jobs.
- The first publish of `@raincoat-ui/tokens`, and of each new theme's npm package, needs the
  one-time token the runbook describes.
- Theme packages do not bundle fonts yet. A theme's `fonts/` is used by the documentation; apps
  load the font themselves, or fall back to the system font.

## Rejected

- **Hand-written lists of themes,** with a check that they agree. Adding a theme would still mean
  editing them, which milestone 2 rules out.
- **An overlay that may also change descriptions or contrast declarations.** A theme could then
  weaken a check it is meant to pass.
- **One package of all themes, for the tests and reference apps.** It would be published by the
  mirror and the Maven repository, where one client could install another's brand.
- **Copying the base source into each theme pack.** A pack would drift from the base it runs on;
  bundling the base in the command line ties them to one version.
