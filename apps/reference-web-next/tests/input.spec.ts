// The Input rendered on a server by Next.js, in Chromium, checked against
// specs/components/input/spec.yaml: the HTML the server sends before any JavaScript runs, a form
// that posts to a Server Action and comes back with the field in error, hydration, and axe.
//
// The Vite app (apps/reference-web-vite) checks the Input in a single-page app in depth. These
// check what only a server shows.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const ERROR = "Enter an email address, like name@example.com";

const email = (page: Page) => page.getByRole("textbox", { name: "Email" });
const subscribed = (page: Page) => page.getByTestId("subscribed");

/** Checks a submitted email field: in error, said after its description, with what was typed. */
async function expectInError(page: Page, typed: string) {
  await expect(email(page)).toHaveAttribute("aria-invalid", "true");
  await expect(email(page)).toHaveAccessibleDescription(`We send the newsletter here. ${ERROR}`);
  await expect(email(page)).toHaveValue(typed);
  await expect(subscribed(page)).toHaveText("Not subscribed yet");
}

test.describe("before any JavaScript runs", () => {
  test.use({ javaScriptEnabled: false });

  test("the server sends each field named by its label, described, and with its state", async ({
    page,
  }) => {
    await page.goto("/input");
    await expect(email(page)).toHaveAccessibleDescription("We send the newsletter here.");
    await expect(email(page)).toHaveAttribute("required", "");
    await expect(email(page)).not.toHaveAttribute("aria-invalid");
    await expect(page.getByRole("textbox", { name: "Company" })).toBeDisabled();
    await expect(page.getByRole("textbox", { name: "Account number" })).not.toBeEditable();
    // A hidden label is still the name.
    await expect(page.getByRole("searchbox", { name: "Search the docs" })).toBeVisible();
    // Email addresses are left-to-right whatever the page's direction.
    await expect(email(page).locator("xpath=..")).toHaveAttribute("dir", "ltr");
  });

  test("the form posts to its Server Action, and comes back with the field in error", async ({
    page,
  }) => {
    await page.goto("/input");
    await email(page).fill("ana");
    await email(page).press("Enter");
    await expect(page).toHaveURL(/invalid=email/);
    await expectInError(page, "ana");

    await email(page).fill("ana@example.com");
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(subscribed(page)).toHaveText("Subscribed: ana@example.com");
    await expect(email(page)).not.toHaveAttribute("aria-invalid");
  });
});

test.describe("once React has hydrated the page", () => {
  test("hydration finds the HTML it expects, and the form comes back with the field in error", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/input");
    await page.waitForLoadState("networkidle");
    await email(page).fill("ana");
    await email(page).press("Enter");
    await expectInError(page, "ana");

    await email(page).fill("ana@example.com");
    await email(page).press("Enter");
    await expect(subscribed(page)).toHaveText("Subscribed: ana@example.com");
    expect(errors).toEqual([]);
  });

  test("the styles reach the page through Tailwind: the field draws its token colors", async ({
    page,
  }) => {
    await page.goto("/input?invalid=email&email=ana");
    const [drawn, expected] = await email(page).evaluate((element) => {
      const field = element.closest('[data-slot="input-field"]') as Element;
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--rc-input-bg-default)";
      probe.style.borderColor = "var(--rc-input-border-invalid)";
      document.body.append(probe);
      const style = getComputedStyle(field);
      const tokens = getComputedStyle(probe);
      const result = [
        [style.backgroundColor, style.borderTopColor],
        [tokens.backgroundColor, tokens.borderTopColor],
      ];
      probe.remove();
      return result;
    });
    expect(drawn).toEqual(expected);
  });
});

test.describe("system settings", () => {
  const SETTINGS = [
    { colorScheme: "light", contrast: "no-preference" },
    { colorScheme: "dark", contrast: "more" },
  ] as const;
  const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

  for (const setting of SETTINGS) {
    test(`the page has no accessibility violations, with the field in error: ${setting.colorScheme}, ${setting.contrast} contrast`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await page.goto("/input?invalid=email&email=ana");
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
