<!-- The title must be a Conventional Commit, for example: feat(tokens): add focus ring tokens -->

## What and why

<!-- What changes, and what problem it solves. Link the issue or RFC. -->

## How it was checked

<!-- Commands run, platforms and themes looked at. -->

## Checklist

- [ ] Every commit is signed off (`git commit -s`).
- [ ] `pnpm validate` passes locally.
- [ ] No generated file was edited by hand.
- [ ] A changeset is included if the change alters what a package ships (`pnpm changeset`).
- [ ] New or changed dependencies carry a license on `licenses/ALLOWLIST.md`.
- [ ] For a new component or a semantic/component token change: the accepted RFC is linked.
- [ ] No brand assets of a real brand are added without the owner's consent.

<!-- For token changes, new components, new themes, or releases, use the matching template:
     append ?template=token-change.md (or new-component.md, new-theme.md, release.md) to the
     pull request URL. -->
