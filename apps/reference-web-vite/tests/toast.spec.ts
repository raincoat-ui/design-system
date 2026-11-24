// The Toast in a built app, in Chromium, checked against specs/components/toast/spec.yaml and the
// accessibility table of rfcs/0008-toast.md: what assistive technology is told, the keyboard,
// touch, the timer on Playwright's fake clock, the app's bottom bar, the person's font size, and
// axe in each of the system's color and contrast settings.
//
// The component tests in packages/web check each token, the pauses one by one, and the on-screen
// keyboard. These check what only an app shows: that the toasts work through a production build,
// and what the browser makes of the result.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const lastAction = (page: Page) => page.getByTestId("last-action");
const region = (page: Page) => page.getByRole("region", { name: "Notifications" });
/** The toast on the screen, open or leaving. */
const toast = (page: Page) => region(page).getByRole("listitem");

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error(`${locator} is not visible`);
  return found;
}

/** Waits until the toast on the screen has finished entering, so that it stands still. */
async function settled(page: Page) {
  await expect(toast(page)).toBeVisible();
  await toast(page).evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

/** What Chromium gives assistive technology for each node of a role, in document order. */
async function accessibilityNodes(page: Page, roles: string[]) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && roles.includes(String(node.role?.value)))
    .map((node) => {
      const state = new Map((node.properties ?? []).map((p) => [p.name, p.value.value]));
      return {
        role: node.role?.value,
        name: node.name?.value || undefined,
        live: state.get("live"),
      };
    });
}

test.describe("the toasts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/toast");
  });

  test("are in a region landmark the app names, and a status region announces each message politely", async ({
    page,
  }) => {
    await expect(region(page)).toBeAttached();
    const archive = page.getByRole("button", { name: "Archive message" });
    await archive.click();
    await expect(toast(page)).toHaveText("Message archived");
    // Focus stays where it was.
    await expect(archive).toBeFocused();

    expect(await accessibilityNodes(page, ["region", "status"])).toEqual([
      { role: "region", name: "Notifications", live: undefined },
      { role: "status", name: undefined, live: "polite" },
    ]);
    await expect(page.getByRole("status")).toHaveText("Message archived");
  });

  test("a toast with an action has the action and a named close button; the action runs and closes it", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Delete address" }).click();
    const undo = region(page).getByRole("button", { name: "Undo" });
    await expect(undo).toBeVisible();
    await expect(region(page).getByRole("button", { name: "Close" })).toBeVisible();
    await undo.click();
    await expect(lastAction(page)).toHaveText("Last action: Undo");
    await expect(toast(page)).toHaveCount(0);
  });

  test("a second toast waits in the queue, then follows", async ({ page }) => {
    await page.getByRole("button", { name: "Copy two links" }).click();
    await expect(toast(page)).toHaveText("First link copied");
    await expect(page.getByText("Second link copied")).toHaveCount(0);
    await region(page).getByRole("button", { name: "Close" }).click();
    await expect(toast(page)).toHaveText("Second link copied");
    await expect(page.getByRole("status")).toHaveText("Second link copied");
  });

  test("F8 moves focus to the toast and back; Tab reaches its buttons; Escape closes it", async ({
    page,
  }) => {
    const remove = page.getByRole("button", { name: "Delete address" });
    await remove.click();
    await settled(page);
    await page.keyboard.press("F8");
    await expect(toast(page)).toBeFocused();
    await page.keyboard.press("F8");
    await expect(remove).toBeFocused();

    await page.keyboard.press("F8");
    await page.keyboard.press("Tab");
    await expect(region(page).getByRole("button", { name: "Undo" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(region(page).getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toast(page)).toHaveCount(0);
    await expect(remove).toBeFocused();
  });

  test("sit above the app's bottom bar, centered", async ({ page }) => {
    await page.getByRole("button", { name: "Archive message" }).click();
    await settled(page);
    const shown = await box(toast(page));
    const bar = await box(page.getByTestId("bottom-bar"));
    const margin = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rc-toast-margin")),
    );
    expect(shown.y + shown.height).toBeCloseTo(bar.y - margin, 0);
    const width = page.viewportSize()?.width ?? 0;
    expect(shown.x + shown.width / 2).toBeCloseTo(width / 2, 0);
  });

  test("grow with the person's font size, and no text is cut off", async ({ page }) => {
    await page.getByRole("button", { name: "Delete address" }).click();
    await settled(page);
    const before = await box(toast(page));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const after = await box(toast(page));
    expect(after.height).toBeGreaterThan(before.height);
    const clipped = await toast(page)
      .locator("*")
      .evaluateAll((elements) =>
        elements
          .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight)
          .map((e) => e.textContent),
      );
    expect(clipped).toEqual([]);
  });
});

test.describe("the timer, on a fake clock", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-24T09:00:00") });
    await page.goto("/toast");
    await page.clock.pauseAt(new Date("2026-11-24T09:00:10"));
  });

  test("without an action, a toast closes after 6 seconds", async ({ page }) => {
    await page.getByRole("button", { name: "Archive message" }).click();
    await expect(toast(page)).toBeVisible();
    await page.clock.runFor(5900);
    await expect(toast(page)).toHaveAttribute("data-state", "open");
    await page.clock.runFor(200);
    await expect(toast(page)).toHaveCount(0);
  });

  test("with an action, a toast stays until it is used or closed (WCAG 2.2.1)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Delete address" }).click();
    await expect(toast(page)).toBeVisible();
    await page.clock.runFor(10 * 60 * 1000);
    await expect(toast(page)).toHaveAttribute("data-state", "open");
  });

  test("the timer stops while the pointer is over the toast, and goes on when it leaves", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Archive message" }).click();
    await settled(page);
    await page.clock.runFor(1000);
    await toast(page).hover();
    await page.clock.runFor(60 * 1000);
    await expect(toast(page)).toHaveAttribute("data-state", "open");
    await page.mouse.move(0, 0);
    await page.clock.runFor(4800);
    await expect(toast(page)).toHaveAttribute("data-state", "open");
    await page.clock.runFor(400);
    await expect(toast(page)).toHaveCount(0);
  });

  test("the timer stops while focus is in the toast", async ({ page }) => {
    await page.getByRole("button", { name: "Archive message" }).click();
    await settled(page);
    await page.keyboard.press("F8");
    await page.clock.runFor(60 * 1000);
    await expect(toast(page)).toHaveAttribute("data-state", "open");
    await page.keyboard.press("F8");
    await page.clock.runFor(6100);
    await expect(toast(page)).toHaveCount(0);
  });
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("the toast fits the width, and a swipe down closes it", async ({ page }) => {
    await page.goto("/toast");
    await page.getByRole("button", { name: "Delete address" }).tap();
    await settled(page);
    const shown = await box(toast(page));
    expect(shown.x).toBeGreaterThanOrEqual(0);
    expect(shown.x + shown.width).toBeLessThanOrEqual(390);

    const cdp = await page.context().newCDPSession(page);
    const x = shown.x + shown.width / 2;
    const y = shown.y + 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step += 1) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + step * 20 }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(toast(page)).toHaveCount(0);
  });
});

test.describe("system settings", () => {
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
    test(`a screen with a toast has no accessibility violations: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await page.goto("/toast");
      await page.getByRole("button", { name: "Delete address" }).click();
      await settled(page);
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
