// The component tests run in a real browser (Chromium, driven by Playwright), because what they
// check is what the browser does: computed colors and sizes, focus, keyboard, and hit testing.
//
// They run once per theme, as one Vitest project each: one for every theme stylesheet the token
// build generated in packages/web-themes, so a new theme is tested without an edit here. Each
// project loads its theme's stylesheet as "@raincoat-ui/theme-under-test/theme.css", and
// expected-tokens.js resolves that theme's values from the token source.
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const themesDir = `${repoRoot}packages/web-themes`;
const themes = readdirSync(themesDir)
  .filter((theme) => existsSync(`${themesDir}/${theme}/theme.css`))
  .sort();

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
          "@raincoat-ui/theme-under-test/theme.css": `${themesDir}/${theme}/theme.css`,
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
