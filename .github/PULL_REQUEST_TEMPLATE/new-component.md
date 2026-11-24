<!-- Title: a Conventional Commit, for example: feat(button): add the Button component -->

## New component

- RFC: <!-- link to the accepted RFC; required -->
- Spec: <!-- specs/components/<name>/spec.yaml -->

## Platforms in this pull request

- [ ] Web (React)
- [ ] iOS (SwiftUI)
- [ ] Android (Compose)

## Definition of Done

- [ ] Spec and guidelines are complete; the implementation uses the generated variant types.
- [ ] Only theme tokens are used: no raw colors or dimensions.
- [ ] Unit and interaction tests.
- [ ] Snapshots for every theme, all four color modes, left-to-right and right-to-left, largest text size, and the Vietnamese, Chinese, Japanese, Korean, and expanded-text locales.
- [ ] Automated accessibility checks pass; keyboard or gesture behaviour is tested.
- [ ] Documentation page, parity matrix row, and a changeset. <!-- `pnpm docs:build` generates the page (Components) and the row (Components, Parity matrix) from the spec; the row reads the spec's `implementations`. Static renditions for the page, if any, go in apps/docs/scripts/renditions/<id>.mjs. -->
- [ ] Performance budget holds (from milestone 4, when budgets are defined).
- [ ] Every commit is signed off.
