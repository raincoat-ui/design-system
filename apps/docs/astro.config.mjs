import starlight from "@astrojs/starlight";
import { defineConfig, passthroughImageService } from "astro/config";

// Served from https://raincoat-ui.github.io/design-system/
const site = "https://raincoat-ui.github.io";
const base = "/design-system";

export default defineConfig({
  site,
  base,
  // The site has no images to optimize, so the optional sharp dependency is not installed.
  image: { service: passthroughImageService() },
  integrations: [
    starlight({
      title: "Raincoat",
      description:
        "One design-system foundation, compiled to SwiftUI, Jetpack Compose, and React, with a theme per app.",
      favicon: "/favicon.svg",
      // The touch icon is the app icon without its corners, which iOS rounds itself. The share
      // image is rendered from brand/social-preview.html; brand/README.md has both commands.
      head: [
        { tag: "link", attrs: { rel: "apple-touch-icon", href: `${base}/apple-touch-icon.png` } },
        {
          tag: "meta",
          attrs: { property: "og:image", content: `${site}${base}/social-preview.png` },
        },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content:
              "Raincoat: one design-system foundation, compiled to native code for iOS, Android, and the web.",
          },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:image", content: `${site}${base}/social-preview.png` },
        },
      ],
      // src/pages/404.astro replaces Starlight's own not-found page.
      disable404Route: true,
      logo: {
        light: "./assets/raincoat-logo-light.svg",
        dark: "./assets/raincoat-logo-dark.svg",
        alt: "Raincoat",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/raincoat-ui/design-system",
        },
      ],
      customCss: [
        "./src/styles/fonts.css",
        "@raincoat-ui/theme-base/theme.css",
        "./src/styles/site.css",
      ],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
      },
      expressiveCode: {
        styleOverrides: {
          borderRadius: "2px",
          borderColor: "var(--sl-color-gray-5)",
          codeFontFamily: "var(--sl-font-mono)",
          uiFontFamily: "var(--sl-font)",
          frames: { shadowColor: "transparent" },
        },
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Overview", link: "/" },
            { label: "Roadmap", slug: "project/roadmap" },
          ],
        },
        { label: "Foundations", items: [{ autogenerate: { directory: "foundations" } }] },
        { label: "Components", items: [{ autogenerate: { directory: "components" } }] },
        { label: "Contributing", items: [{ autogenerate: { directory: "contributing" } }] },
        {
          label: "Project",
          items: [
            { label: "Prior art", slug: "project/prior-art" },
            { label: "License allowlist", slug: "project/licenses" },
            {
              label: "Proposals (RFCs)",
              collapsed: true,
              items: [{ autogenerate: { directory: "project/rfcs" } }],
            },
            {
              label: "Decisions (ADRs)",
              collapsed: true,
              items: [{ autogenerate: { directory: "project/decisions" } }],
            },
          ],
        },
      ],
    }),
  ],
});
