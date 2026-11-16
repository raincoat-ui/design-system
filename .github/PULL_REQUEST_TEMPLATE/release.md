<!-- Title: chore(release): X.Y.Z -->

## Release X.Y.Z

Made with `pnpm release:version`. Merging this publishes the version: see "Releasing" in
`docs/maintaining/runbook.md`.

## Checklist

- [ ] The changelogs read correctly.
- [ ] Breaking changes: a migration guide exists under `docs/migrations/`, and the deprecation periods were honoured.
- [ ] Deprecations are listed in the changelogs.
- [ ] `release rehearsal` and the rest of CI are green on this commit.
- [ ] New npm package names in this release: a token is in place for their first publish.

## After merging

- [ ] The `release` workflow finished, and `install the published release` is green.
- [ ] `gh attestation verify` passes for one attached file.
- [ ] Documentation deployed.
- [ ] Claude Design systems republished (optional output).
