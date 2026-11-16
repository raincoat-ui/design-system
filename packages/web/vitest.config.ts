// The component tests run in a real browser (Chromium, driven by Playwright), because what they
// check is what the browser does: computed colors and sizes, focus, keyboard, and hit testing.
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

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
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
      "tailwind-merge",
      "vitest-browser-react",
    ],
  },
  test: {
    include: ["test/browser/**/*.test.tsx"],
    globalSetup: ["./test/browser/expected-tokens.js"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium", viewport: { width: 1024, height: 768 } }],
      screenshotFailures: false,
    },
  },
});
