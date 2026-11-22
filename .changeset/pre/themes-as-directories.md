---
"@raincoat-ui/tokens": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
"@raincoat-ui/theme-base": patch
---

Themes are directories, and the token build is published.

A theme is `themes/<id>/`: a `theme.json`, a `brand.md`, and files that give new values to the
tokens the base marks overridable. The token build checks each theme with every rule of the base,
checks its contrast in every mode, and generates its packages on every platform:
`@raincoat-ui/theme-<id>` on npm, `io.github.raincoat-ui:theme-<id>` in the Maven repository, and
the Swift product `RaincoatTheme<Id>`. Each installs on its own, with only the token types.

`@raincoat-ui/tokens` is now published, with its command line `raincoat-tokens`. Run in a
repository of your own, it builds the themes there into a theme pack: an npm package per theme, a
Swift package, and a Gradle build, each depending on Raincoat's packages of the same version. Use
it for brands that must not be public.
