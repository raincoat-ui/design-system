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

## Handling a vulnerability scan failure

The `vulnerability scan` job runs osv-scanner over `pnpm-lock.yaml`. An advisory can appear, or
change, without any change here, so it can fail every open pull request at once. Reproduce it
with `pnpm tool osv-scanner scan source --config osv-scanner.toml --lockfile pnpm-lock.yaml`.

1. Prefer installing a fixed version: update the direct dependency, or add a `pnpm.overrides`
   entry for a transitive one.
2. If no fixed version exists and the flaw cannot be reached here (find every path to the
   package with `pnpm why <package> -r`), add an `[[IgnoredVulns]]` entry to `osv-scanner.toml`
   with the advisory id, a reason, and an `effectiveUntil` date about a month out. The scan
   fails again when that date passes.
3. Remove the entry as soon as a fixed version can be installed, or when the advisory is
   withdrawn: osv-scanner then lists it under "unused ignores".

## Building the Android modules locally

Gradle needs a JDK 21. With Homebrew: `brew install openjdk@21`, then run Gradle with
`JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" ./gradlew test licensee`.
The wrapper downloads Gradle itself and verifies its checksum.

## Releasing

Every package has the same version, managed with Changesets. While `.changeset/pre.json` exists,
versions are prereleases such as `0.1.0-next.0`, published to npm under the tag `next`.

1. **Version.** On a branch, run `pnpm release:version`. It turns the pending changeset files
   into a version, writes each package's `CHANGELOG.md`, and copies the version into
   `gradle.properties`. Read the changelogs.
2. **Open the pull request**, titled `chore(release): <version>`, with the release template
   (`?template=release.md`). CI rehearses the release on it: everything is built and then
   installed the way an app would install it.
3. **Merge it.** The `release` workflow sees a version on `main` that has no tag and publishes
   it: the Android modules to the Maven repository on GitHub Pages, the Swift package to
   `raincoat-ui/design-system-swift`, the npm packages to npmjs.com. It then creates the GitHub
   release with the bill of materials, and installs the published release from each registry:
   first into a small project per platform, then into the reference apps, which run their tests
   on a simulator, an emulator, and in Chromium.
4. **Check.** The `install the published release` job and every
   `reference apps on the published release` job must be green. To check a file yourself:
   `gh attestation verify <file> --repo raincoat-ui/design-system`.

The reference apps can be run against any published version later: Actions, reference apps,
Run workflow. Choose the release's tag, or `main` if no component has been added since, and
leave the version empty for the one that commit names. The apps' tests are those of the commit
chosen, so they only pass for a version that ships what that commit's apps show.

npm checks a new version before it serves it. npm says that typically takes around five minutes
and can take longer; on 2026-11-16 it took two. Until then the registry answers "not found",
so the install job waits for up to half an hour. Do not run the `release` workflow again during
that wait: it cannot yet see that npm has the version, and would try to publish it again.

To leave prerelease mode for a stable release, run `pnpm changeset pre exit` before step 1.

Nothing published is ever changed. Each publishing step skips what is already there, so **a
release that stopped halfway is finished by running the `release` workflow by hand** (Actions,
release, Run workflow) once the cause is fixed.

### The first publish of an npm package

npm publishes from the workflow without a stored token (trusted publishing). npm can only set
that up for a package that already exists, so a new package name needs a token once:

1. On npmjs.com, signed in as `raincoat-ui`: Access Tokens, Generate New Token, Granular Access
   Token. Permissions: read and write, for the scope `@raincoat-ui`. Expiry: 7 days.
2. Store it as the secret `NPM_TOKEN` in the `release` environment:
   `gh secret set NPM_TOKEN --env release --repo raincoat-ui/design-system`
3. Run the `release` workflow by hand. It publishes the packages that were pending.
4. For each new package on npmjs.com: Settings, Trusted Publisher, GitHub Actions, with
   organization `raincoat-ui`, repository `design-system`, workflow `release.yml`, and
   environment `release`.
5. Delete the secret (`gh secret delete NPM_TOKEN --env release`) and revoke the token on
   npmjs.com. A trusted publisher that is not used within two days expires and must be set up
   again, so do this shortly before a release if none follows immediately.

What the first publish leaves behind, seen with `@raincoat-ui/react` and
`@raincoat-ui/theme-base` on 2026-11-16:

- **The first version also gets the tag `latest`**, whatever tag it was published with, because
  a package must have one. Until the first stable release, `npm install <name>` without a tag
  installs the prerelease.
- **A second version, `0.0.0-stage`**, which npm adds as a placeholder while it checks a new
  name. It holds no code. npm's documentation describes it for staged publishing only and does
  not say whether it is removed.
- **The email address of the npm account is public**, in the registry's record of every package
  the account publishes. Use an address that may be public for an account that publishes.

### Rolling back

A bad release is replaced, not removed.

- **npm:** point the tag back, `npm dist-tag add @raincoat-ui/react@<good version> next` (or
  `latest`), for each package. Then mark the bad version: `npm deprecate <name>@<bad> "<why>"`.
- **Android and iOS:** apps pin a version, so nothing moves by itself. Say in the GitHub release
  of the bad version which version to use instead, and mark that release as not the latest.
- **Then fix forward:** revert or correct on `main`, add a changeset, and release the next
  version.

Never delete a tag, a version directory under `maven/`, or a tag in the Swift mirror: builds
that already resolved them would break.

### What the release needs on GitHub

Set up once. `tools/ci/apply-repo-settings.sh` creates the first item.

- The `release` environment, which only the `main` branch may use. Publishing jobs run in it.
- The repository `raincoat-ui/design-system-swift`: public, empty, no branch protection.
- A credential that may write to that repository, stored as a secret in the `release`
  environment. Either of:
  - a deploy key with write access, whose private half is `SWIFT_MIRROR_DEPLOY_KEY`. The
    organization must allow deploy keys (Organization settings, Repository, Deploy keys), which
    new organizations do not by default;
  - a fine-grained personal access token limited to that one repository, with read and write
    access to its contents, as `SWIFT_MIRROR_TOKEN`.

Until one is stored, a release reports the Swift package as pending and publishes the rest.

## Rotating secrets

One secret is stored: the credential for the Swift mirror. Rotate it every 180 days, and at once
if it may have leaked. For a deploy key:

```sh
ssh-keygen -t ed25519 -N "" -C "raincoat release $(date +%Y-%m-%d)" -f /tmp/raincoat-mirror-key
gh repo deploy-key add /tmp/raincoat-mirror-key.pub --repo raincoat-ui/design-system-swift \
  --allow-write --title "release workflow, added $(date +%Y-%m-%d)"
gh secret set SWIFT_MIRROR_DEPLOY_KEY --env release --repo raincoat-ui/design-system \
  < /tmp/raincoat-mirror-key
rm /tmp/raincoat-mirror-key /tmp/raincoat-mirror-key.pub
```

Then delete the old key: `gh repo deploy-key list --repo raincoat-ui/design-system-swift`, and
`gh repo deploy-key delete <id>`. The key can do one thing, write to the mirror, and the mirror
is regenerated from this repository at every release.

For a token instead: create a new fine-grained token with the same limits, store it with
`gh secret set SWIFT_MIRROR_TOKEN --env release`, and revoke the old one.
