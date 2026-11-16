# 0017. The release pipeline

- Status: accepted
- Date: 2026-11-16
- Amends: [0007](0007-distribution.md), [0008](0008-lockstep-versioning.md)

## Context

Records 0007 and 0008 chose where packages are published and that they share one version.
Building the pipeline for the first prerelease settled how.

## Decision

**One version, including the native packages.** Changesets manages npm packages only. The
Swift package and the Android modules each have a private `package.json` that is never
published (`@raincoat-ui/swift`, `@raincoat-ui/android`), so that their changes need changesets,
get changelogs, and move with the same version. `tools/release/sync-versions.mjs` copies the
version into `gradle.properties`; the Swift version is the mirror's tag.

**What is published.**

| Registry               | Packages                                                       |
| ---------------------- | -------------------------------------------------------------- |
| npm                    | `@raincoat-ui/react`, `@raincoat-ui/theme-base`                |
| Maven, on GitHub Pages | `io.github.raincoat-ui:tokens`, `:theme-base`, `:ui`           |
| Swift mirror           | The products `Raincoat`, `RaincoatThemeBase`, `RaincoatTokens` |

`@raincoat-ui/tokens`, the token build tool, stays private until it can build a theme kept
outside this repository (milestone 2).

**A version pull request, made by hand.** `pnpm release:version` writes versions and changelogs,
and a maintainer opens the pull request. A bot that opens it would need a stored token, because
pull requests opened with the workflow's own token do not start CI.

**Merging releases.** The `release` workflow runs on every push to `main` and releases when the
packages' version has no tag.

**Builders cannot publish, and publishers do not build.** One job builds every file of the
release with read-only permission. The publishing jobs run in the `release` environment, which
only `main` may use, and only move those files. Attestation is a job of its own for the same
reason: the permission to sign is never present where build code runs.

**Every publishing step can be repeated.** A version already on a registry is skipped, never
replaced. A release that stopped halfway is finished by running the workflow by hand, which is
refused if anything the packages ship has changed since the release's tag.

**A registry without a credential is reported, not fatal.** A new npm package name with no
token, or a Swift mirror with no credential, is marked pending in the workflow and in the
release notes, and the rest of the release goes ahead. Finishing the release later brings the
notes up to date.

**The release is rehearsed on every pull request.** CI builds everything a release would
publish and installs it the way an app would: the npm tarballs into an empty project with npm,
rendered on a server and type-checked; the Maven repository into an Android module that
compiles a screen; the Swift mirror tree into a package that compiles a view. After a real
release the same three checks run against the real registries.

**The bill of materials comes from the license gates.** `tools/release/sbom.mjs` writes
CycloneDX from pnpm's license report and licensee's reports, the same data the gates check, so
the two cannot disagree. No separate scanner is installed.

**Published npm packages declare dependency ranges.** `@raincoat-ui/react` declares
`^` ranges for its four dependencies, so that an app can share one copy with its other
packages. Everything else in this repository stays pinned exactly, and the lockfile fixes what
is tested.

**The Maven metadata is written by our own script**, `tools/release/maven-repo.mjs`, in the
publishing job. Gradle stages the modules in the build job; the script adds them to the
repository on `gh-pages` and lists every version present.

## Consequences

- Stored secrets: one credential for the Swift mirror (a deploy key, or a token limited to that
  repository), and nothing else. The first publish of a new npm package name needs a token for
  a few minutes; the runbook has the steps.
- The documentation site and the Maven repository share the `gh-pages` branch. Either push can
  lose a race with the other; the Maven publish retries on the new tip.
- Android artifacts are not signed with a key. Their provenance is the attestation.
- The AAR does not contain the license text; its POM names the license, and the sources JAR and
  the JARs carry it.

## Not yet done

- Reference apps. The consumer checks compile against the packages; apps that run, with the
  accessibility audits that need a simulator or an emulator, are the next piece of milestone 1.
- A check that two builds of the same commit produce identical files (milestone 4).
