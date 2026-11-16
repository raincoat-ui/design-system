# Changesets

Every pull request that changes what a package ships adds a file here saying what changed, in
words meant for the people who use the packages. Run `pnpm changeset` and answer its questions.

All packages share one version (see `docs/adr/0008-lockstep-versioning.md`), so choosing any
package releases them all. The Swift package and the Android modules are listed as
`@raincoat-ui/swift` and `@raincoat-ui/android`; those names exist only so that their changes
are recorded here and never reach npm.

Releasing is described in `docs/maintaining/runbook.md`.
