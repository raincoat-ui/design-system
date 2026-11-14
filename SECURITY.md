# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately, not in a public issue.

Use GitHub's private reporting form:
<https://github.com/raincoat-ui/design-system/security/advisories/new>

Include what you found, how to reproduce it, and which package and version it affects. You will
get an acknowledgement within seven days. Raincoat is maintained by one person, so fixes are made
on a best-effort basis; you will be told what to expect once the report is confirmed.

## Supported versions

Before 1.0, only the latest release receives fixes. From 1.0, the latest minor release of the
current major version receives fixes.

## Scope

In scope: the published packages (`@raincoat-ui/*` on npm, the `io.github.raincoat-ui` Android
artifacts, the Swift package), the release pipeline, and this repository's workflows.

Out of scope: vulnerabilities in applications that use Raincoat, unless Raincoat causes them.

## How releases are protected

- Dependencies are pinned, and versions younger than seven days are refused.
- npm packages are published from CI with provenance; other artifacts carry build attestations.
- Each release ships a software bill of materials.

These measures take effect with the first release (milestone 1).
