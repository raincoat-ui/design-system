// The component tests run in a real browser (Chromium, driven by Playwright), because what they
// check is what the browser does: computed colors and sizes, focus, keyboard, and hit testing.
//
// They run once per theme, as one Vitest project each. The themes are read from the token
// source, so a new theme is tested without an edit here: its project loads that theme's
// stylesheet as "@raincoat-ui/theme-under-test/theme.css", and expected-tokens.js resolves
// that theme's values.
import { fileURLToPath } from "node:url";
import { openProject } from "@raincoat-ui/tokens";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const themes = openProject(repoRoot).themes.map((theme) => theme.id);

export default defineConfig({
  plugins: [tailwindcss()],
  optimizeDeps: {
    // Named up front so that Vite never discovers one mid-run and reloads the page.
    include: [
      "axe-core",
      "class-variance-authority",
      "clsx",
      "radix-ui",
      "react",
      "react-dom",
      "react-dom/client",
      "react-dom/server",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
      "tailwind-merge",
      "vitest-browser-react",
    ],
  },
  test: {
    projects: themes.map((theme) => ({
      extends: true,
      resolve: {
        alias: {
          "@raincoat-ui/theme-under-test/theme.css": `${repoRoot}packages/web-themes/${theme}/theme.css`,
        },
      },
      test: {
        name: theme,
        provide: { theme },
        globalSetup: ["./test/browser/expected-tokens.js"],
      },
    })),
    include: ["test/browser/**/*.test.tsx"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium", viewport: { width: 1024, height: 768 } }],
      screenshotFailures: false,
    },
  },
});
