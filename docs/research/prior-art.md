# Prior art

Every component RFC compares the proposal against at least three of the systems below. The set
is drawn from [awesome-design-systems](https://github.com/alexpate/awesome-design-systems),
limited to entries that publish both components and source code.

## Reference set

| System                                                                                                                          | License    | Why it is here                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| [IBM Carbon](https://github.com/carbon-design-system/carbon)                                                                    | Apache-2.0 | Thorough component specs and accessibility notes          |
| [Adobe Spectrum](https://github.com/adobe/react-spectrum)                                                                       | Apache-2.0 | Strong keyboard, right-to-left, and CJK handling          |
| [AWS Cloudscape](https://github.com/cloudscape-design/components)                                                               | Apache-2.0 | Dense, form-heavy patterns                                |
| [Google Material](https://github.com/material-components/material-web)                                                          | Apache-2.0 | The reference for Android behaviour                       |
| Fluent UI for [Apple](https://github.com/microsoft/fluentui-apple) and [Android](https://github.com/microsoft/fluentui-android) | MIT        | The one entry with native iOS and Android implementations |
| [GitLab Pajamas](https://gitlab.com/gitlab-org/gitlab-ui)                                                                       | MIT        | A public proposal process for components                  |

Licenses were read from each repository on 2026-11-14. Check again before copying anything.

## What may be borrowed

- **Behaviour, anatomy, and naming conventions**: freely. These are ideas, not code.
- **Code, tokens, or assets**: only when the source license is on
  [our allowlist](../../licenses/ALLOWLIST.md), and with the attribution added to `NOTICE`.
- **Brand assets** (logos, illustrations, brand colors as a set): never.

## Comparison table for an RFC

Copy this into the RFC and fill one column per system compared.

| Question                                        | System A | System B | System C | Raincoat proposal |
| ----------------------------------------------- | -------- | -------- | -------- | ----------------- |
| Parts (anatomy)                                 |          |          |          |                   |
| Variants and sizes                              |          |          |          |                   |
| States                                          |          |          |          |                   |
| Keyboard behaviour                              |          |          |          |                   |
| Screen-reader role, name, and announcements     |          |          |          |                   |
| Right-to-left and long-text behaviour           |          |          |          |                   |
| Where the systems disagree, and which way we go |          |          |          |                   |

## Public listing

The four columns of awesome-design-systems double as the readiness checklist for 1.0:

| Column        | How Raincoat meets it                                       |
| ------------- | ----------------------------------------------------------- |
| Components    | A documentation site with live, coded examples              |
| Voice & Tone  | A writing-guidelines section in the documentation           |
| Designers Kit | Not claimed until an open (Penpot) component library exists |
| Source code   | This repository                                             |

After 1.0, Raincoat is proposed to the list by pull request.
