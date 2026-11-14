import starlight from "@astrojs/starlight";
import { defineConfig, passthroughImageService } from "astro/config";

// Served from https://raincoat-ui.github.io/design-system/
export default defineConfig({
  site: "https://raincoat-ui.github.io",
  base: "/design-system",
  // The site has no images to optimize, so the optional sharp dependency is not installed.
  image: { service: passthroughImageService() },
  integrations: [
    starlight({
      title: "Raincoat",
      description:
        "One design-system foundation, compiled to SwiftUI, Jetpack Compose, and React, with a theme per app.",
      favicon: "/favicon.svg",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/raincoat-ui/design-system",
        },
      ],
      customCss: ["./src/styles/generated.css", "./src/styles/site.css"],
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
