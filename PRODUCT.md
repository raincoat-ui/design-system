# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Raincoat ships native code for each platform from one token source: SwiftUI for iOS, Jetpack
Compose for Android, and React for the web. The brand and the tokens are the same everywhere.
Where platform conventions differ, each platform follows its own: iOS keeps the system focus
indicator and Android draws the token focus ring, minimum targets follow each platform's rule,
and text scaling follows the system's setting.

## Users

**Primary: the developers who build the maintainer's white-label brand apps, starting with the
maintainer.** Raincoat serves several unrelated brands. A developer adds an app by adding a
theme for its brand, installs the published packages, and builds screens from the components
instead of forking them. The project has a single maintainer, so the docs, tooling and release
process also have to work for one person.

**Secondary: outside teams who adopt the public packages, and contributors.** They are welcome,
but when their needs conflict with the brand apps' needs, the brand apps win. Contributions
follow CONTRIBUTING.md: commits need a DCO sign-off, and new components or token changes start
with an RFC.

**Indirect: the people using the brand apps.** They never see the name Raincoat, but they get its
accessibility and language support: screen readers, large text, high-contrast modes, Vietnamese,
Chinese, Japanese, Korean, and right-to-left scripts.

## Product Purpose

One design-system foundation that compiles to native code for each platform, with a theme for
each app. In the README's words, a raincoat is the layer that protects you when you are out in
the rain, and Raincoat is that layer for an app: it keeps accessibility, localization and
consistency intact whatever brand is worn on top.

Success is the milestone path in `docs/roadmap.md`. A milestone is done when every exit
criterion holds, not when the code exists. 1.0 is published with provenance on every registry,
the documentation is live, and the deprecation policy is in force. After 1.0 the plan is to list
Raincoat in awesome-design-systems.

## Positioning

- **One source, native output.** Design tokens in the DTCG 2025.10 format and platform-neutral
  component specs are compiled into real SwiftUI, Compose and React code, not run through a
  cross-platform runtime. The generated code is deterministic, and CI fails if it drifts from the
  source.
- **Brands can't break the guarantees.** A theme can override brand and neutral colors, color
  mappings, typography, radius, default density, shadow style, icon set, and an allowlist of
  component tokens. It cannot touch spacing, breakpoints, minimum target sizes, focus ring
  rules, or contrast minimums, and it cannot add or remove a token (ADR 0010).
- **Vietnamese and CJK from the first release.** Right-to-left layout, longer translated text,
  Vietnamese, and CJK are covered by every component's tests, not added later.
- **Free and open source with no exceptions.** Every dependency, font and icon set must carry a
  license on the allowlist, and CI fails on anything else. The only proprietary items are listed
  openly as unavoidable exceptions.

## Operating Context

- Public repository `raincoat-ui/design-system`, licensed Apache-2.0. One maintainer merges.
  GitHub-hosted CI runs every quality check and blocks the merge when one fails.
- Decision records in `docs/adr/` are authoritative. Where an older plan and the repository
  disagree, the repository wins. New components and token changes go through `rfcs/`. Every
  component proposal is compared against the reference systems in
  `docs/research/prior-art.md`.
- Distribution: npm scope `@raincoat-ui` (`@raincoat-ui/react`, `@raincoat-ui/theme-<id>`,
  `@raincoat-ui/tokens`); a static Maven repository on GitHub Pages under the group
  `io.github.raincoat-ui`; and the Swift mirror `raincoat-ui/design-system-swift` (products
  `Raincoat`, `RaincoatTokens`, `RaincoatTheme<Id>`). Every package shares one version number.
- Documentation site: <https://raincoat-ui.github.io/design-system/> (`apps/docs`, Astro and
  Starlight). Its token pages are generated from the token source.
- Reference apps: `apps/reference-ios` and `apps/reference-android` run the components on a
  simulator or emulator, and `apps/reference-web-vite` runs them in Chromium. They run with the
  packages built from each pull request, and with each release installed from its registries.
  A Next.js reference app, for server rendering, is still to come.
- The release procedure is in `docs/maintaining/runbook.md`, and progress is tracked in
  `docs/roadmap.md`.

## Capabilities and Constraints

- **Today (0.1.0-next.1, milestone 1):** the token source with its linter and contrast checker;
  the generated web theme stylesheet, Swift package, and Kotlin modules; and a Button on all
  three platforms, published to all three registries.
- **v1 component set:** Button, Input, Card, Dialog/Sheet, Tabs, Toast, Typography. Select,
  Checkbox, Radio, Switch, Menu, Tooltip, date picker, table, and navigation bars follow in 1.x.
- **Token model:** primitive, semantic, and component tiers. Every theme has four color modes
  (light, dark, light high-contrast, dark high-contrast) and two densities (comfortable,
  compact). On the web, every token is a CSS custom property named `--rc-<token path>`, and
  `data-theme` and `data-density` select the mode and density.
- **Platform minimums (ADR 0005):** iOS 17; Android minSdk 26; Chrome and Edge 111, Safari 16.4,
  Firefox 128.
- **Web stack (ADR 0004):** React 19, Tailwind CSS 4, and shadcn/ui on Radix. Components are
  copied into the repo and restyled only through tokens. Theming uses CSS variables only, so no
  provider component is needed.
- **Touch targets:** a component takes only the layout room it shows. On a small component, the
  touch target reaches past the visible edge instead (ADR 0016).
- **Brand exposure:** the repo is public, and anything committed here stays public. It holds
  only fictional example themes. A real brand is committed only with its owner's written
  consent; otherwise it lives in a private theme pack built with the published token CLI.
- **Each theme is a separate artifact:** one per theme on every platform, so no client receives
  another client's brand.
- **Claude Design output:** optional and isolated. Removing it must leave the rest of the
  repository working. Not built yet.
- **Undecided:**
  - which real brands exist, whether any may be public, and who gives that consent;
  - whether every font a brand chooses is guaranteed to be OFL;
  - whether a brand may supply custom icons or only choose between Lucide and Phosphor;
  - whether a Penpot component library belongs on the 1.x roadmap.

## Brand Commitments

- **Name:** Raincoat, chosen by the maintainer for its meaning: a layer that protects you when
  you are out in the rain. The identifiers in ADR 0012 are hard-coded by consumers and must not
  change.
- **Mark:** a layered raindrop: an ink shell, a gap, and a yellow core (`brand/`, usage in
  `brand/README.md`). The shell is the layer Raincoat provides; the core is what it protects. The
  wordmark is lowercase "raincoat" in Be Vietnam Pro SemiBold, converted to outlines. The docs
  favicon and header use it. It replaces the earlier raindrop-in-a-square favicon.
- **Raincoat has no brand voice of its own in the apps.** Each brand's voice belongs to its
  theme. A system-wide voice-and-tone guide for UI text is planned but not yet written.

## Evidence on Hand

- The prereleases 0.1.0-next.0 and 0.1.0-next.1 on GitHub Releases, with provenance attestations
  and a bill of materials. 0.1.0-next.1 is on npm, the Maven repository, and the Swift mirror.
- The contrast table on the docs site (`foundations/contrast`): every declared color pair in
  every mode, all checks passing.
- Platform test evidence: the reference apps' accessibility audits, the pixel tests of the
  Button on each platform, and the planted-GPL proof of the license gate (pull request 1).
- The prior-art comparison (`docs/research/prior-art.md`) and RFC 0001 (foundation tokens and
  Button).
- **Do not invent:** Raincoat has no outside adopters, testimonials, usage numbers, case studies,
  performance benchmarks, or press. No real brand theme is public. Trademark registers were not
  checked for the name.

## Product Principles

1. **Brands change the look, never the guarantees.** Contrast, minimum targets, focus, and
   spacing are locked below the theme layer, so a new brand can't make an app less usable.
2. **Native on each platform, from one source.** Generate rather than hand-port. Follow each
   platform's own conventions where they differ, and keep the shared tokens identical.
3. **Every language from the start.** Vietnamese, CJK, right-to-left, and longer translated text
   are part of each component's definition of done.
4. **Proven, not claimed.** A capability counts when a check in CI shows it. Docs and release
   notes say only what tests or registries can confirm.
5. **One client never sees another.** Themes ship as separate artifacts, and a real brand
   becomes public only with its owner's consent.

## Accessibility & Inclusion

- WCAG 2.2 AA is the minimum, tested on each platform.
- Contrast is checked in every color mode. In the standard modes: text 4.5:1, large text 3:1,
  outlines and icons 3:1. In the high-contrast modes: text 7:1, large text 4.5:1, outlines and
  icons 3:1.
- Minimum touch target: 44pt, locked. On Android it is the larger of the token and the
  platform's own 48dp.
- Screen readers are told each component's role, name, and state. On iOS, a loading button says
  "In progress" in words, translated into en, vi, zh-Hans, zh-Hant, ja, and ko.
- Right-to-left layout, text expansion, Vietnamese, and CJK are part of every component's tests.
  The Button is tested left-to-right and right-to-left on every platform. The full snapshot
  matrix of languages and text sizes is due in milestone 3.
