# Maintainer runbook

Procedures for the person who administers the repository. Sections are added as the milestones
that need them land.

## First publish of the repository

Done once, after the local bootstrap commit has been reviewed.

1. Create the public repository and push:

   ```sh
   gh repo create raincoat-ui/design-system --public --source . --remote origin --push
   ```
2. Apply the repository settings and rulesets kept in this repo:

   ```sh
   tools/ci/apply-repo-settings.sh raincoat-ui/design-system
   ```

   This allows only squash merges, requires sign-off on web commits, turns on Dependabot alerts,
   secret scanning with push protection, and private vulnerability reporting, and creates the
   `main` and `release-tags` rulesets from `.github/rulesets/`.
3. Prove the gate works. Each of these must be refused:
   - a direct `git push` to `main`;
   - merging a pull request whose `ci-gate` check is red.
4. Prove the license gate works on the hosted runner: open a pull request that adds a
   GPL-licensed dev dependency, confirm `validate` fails naming it, then close the pull request.

## The documentation site

The site at <https://raincoat-ui.github.io/design-system/> is built from `apps/docs` and served
by GitHub Pages from the `gh-pages` branch.

- **Content** is generated at build time by `apps/docs/scripts/generate.mjs`: token reference
  pages from the token source, and copies of this repository's documents. Only the home page,
  `apps/docs/src/content/docs/index.mdx`, is written by hand.
- **Deployment** is automatic. The `pages` workflow rebuilds and publishes on every push to
  `main`. It replaces everything on `gh-pages` except the `maven/` and `pr/` directories.
- **Local preview**: `pnpm docs:dev`, then open the address it prints.
- **Manual deployment**, if the workflow is unavailable:
  `pnpm docs:build && node tools/ci/deploy-site.mjs apps/docs/dist`.
- **Never edit `gh-pages` by hand.** The next deployment overwrites it.

## Changing repository rules

Edit the JSON under `.github/rulesets/`, merge the change, then re-run
`tools/ci/apply-repo-settings.sh`. The files are the record of what is enforced; settings changed
only in the GitHub UI will be overwritten.

## Updating pinned CI tools

`tools/ci/tool-versions.json` pins gitleaks, osv-scanner, zizmor, and actionlint by version and
SHA-256. To update one:

1. Find the new release's assets for `linux-x64` and `darwin-arm64`.
2. Replace the version, both URLs, and both digests. GitHub shows each asset's SHA-256 on the
   release page.
3. Run the tool once locally (`pnpm tool <name> --version`). A wrong digest aborts before
   anything executes.

Dependabot updates npm packages and GitHub Actions; these standalone binaries are updated by hand.

## Handling a license gate failure

1. Prefer removing or replacing the dependency.
2. If its license metadata is simply wrong, add a `corrections` entry to
   `licenses/curations.yml` with a link to the actual license file.
3. If it truly cannot be avoided, add a dated `exceptions` entry with an exact version, a reason,
   and a review date at most six months out. The gate fails again when that date passes.

The same three options apply to a failure of `./gradlew licensee`, the gate for dependencies
that ship with the Android modules. Its corrections and exceptions go in the `licensee { }` block
of the module's `build.gradle.kts`, with the same evidence and dates in a comment.

## Building the Android modules locally

Gradle needs a JDK 21. With Homebrew: `brew install openjdk@21`, then run Gradle with
`JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" ./gradlew test licensee`.
The wrapper downloads Gradle itself and verifies its checksum.

## Rotating secrets

None are stored yet. The first one arrives with releases in milestone 1 (the deploy key for the
Swift mirror), and this section will describe its rotation.
