# 0006. A public GitHub repository with hosted CI runners

- Status: accepted
- Date: 2026-11-14

## Context

Every quality rule must block a merge, the project has no budget, and iOS builds need macOS.

GitHub gives public repositories free hosted runners including macOS, repository rulesets,
Pages, and build attestations. A private repository on the free plan has none of the merge
protections and very few macOS minutes.

## Decision

The repository is public on GitHub and CI runs on GitHub-hosted runners only.

- A ruleset on `main` requires a pull request and one status check, `ci-gate`, which passes only
  when every other job passed or was skipped by a path rule.
- Workflows are thin: each job calls a script in this repository, so moving host means rewriting
  only the workflow files.
- Actions are pinned by commit hash. Standalone tools are pinned by version and SHA-256.
- Workflows never use `pull_request_target`, and no self-hosted runner is attached, so code from
  a fork never runs with secrets or on a private machine.

## Consequences

- Everything committed is public and stays public, including history.
- GitHub.com is a proprietary service and is listed as an accepted exception. The fallback is
  Codeberg (Forgejo, GPL-3.0-or-later) with Woodpecker (Apache-2.0) and a self-hosted Mac for iOS.
- If the project later goes private on a paid plan, registries, runners, and signing change;
  workflows and scripts do not.

## Rejected

- **A private repository on GitLab.com's free tier.** Enforces merge gates for private projects,
  but has no free hosted macOS runners.
- **`gradle/actions`.** Its license is no longer a plain open-source license; `actions/setup-java`
  (MIT) is used instead.
