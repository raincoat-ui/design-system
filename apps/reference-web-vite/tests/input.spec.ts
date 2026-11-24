// The Input in a built app, in Chromium, checked against specs/components/input/spec.yaml and the
// Accessibility table of RFC 0004: what assistive technology is told, a form checked on submit
// with focus moved to the first field in error, the keyboard, an input method, touch, the room a
// small field takes, the person's font size, and axe in each of the system's color and contrast
// settings.
//
// The component tests in packages/web check each token's value in every mode and density. These
// check what only an app shows.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const LONG_LABEL =
  "Where should we send the invoice, if it should go somewhere other than your address";

const sent = (page: Page) => page.getByTestId("sent");
const send = (page: Page) => page.getByRole("button", { name: "Send" });

/** Waits until the browser has drawn a frame, so that the effects of earlier input are seen. */
const nextFrame = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error(`${locator} is not visible`);
  return found;
}

/** What Chromium gives assistive technology for each text field, by name. */
async function fields(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && ["textbox", "searchbox"].includes(String(node.role?.value)))
    .map((node) => {
      const state = new Map((node.properties ?? []).map((p) => [p.name, p.value.value]));
      return {
        role: node.role?.value,
        name: node.name?.value,
        description: node.description?.value ?? "",
        focusable: Boolean(state.get("focusable")),
        disabled: Boolean(state.get("disabled")),
        readonly: Boolean(state.get("readonly")),
        required: Boolean(state.get("required")),
        invalid: String(state.get("invalid") ?? "false"),
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/input");
});

test("each field is named by its label and described by its description, with its state", async ({
  page,
}) => {
  const field = (name: string, state = {}) => ({
    role: "textbox",
    name,
    description: "",
    focusable: true,
    disabled: false,
    readonly: false,
    required: false,
    invalid: "false",
    ...state,
  });
  const expected = [
    field("Full name", { required: true }),
    field("Email", { description: "We send the receipt here.", required: true }),
    field("Phone (optional)"),
    field("Message (optional)"),
    field("Small"),
    field("Medium"),
    field("Large"),
    field("Company", { focusable: false, disabled: true }),
    field("Account number", { readonly: true }),
    // A hidden label is still the name.
    field("Search the docs", { role: "searchbox" }),
    field(LONG_LABEL),
  ];
  expect(await fields(page)).toEqual(expected.sort((a, b) => a.name.localeCompare(b.name)));
});

test("submitting checks the form, moves focus to the first field in error, and each error clears as it is fixed", async ({
  page,
}) => {
  const name = page.getByRole("textbox", { name: "Full name" });
  const email = page.getByRole("textbox", { name: "Email" });
  // No error is shown before the form is submitted, even while someone types.
  await email.fill("ana");
  await expect(email).not.toHaveAttribute("aria-invalid");

  await send(page).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("Enter your full name");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  // The description stays, and the error follows it.
  await expect(email).toHaveAccessibleDescription(
    "We send the receipt here. Enter an email address, like name@example.com",
  );
  await expect(sent(page)).toHaveText("Sent: Nothing yet");

  // From now on each field is checked as it changes.
  await name.fill("Ana Lima");
  await expect(name).not.toHaveAttribute("aria-invalid");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await send(page).click();
  await expect(email).toBeFocused();
  await email.fill("ana@example.com");
  await expect(email).not.toHaveAttribute("aria-invalid");
  await expect(email).toHaveAccessibleDescription("We send the receipt here.");

  // Enter in a one-line field sends the form.
  await email.press("Enter");
  await expect(sent(page)).toHaveText("Sent: Ana Lima");
});

test("Enter that commits an input method's composition does not send the form", async ({
  page,
}) => {
  const name = page.getByRole("textbox", { name: "Full name" });
  await name.click();
  // Chromium's own input method protocol: Vietnamese Telex composes "đ" from "dd".
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "d", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.imeSetComposition", { text: "đ", selectionStart: 1, selectionEnd: 1 });
  await page.keyboard.press("Enter");
  await cdp.send("Input.insertText", { text: "đ" });
  await cdp.detach();
  await nextFrame(page);

  // The form was not submitted: no error is shown, and the value is what the input method wrote.
  await expect(name).toHaveValue("đ");
  await expect(name).not.toHaveAttribute("aria-invalid");
  await expect(sent(page)).toHaveText("Sent: Nothing yet");
});

test("Tab reaches every field but the disabled one, the read-only one included", async ({
  page,
}) => {
  const order = [
    "Full name",
    "Email",
    "Phone (optional)",
    "Message (optional)",
    "Send",
    "Small",
    "Medium",
    "Large",
    // Company is disabled.
    "Account number",
    "Search the docs",
    LONG_LABEL,
  ];
  for (const name of order) {
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAccessibleName(name);
  }
});

test("a disabled field cannot be changed, and a read-only one is selected but not changed", async ({
  page,
}) => {
  const company = page.getByRole("textbox", { name: "Company" });
  await expect(company).toBeDisabled();
  await company.click({ force: true });
  await expect(company).not.toBeFocused();

  const account = page.getByRole("textbox", { name: "Account number" });
  await account.click();
  await expect(account).toBeFocused();
  await page.keyboard.type("123");
  await expect(account).toHaveValue("DE89 3704 0044 0532 0130 00");
  await expect(account).not.toBeEditable();
});

test("the focus ring is drawn whenever a field has focus, from the theme's tokens", async ({
  page,
}) => {
  const name = page.getByRole("textbox", { name: "Full name" });
  const ring = () =>
    name.evaluate((element) => {
      const field = element.closest('[data-slot="input-field"]') as Element;
      const probe = document.createElement("div");
      probe.style.outlineColor = "var(--rc-input-focus-ring-color)";
      document.body.append(probe);
      const style = getComputedStyle(field);
      const result = {
        style: style.outlineStyle,
        color: style.outlineColor,
        token: getComputedStyle(probe).outlineColor,
      };
      probe.remove();
      return result;
    });
  expect((await ring()).style).toBe("none");
  // A click, not only the keyboard: a field has focus only to be typed in.
  await name.click();
  const focused = await ring();
  expect(focused.style).toBe("solid");
  expect(focused.color).toBe(focused.token);
});

test("fields grow with the person's font size, and no label or error is cut off", async ({
  page,
}) => {
  await send(page).click();
  const name = page.getByRole("textbox", { name: "Full name" });
  const field = name.locator('xpath=ancestor::*[@data-slot="input-field"][1]');
  const before = await box(field);

  // The browser's font size setting, at twice its default of 16px.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await nextFrame(page);

  // The text is twice as large, and the field grows to hold it.
  const after = await box(field);
  expect(after.height).toBeGreaterThan(before.height);
  expect(await name.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
  const clipped = await page
    .locator(
      '[data-slot="input-label"], [data-slot="input-description"], [data-slot="input-error"]',
    )
    .evaluateAll((parts) =>
      parts
        // A visually hidden label is clipped on purpose.
        .filter((part) => !part.classList.contains("sr-only"))
        .filter(
          (part) => part.scrollWidth > part.clientWidth || part.scrollHeight > part.clientHeight,
        )
        .map((part) => part.textContent),
    );
  expect(clipped).toEqual([]);
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("the screen fits the width, a long label wraps, and a tap puts the caret in a field", async ({
    page,
  }) => {
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const long = page.getByText(LONG_LABEL);
    const small = page.getByText("Small", { exact: true });
    expect((await box(long)).height).toBeGreaterThan((await box(small)).height * 1.5);

    const email = page.getByRole("textbox", { name: "Email" });
    await email.tap();
    await expect(email).toBeFocused();
  });

  test("a small field takes the room it shows, and its touch target reaches past it", async ({
    page,
  }) => {
    const control = page.getByRole("searchbox", { name: "Search the docs" });
    // Hit testing finds only what is in view.
    await control.scrollIntoViewIfNeeded();
    const field = await box(control.locator('xpath=ancestor::*[@data-slot="input-field"][1]'));
    const above = await box(page.getByTestId("small-above"));
    const below = await box(page.getByTestId("small-below"));
    // The lines directly above and below touch the visible field.
    expect(above.y + above.height).toBeCloseTo(field.y);
    expect(below.y).toBeCloseTo(field.y + field.height);

    const minimum = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--rc-input-target-minimum"),
      ),
    );
    const reach = (minimum - field.height) / 2;
    expect(reach).toBeGreaterThan(0);
    const x = field.x + field.width / 2;
    // The target's edge is found by hit testing: Chromium moves a tap that lands near a target
    // onto it.
    const hits = (y: number) =>
      control.evaluate(
        (element, point) => document.elementFromPoint(point.x, point.y) === element,
        { x, y },
      );
    expect(await hits(field.y - reach + 1)).toBe(true);
    expect(await hits(field.y + field.height + reach - 1)).toBe(true);
    expect(await hits(field.y - reach - 1)).toBe(false);
    expect(await hits(field.y + field.height + reach + 1)).toBe(false);

    // A touch on the line of text above, inside the target, puts the caret in the field.
    await page.touchscreen.tap(x, field.y - reach + 1);
    await expect(control).toBeFocused();
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
    test(`the screen has no accessibility violations, with errors shown: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await send(page).click();
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
