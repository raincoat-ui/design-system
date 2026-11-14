# 0013. The token build uses its own emitters, not Style Dictionary

- Status: accepted
- Date: 2026-11-15
- Supersedes: [0003](0003-style-dictionary-pipeline.md)

## Context

Record 0003 chose Style Dictionary to compile the tokens. When the build was implemented, two
facts were on the table that were not there when 0003 was written.

First, the linter already needed its own loader and resolver, because tier rules, color-mode
completeness, and contrast checks are not things Style Dictionary does. With those in place,
what remained for Style Dictionary was turning resolved values into text. The formats Raincoat
needs (one stylesheet covering four color modes, SwiftUI themes, Compose themes) all have to be
written by hand anyway.

Second, adding Style Dictionary 5.8.0 to the tokens package was measured:

- 103 more packages in a package that theme authors install.
- Three known vulnerabilities of medium severity in its bundled dependencies (deepmerge, glob,
  minimatch), one without a fix. The vulnerability gate failed.
- Five of those packages carry BlueOak-1.0.0, which would have had to join the allowlist for
  shipped code.

## Decision

The token build uses emitters written in this repository, on top of the loader and resolver the
linter uses. `packages/tokens` depends only on ajv and culori.

Before Style Dictionary was removed, the stylesheet from the new CSS emitter was compared with
the one Style Dictionary produced: all 416 property values in all eight blocks resolved to the
same final value.

## Consequences

- The emitters are code this project owns. Each is covered by a contract test whose expected
  values are computed separately from the emitter.
- Contributors who know Style Dictionary will not find its configuration here. The token format
  is still plain DTCG 2025.10, so the source remains usable with Style Dictionary or any other
  tool.
- Composite types beyond typography and shadow are added to the emitters when a token first
  needs them.

## Rejected

- **Keeping Style Dictionary and ignoring the findings.** An ignore list in a published
  package's dependencies is a standing liability for a single maintainer.
- **Overriding its bundled dependencies to patched major versions.** Untested combinations
  inside someone else's bundle.
