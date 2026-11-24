// The Dialog, the alert dialog, and the Sheet in a built app, in Chromium, checked against
// specs/components/dialog/spec.yaml and the Accessibility table of rfcs/0006-dialog-and-sheet.md:
// the role, name, and description Chromium gives assistive technology, and the page behind it
// hidden; focus moving in, staying inside, and coming back; Escape, the scrim, and Cancel; the
// person's font size; a phone-sized screen and 400% zoom; and axe in each of the system's color
// and contrast settings.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

/** What Chromium gives assistive technology: each node's role, name, and description. */
async function accessibilityTree(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => {
      const property = (name: string) =>
        (node.properties ?? []).find((each) => each.name === name)?.value.value;
      return {
        role: String(node.role?.value),
        name: String(node.name?.value ?? ""),
        description: String(node.description?.value ?? ""),
        modal: property("modal") as boolean | undefined,
      };
    });
}

/** Waits until the open dialog has finished coming in. */
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
  );
}

/** The open dialog or alert dialog. */
const openDialog = (page: Page) => page.locator('[role="dialog"], [role="alertdialog"]');

test.beforeEach(async ({ page }) => {
  await page.goto("/dialog");
});

test("each is a modal dialog or alert dialog named by its title, and the page behind is hidden", async ({
  page,
}) => {
  const cases = [
    ["Rename", "dialog", "Rename file", "Everyone the file is shared with sees the new name."],
    ["Terms of use", "dialog", "Terms of use", ""],
    [
      "Delete address",
      "alertdialog",
      "Delete this address?",
      "It is removed from your account. This cannot be undone.",
    ],
    ["Share", "dialog", "Share file", "People with the link can view the file."],
    ["Filters", "dialog", "Filters", ""],
  ] as const;
  for (const [trigger, role, name, description] of cases) {
    await page.getByRole("button", { name: trigger, exact: true }).click();
    await expect(page.getByRole(role, { name })).toBeVisible();
    const tree = await accessibilityTree(page);
    const dialog = tree.find((node) => node.role === role);
    expect(dialog, trigger).toMatchObject({ name, description, modal: true });
    // Nothing on the page behind is given to assistive technology.
    expect(
      tree.some((node) => node.name === "Files"),
      trigger,
    ).toBe(false);
    const behind = trigger === "Share" ? "Filters" : "Share";
    expect(
      tree.some((node) => node.role === "button" && node.name === behind),
      trigger,
    ).toBe(false);
    await page.keyboard.press("Escape");
    await expect(openDialog(page)).toHaveCount(0);
  }
});

test("a dialog with a short form starts in its field, and Enter submits it", async ({ page }) => {
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Name" });
  await expect(field).toBeFocused();
  await field.fill("Annual report");
  await page.keyboard.press("Enter");
  await expect(openDialog(page)).toHaveCount(0);
  await expect(page.getByTestId("status")).toHaveText("Renamed to Annual report.");
  // Focus is back on the button that opened the dialog.
  await expect(page.getByRole("button", { name: "Rename", exact: true })).toBeFocused();
});

test("a dialog starts on its title, and Tab and Shift+Tab stay inside it", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Filters" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Filters" })).toBeFocused();
  for (const key of ["Tab", "Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    expect(
      await openDialog(page).evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("an alert dialog starts on Cancel; Escape cancels, and the scrim does nothing", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Delete address" });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.mouse.click(4, 4);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openDialog(page)).toHaveCount(0);
  await expect(page.getByTestId("status")).toHaveText("Nothing yet.");
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("button", { name: "Delete address" }).last().click();
  await expect(page.getByTestId("status")).toHaveText("Deleted the address.");
});

test("a dialog and a sheet close on the scrim and on their close button", async ({ page }) => {
  await page.getByRole("button", { name: "Terms of use" }).click();
  await settled(page);
  await page.mouse.click(4, 4);
  await expect(openDialog(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(openDialog(page)).toHaveCount(0);
});

test("long content scrolls in the body, which the keyboard can scroll", async ({ page }) => {
  await page.getByRole("button", { name: "Terms of use" }).click();
  const body = page.getByTestId("terms");
  await expect(body).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(body).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  // The header is still in place above the body.
  const title = await page.getByRole("heading", { name: "Terms of use" }).boundingBox();
  const area = await body.boundingBox();
  expect((title?.y ?? 0) + (title?.height ?? 0)).toBeLessThanOrEqual(area?.y ?? 0);
});

test("text grows with the person's font size, buttons stack, and nothing is cut off", async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await page.getByRole("button", { name: "Delete address" }).click();
  await settled(page);
  const dialog = openDialog(page);
  await expect(dialog.locator('[data-section="footer"]')).toHaveAttribute("data-stacked", "");
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("a bottom sheet spans the width at the bottom, and an end sheet comes from the bottom too", async ({
    page,
  }) => {
    for (const trigger of ["Share", "Filters"]) {
      await page.getByRole("button", { name: trigger }).tap();
      await settled(page);
      const box = await openDialog(page).boundingBox();
      expect(box?.width, trigger).toBeCloseTo(390, 0);
      expect((box?.y ?? 0) + (box?.height ?? 0), trigger).toBeCloseTo(844, 0);
      await openDialog(page)
        .getByRole("button", { name: /Cancel|Close/ })
        .first()
        .tap();
      await expect(openDialog(page)).toHaveCount(0);
    }
  });
});

test.describe("at 400% zoom", () => {
  // A window of 1280 by 1024 CSS pixels, zoomed to 400%.
  test.use({ viewport: { width: 320, height: 256 } });

  test("a dialog fits the width, and the whole dialog scrolls when the body has no room", async ({
    page,
  }) => {
    // Its header and footer leave the body less than three lines.
    await page.getByRole("button", { name: "Rename", exact: true }).click();
    const dialog = openDialog(page);
    await expect(dialog).toHaveAttribute("data-scroll", "whole");
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
  });
});

test("with reduced motion, a sheet fades in and does not slide", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Filters" }).click();
  expect(
    await openDialog(page).evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("rc-dialog-in");
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
    test(`each open dialog has no accessibility violations: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await page.addScriptTag({ content: AXE });
      for (const trigger of ["Rename", "Terms of use", "Delete address", "Share", "Filters"]) {
        await page.getByRole("button", { name: trigger, exact: true }).click();
        await settled(page);
        const result = await page.evaluate(async (enhanced) => {
          const { axe } = window as unknown as { axe: typeof Axe };
          const results = await axe.run(document, {
            runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
            // More contrast promises 7:1 for text, which is the enhanced criterion.
            rules: { "color-contrast-enhanced": { enabled: enhanced } },
          });
          return {
            violations: results.violations.map((violation) => ({
              id: violation.id,
              nodes: violation.nodes.map((node) => node.target.join(" ")),
            })),
            passes: results.passes.map(({ id }) => id),
          };
        }, setting.contrast === "more");
        expect(result.violations, trigger).toEqual([]);
        expect(result.passes, trigger).toEqual(expect.arrayContaining(["color-contrast"]));
        await page.keyboard.press("Escape");
        await expect(openDialog(page)).toHaveCount(0);
      }
    });
  }
});
