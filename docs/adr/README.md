# Architecture decision records

Each record states one decision, why it was made, and what was rejected. Records are not edited
after acceptance; a changed decision gets a new record that supersedes the old one.

Versions and licenses quoted in these records were verified on the date of the record.

| #                                           | Decision                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| [0001](0001-monorepo-pnpm-turborepo.md)     | One monorepo with pnpm workspaces and Turborepo                         |
| [0002](0002-dtcg-tokens-no-design-tool.md)  | DTCG 2025.10 JSON is the token source; no design tool is                |
| [0003](0003-style-dictionary-pipeline.md)   | Style Dictionary compiles the tokens (superseded by 0013)               |
| [0004](0004-web-stack.md)                   | Web: React, Tailwind CSS v4, shadcn/ui on Radix                         |
| [0005](0005-platform-targets.md)            | Minimum OS and browser targets                                          |
| [0006](0006-github-hosted-ci.md)            | A public GitHub repository with hosted CI runners                       |
| [0007](0007-distribution.md)                | Distribution through npm, a static Maven repository, and a Swift mirror |
| [0008](0008-lockstep-versioning.md)         | One version for every package                                           |
| [0009](0009-license-policy.md)              | Apache-2.0, an allowlist, and a blocking license gate                   |
| [0010](0010-themes.md)                      | Themes are overlays, shipped one artifact per theme                     |
| [0011](0011-claude-design-output.md)        | The Claude Design output is optional and isolated                       |
| [0012](0012-name.md)                        | The name Raincoat                                                       |
| [0013](0013-own-token-emitters.md)          | The token build uses its own emitters, not Style Dictionary             |
| [0014](0014-license-gates-per-ecosystem.md) | One license gate per ecosystem, all reading one allowlist               |
| [0015](0015-web-components.md)              | Web components: adapted shadcn/ui source, styled only with tokens       |

To add one, copy `0000-template.md`.
