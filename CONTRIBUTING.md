# Contributing to Raincoat

Thank you for helping. This page tells you what a change needs before it can merge. Every rule
here is enforced by CI, so a green pull request is a mergeable one.

## Before you start

- **Small fixes** (typos, bugs, docs): open a pull request directly.
- **A new component, or adding, renaming, or removing a token**: open an
  [RFC](rfcs/README.md) first. CI rejects such changes when they do not reference an accepted RFC.
- **A new theme**: use the "New theme" issue form. Themes of real brands are only accepted with
  the brand owner's consent, because everything in this repository is public.

## Setup

```sh
pnpm install     # Node.js 24 and pnpm; installs pinned tools and git hooks
pnpm validate    # the checks CI runs
```

Each platform package has tests of its own:

| Package                     | Command                                  | Needs                                             |
| --------------------------- | ---------------------------------------- | ------------------------------------------------- |
| React (`packages/web`)      | `pnpm web:typecheck` and `pnpm web:test` | Chromium, installed once with `pnpm web:browsers` |
| Swift (`packages/ios`)      | `swift test --package-path packages/ios` | Swift 6.2 or later                                |
| Kotlin (`packages/android`) | `./gradlew test licensee`                | JDK 21 and the Android SDK (platform 37)          |

The reference apps show the components in an app and test them on a simulator
([iOS](apps/reference-ios/README.md)) and an emulator ([Android](apps/reference-android/README.md));
each README has the command.

## Commits and pull requests

1. **Sign off every commit.** Use `git commit -s`. The sign-off line certifies the
   [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change or
   have the right to submit it under the project license. There is no separate contributor
   agreement.
2. **Use Conventional Commits** for commit messages and the pull request title, for example
   `feat(tokens): add focus ring tokens` or `fix(web): restore dialog focus on close`.
   Pull requests are squash-merged, so the title becomes the commit on `main`.
3. **Say what changed for the people who use the packages.** If the change alters what a package
   ships (component code, tokens, the theme), run `pnpm changeset` and commit the file it writes.
   Tests, documents, and development dependencies do not need one. See
   [.changeset/README.md](.changeset/README.md).
4. **Keep generated files generated.** Never edit a file marked `GENERATED`. Change its source
   and regenerate; CI compares the two.
5. **Do not record snapshot baselines locally.** Visual baselines are recorded in CI so that no
   one's machine influences them.

## What CI checks

| Check              | What fails it                                                              |
| ------------------ | -------------------------------------------------------------------------- |
| Lint and format    | `pnpm lint` reports anything                                               |
| Unit tests         | `pnpm test` fails                                                          |
| License gate       | A dependency with a license outside [the allowlist](licenses/ALLOWLIST.md) |
| Asset licenses     | A font or brand asset missing from `licenses/assets.yml`                   |
| Changeset          | A change to what a package ships with no changeset file                    |
| Release rehearsal  | The packages cannot be built, packed, or installed the way an app would    |
| Sign-off and title | A commit without `Signed-off-by`, or a non-conventional pull request title |
| Secret scan        | A credential in the diff or history                                        |
| Vulnerability scan | A dependency with a known vulnerability                                    |
| Workflow lint      | An unsafe or invalid GitHub Actions workflow                               |

Two more checks cover the token source: `pnpm tokens:lint` fails on an invalid token, a broken
reference, or a tier violation, and `pnpm tokens:contrast` fails when any declared color pair
misses its contrast requirement in any color mode. See
[docs/contributing/add-a-token.md](docs/contributing/add-a-token.md).

The React components add three more: they are tested in a real browser against the token source
(colors, sizes, keyboard, focus, and an automated accessibility audit in every color mode); the
built stylesheet may contain no literal color or size; and every component must have an entry in
`packages/web/shadcn.lock.json`.

The SwiftUI and Compose components are also tested in the reference apps, on an iOS simulator
and an Android emulator: what assistive technology is told, touch targets, and each platform's
accessibility audit.

## Dependencies

Every dependency, font, and icon must be free or open source under an OSI-approved license on
the allowlist. Fonts must be OFL-1.1. If you believe an exception is justified, say why in the
pull request; exceptions are individual, dated, and recorded in `licenses/curations.yml`.

Versions are pinned exactly, and versions published less than seven days ago are refused.

## Borrowing from other design systems

Compare against the systems in [docs/research/prior-art.md](docs/research/prior-art.md), and
borrow behaviour and naming conventions freely. Copy code, tokens, or assets only when the
source license is on the allowlist, and add the attribution to `NOTICE`. Never copy brand assets.

## License of your contribution

By contributing you agree that your contribution is licensed under
[Apache-2.0](LICENSE), the license of this project.
