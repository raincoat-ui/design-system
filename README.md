<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/raincoat-logo-reversed.svg">
    <img src="brand/raincoat-logo.svg" alt="Raincoat" height="48">
  </picture>
</h1>

One design-system foundation, compiled to native code for each platform, with a theme per app.

A raincoat is the layer that protects you when you are out in the rain. Raincoat is that layer
for an app: it keeps accessibility, localization, and consistency intact whatever brand is worn
on top.

**Documentation: <https://raincoat-ui.github.io/design-system/>**

> **Status: milestone 1 in progress.** One token source drives a Button on the web, iOS, and
> Android, and prereleases are being published. The
> [releases page](https://github.com/raincoat-ui/design-system/releases) says which registries
> each one has reached, and the [roadmap](docs/roadmap.md) what each milestone delivers.

## What it will be

- **One source of truth.** Design tokens in the [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/)
  JSON format and platform-neutral component specs.
- **Native output per platform.** SwiftUI for iOS, Jetpack Compose for Android, and React with
  shadcn/ui, Radix, and Tailwind CSS for the web. Generated code is deterministic and checked for
  drift in CI.
- **A theme per app.** Apps differ by theme, not by forks. Adding an app means adding a theme
  directory, not new components.
- **Accessibility and localization built in.** WCAG 2.2 AA is the floor, tested per platform;
  right-to-left layout, text expansion, Vietnamese, and CJK are part of every component's tests.
- **Free and open source throughout.** Every dependency must carry a license on the
  [allowlist](licenses/ALLOWLIST.md); CI fails on anything else.

The decisions behind this are recorded in [docs/adr](docs/adr/README.md).

## Repository layout today

| Path                         | What it holds                                                      |
| ---------------------------- | ------------------------------------------------------------------ |
| `docs/adr/`                  | Architecture decision records                                      |
| `docs/roadmap.md`            | Milestones and their exit criteria                                 |
| `docs/research/prior-art.md` | The reference systems every component proposal is compared against |
| `docs/maintaining/`          | Runbook for the maintainer                                         |
| `rfcs/`                      | Proposals for new components and token changes                     |
| `licenses/`                  | License allowlist, reviewed exceptions, and the asset manifest     |
| `tools/`                     | Repository tooling: license gate, commit checks, pinned CI tools   |
| `.github/`                   | Workflows, issue and pull request templates, repository rules      |

The token source lives in `tokens/`, checked by `schemas/tokens.schema.json` and the linter and
contrast checker in `packages/tokens/`. To add a token, follow
[docs/contributing/add-a-token.md](docs/contributing/add-a-token.md). `pnpm tokens:build` compiles them into
the web theme stylesheet in `packages/web-themes/`, the Swift package in `packages/ios/`, and
the Kotlin modules in `packages/android/`. Component specs and the components themselves follow
during milestone 1.

## Development

You need Node.js 24 and [pnpm](https://pnpm.io) (the exact pnpm version is pinned in
`package.json` and selected automatically).

```sh
pnpm install     # installs pinned tools and the git hooks
pnpm validate    # lint, unit tests, and license gates: what CI runs
pnpm toolchain   # reports which platform toolchains this machine has
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first: commits need a
sign-off, and new components or token changes start with an [RFC](rfcs/README.md).
Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE). Brand assets of real brands, where a theme includes them, are not covered
by that license and are marked as such in their theme directory.
