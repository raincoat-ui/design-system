// The Toast rendered on a server by Next.js, in Chromium, checked against
// specs/components/toast/spec.yaml: the HTML the server sends before any JavaScript runs,
// hydration, showing toasts once hydrated, the keyboard, styles loaded through Tailwind CSS, and
// axe in each of the system's color and contrast settings.
//
// The Vite app (apps/reference-web-vite) checks the Toast in a single-page app in depth: the timer
// on a fake clock, the queue, touch, the font size, and the app's bottom bar.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const region = (page: Page) => page.getByRole("region", { name: "Notifications" });
const toast = (page: Page) => region(page).getByRole("listitem");

/** Shows a toast once React has hydrated the page: a click before then does nothing. */
async function showOnceHydrated(page: Page, button: string) {
  await expect(async () => {
    await page.getByRole("button", { name: button }).click();
    await expect(toast(page)).toBeVisible({ timeout: 500 });
  }).toPass();
}

test.describe("before any JavaScript runs", () => {
  test.use({ javaScriptEnabled: false });

  test("the server sends the region the app names, and an empty status region", async ({
    page,
  }) => {
    await page.goto("/toast");
    await expect(region(page)).toBeAttached();
    await expect(page.getByRole("status")).toHaveText("");
    await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
    await expect(toast(page)).toHaveCount(0);
  });
});

test.describe("once React has hydrated the page", () => {
  test("hydration finds the HTML it expects, and a toast is shown and announced", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/toast");
    await showOnceHydrated(page, "Archive message");
    await expect(toast(page)).toHaveText("Message archived");
    await expect(page.getByRole("status")).toHaveText("Message archived");
    await expect(page.getByRole("button", { name: "Archive message" })).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("the action runs and closes the toast; F8 reaches the toast and goes back", async ({
    page,
  }) => {
    await page.goto("/toast");
    await showOnceHydrated(page, "Delete address");
    await toast(page).evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
    await page.keyboard.press("F8");
    await expect(toast(page)).toBeFocused();
    await page.keyboard.press("F8");
    await expect(page.getByRole("button", { name: "Delete address" })).toBeFocused();

    await region(page).getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("last-action")).toHaveText("Last action: Undo");
    await expect(toast(page)).toHaveCount(0);
  });

  test("the styles reach the page through Tailwind: the toast draws its token colors", async ({
    page,
  }) => {
    await page.goto("/toast");
    await showOnceHydrated(page, "Archive message");
    const [drawn, expected] = await toast(page).evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--rc-toast-bg)";
      probe.style.borderTopColor = "var(--rc-toast-border-color)";
      probe.style.color = "var(--rc-toast-fg)";
      document.body.append(probe);
      const style = getComputedStyle(element);
      const tokens = getComputedStyle(probe);
      const result = [
        [style.backgroundColor, style.borderTopColor, style.color],
        [tokens.backgroundColor, tokens.borderTopColor, tokens.color],
      ];
      probe.remove();
      return result;
    });
    expect(drawn).toEqual(expected);
  });

  const SETTINGS = [
    { colorScheme: "light", contrast: "no-preference" },
    { colorScheme: "dark", contrast: "no-preference" },
    { colorScheme: "light", contrast: "more" },
    { colorScheme: "dark", contrast: "more" },
  ] as const;
  const settingName = ({ colorScheme, contrast }: (typeof SETTINGS)[number]) =>
    contrast === "more" ? `${colorScheme} with more contrast` : colorScheme;
  const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

  for (const setting of SETTINGS) {
    test(`a page with a toast has no accessibility violations: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await page.goto("/toast");
      await showOnceHydrated(page, "Delete address");
      await toast(page).evaluate((element) =>
        Promise.all(element.getAnimations().map((animation) => animation.finished)),
      );
      await page.addScriptTag({ content: AXE });
      const violations = await page.evaluate(async () => {
        const { axe } = window as unknown as { axe: typeof Axe };
        const results = await axe.run(document, {
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
        });
        return results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target.join(" ")),
        }));
      });
      expect(violations).toEqual([]);
    });
  }
});
