// The component tests run in a real browser, driven by Playwright, because what they check is
// what the browser does: computed colors and sizes, focus, keyboard, and hit testing.
//
// They run once per theme, as one Vitest project each: one for every theme stylesheet the token
// build generated in packages/web-themes, so a new theme is tested without an edit here. Each
// project loads its theme's stylesheet as "@raincoat-ui/theme-under-test/theme.css", and
// expected-tokens.js resolves that theme's values from the token source.
//
// They run in Chromium. RAINCOAT_BROWSER=firefox or RAINCOAT_BROWSER=webkit runs them in that
// browser instead: CI runs them in all three, one job each, and installs the browsers there.
//
// The visual snapshots in test/snapshots are projects of their own, one per theme, always in
// Chromium. `pnpm test` leaves them out and `pnpm test:snapshots` runs them: see
// test/snapshots/specimen.tsx and docs/adr/0019-visual-snapshots.md.
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import type { Page } from "playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommand, ToMatchScreenshotOptions } from "vitest/node";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const themesDir = `${repoRoot}packages/web-themes`;
const themes = readdirSync(themesDir)
  .filter((theme) => existsSync(`${themesDir}/${theme}/theme.css`))
  .sort();

const BROWSERS = ["chromium", "firefox", "webkit"] as const;
type BrowserName = (typeof BROWSERS)[number];
const browser = (process.env.RAINCOAT_BROWSER || "chromium") as BrowserName;
if (!BROWSERS.includes(browser)) {
  throw new Error(`RAINCOAT_BROWSER is "${browser}"; it can be ${BROWSERS.join(", ")}.`);
}
const viewport = { width: 1024, height: 768 };

// Snapshots are compared with their baselines in CI only. Elsewhere they are only saved, to look
// at, and no baseline is ever written: baselines are recorded in CI (CONTRIBUTING.md).
const compareSnapshots = Boolean(process.env.CI);
type ResolvePath = NonNullable<ToMatchScreenshotOptions["resolveScreenshotPath"]>;
/** test/snapshots/__screenshots__/<theme>/<component>/<snapshot>.png */
const baselinePath: ResolvePath = ({ arg, ext, root, testFileDirectory, screenshotDirectory }) =>
  resolve(root, testFileDirectory, screenshotDirectory, `${arg}${ext}`);
/**
 * What a run drew that has no baseline, or differs from it, in test-results/snapshots/actual/,
 * laid out as the baselines are; and the difference from the baseline in .../diff/.
 */
const outputPath: ResolvePath = ({ arg, ext, root }) => {
  const [, name = arg, kind] = /^(.*)-(reference|actual|diff)$/.exec(arg) ?? [];
  return resolve(
    root,
    "test-results/snapshots",
    kind === "diff" ? "diff" : "actual",
    `${name}${ext}`,
  );
};

// What the tests ask of the browser that a page cannot do itself. Playwright does it in every
// browser; Chromium's DevTools protocol would do it in Chromium alone.
/** Moves the pointer to the top left corner of the page, off every component. */
const movePointerAway: BrowserCommand<[]> = async ({ page }) => {
  await page.mouse.move(0, 0);
};
/** Emulates a system setting, such as reduced motion. A null value stops emulating it. */
const emulateMedia: BrowserCommand<[Parameters<Page["emulateMedia"]>[0]]> = async (
  { page },
  media,
) => {
  await page.emulateMedia(media);
};

const themeUnderTest = (theme: string) => ({
  alias: { "@raincoat-ui/theme-under-test/theme.css": `${themesDir}/${theme}/theme.css` },
});

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
    projects: [
      ...themes.map((theme, index) => ({
        extends: true,
        resolve: themeUnderTest(theme),
        test: {
          name: theme,
          include: ["test/browser/**/*.test.tsx"],
          provide: { theme },
          globalSetup: ["./test/browser/expected-tokens.js"],
          // One theme at a time. Two themes' browsers side by side lose pointer hover in one of
          // their pages, which fails every hover test of that page's file.
          sequence: { groupOrder: index },
          browser: { instances: [{ browser, viewport }] },
        },
      })),
      ...themes.map((theme, index) => ({
        extends: true,
        resolve: themeUnderTest(theme),
        test: {
          name: `${theme} snapshots`,
          include: ["test/snapshots/**/*.test.tsx"],
          provide: { theme, compareSnapshots },
          globalSetup: ["./test/snapshots/baselines.js"],
          sequence: { groupOrder: themes.length + index },
          browser: {
            // Tall, because a screenshot shows nothing of a specimen below the viewport.
            instances: [{ browser: "chromium" as const, viewport: { width: 1024, height: 4096 } }],
            expect: {
              toMatchScreenshot: {
                resolveScreenshotPath: baselinePath,
                resolveDiffPath: outputPath,
              },
            },
          },
        },
      })),
    ],
    // Where Vitest keeps a copy of each image a failed snapshot reports. Git ignores it.
    attachmentsDir: "test-results/attachments",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      screenshotFailures: false,
      commands: { movePointerAway, emulateMedia },
    },
  },
});
