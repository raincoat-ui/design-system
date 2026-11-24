// The Dialog, the alert dialog, and the Sheet in Next.js, in Chromium, checked against
// specs/components/dialog/spec.yaml: the server sends the buttons that open them and no dialog;
// once React hydrates the page, each opens as a modal dialog or alert dialog named by its title,
// with focus where the spec puts it, the styles loaded through Tailwind CSS, and no accessibility
// violations in each of the system's color and contrast settings.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const openDialog = (page: Page) => page.locator('[role="dialog"], [role="alertdialog"]');

/** Waits until the open dialog has finished coming in. */
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
  );
}

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the server sends the buttons that open the dialogs, and no dialog", async ({ page }) => {
    await page.goto("/dialog");
    for (const name of ["Rename", "Delete address", "Filters"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    await expect(openDialog(page)).toHaveCount(0);
  });
});

test.describe("with JavaScript on", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dialog");
    // The page is hydrated once a click on a trigger opens its dialog.
    await expect(page.getByRole("button", { name: "Rename", exact: true })).toBeEnabled();
  });

  test("a dialog opens on its field, and closes back to its button", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Rename", exact: true });
    await expect(async () => {
      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Rename file" })).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(page.getByRole("textbox", { name: "Name" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(openDialog(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("an alert dialog starts on Cancel, and its action runs", async ({ page }) => {
    await expect(async () => {
      await page.getByRole("button", { name: "Delete address" }).click();
      await expect(page.getByRole("alertdialog", { name: "Delete this address?" })).toBeVisible({
        timeout: 500,
      });
    }).toPass();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.getByRole("button", { name: "Delete address" }).last().click();
    await expect(page.getByTestId("status")).toHaveText("Deleted the address.");
  });

  test("the styles reach the dialog through Tailwind CSS", async ({ page }) => {
    await expect(async () => {
      await page.getByRole("button", { name: "Filters" }).click();
      await expect(openDialog(page)).toBeVisible({ timeout: 500 });
    }).toPass();
    await settled(page);
    const styles = await openDialog(page).evaluate((element) => {
      const style = getComputedStyle(element);
      const probe = document.createElement("div");
      probe.style.background = "var(--rc-dialog-bg)";
      document.body.append(probe);
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { background: style.backgroundColor, expected, position: style.position };
    });
    expect(styles.position).toBe("fixed");
    expect(styles.background).toBe(styles.expected);
  });

  const SETTINGS = [
    { colorScheme: "light", contrast: "no-preference" },
    { colorScheme: "dark", contrast: "more" },
  ] as const;
  const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

  for (const setting of SETTINGS) {
    test(`an open alert dialog has no accessibility violations: ${setting.colorScheme}, ${setting.contrast} contrast`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await expect(async () => {
        await page.getByRole("button", { name: "Delete address" }).click();
        await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 500 });
      }).toPass();
      await settled(page);
      await page.addScriptTag({ content: AXE });
      const violations = await page.evaluate(async (enhanced) => {
        const { axe } = window as unknown as { axe: typeof Axe };
        const results = await axe.run(document, {
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
          rules: { "color-contrast-enhanced": { enabled: enhanced } },
        });
        return results.violations.map((violation) => violation.id);
      }, setting.contrast === "more");
      expect(violations).toEqual([]);
    });
  }
});
