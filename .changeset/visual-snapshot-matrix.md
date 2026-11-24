---
"@raincoat-ui/tokens": minor
---

The token build checks the visual snapshot matrix and the text of each spec's examples.

In this repository, `raincoat-tokens lint` now also checks `specs/snapshots.yaml`, the snapshots
every component has, and each spec's `strings.yaml`, the text its examples show in every locale
of the matrix. `raincoat-tokens build` generates both for the web, iOS, and Android snapshot
tests, with the expanded pseudo-locale derived from English. The package exports `loadMatrix`,
`resolveSnapshots`, `componentExamples`, and `expandText`, which does that derivation. Theme packs
are not affected.
