// The Button in a built app, in Chromium, checked against specs/components/button/spec.yaml:
// what assistive technology is told, the mouse, the keyboard, and touch, the room a small button
// takes, the person's font size, and axe in each of the system's color and contrast settings.
//
// The component tests in packages/web check each token's value in every mode and density. These
// check what only an app shows: that the packages work through a production build, and what the
// browser makes of the result.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const LONG_LABEL = "Save all of these changes and send the updated version to every reviewer";

const lastAction = (page: Page) => page.getByTestId("last-action");

/** Waits until the browser has drawn a frame, so that the effects of earlier input are seen. */
const nextFrame = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error(`${locator} is not visible`);
  return found;
}

/** What Chromium gives assistive technology for each button and link, in document order. */
async function controls(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && ["button", "link"].includes(String(node.role?.value)))
    .map((node) => {
      const state = new Map((node.properties ?? []).map((p) => [p.name, p.value.value]));
      return {
        role: node.role?.value,
        name: node.name?.value,
        focusable: Boolean(state.get("focusable")),
        disabled: Boolean(state.get("disabled")),
        busy: Boolean(state.get("busy")),
      };
    });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("each control is a button named by its label, with its state, and the link is a link", async ({
  page,
}) => {
  const control = (role: string, name: string, state = {}) => ({
    role,
    name,
    focusable: true,
    disabled: false,
    busy: false,
    ...state,
  });
  const button = (name: string, state = {}) => control("button", name, state);

  expect(await controls(page)).toEqual([
    button("Save changes"),
    button("Cancel"),
    button("Show details"),
    button("Delete project"),
    button("Small"),
    button("Medium"),
    button("Large"),
    button("Publish", { focusable: false, disabled: true }),
    // A loading button stays focusable and is busy. It also refuses activation through
    // aria-disabled, so the browser reports it as unavailable while it is busy.
    button("Send invite", { disabled: true, busy: true }),
    // Disabled wins: this button is not also busy.
    button("Archive", { focusable: false, disabled: true }),
    // An icon alone has no name; this one is given by the app.
    button("Delete page"),
    button("Continue"),
    button(LONG_LABEL),
    control("link", "Read the guide"),
  ]);
});

test("the styles reach the page through the build: each variant draws its token colors", async ({
  page,
}) => {
  const variants = {
    primary: "Save changes",
    secondary: "Cancel",
    ghost: "Show details",
    danger: "Delete project",
  };
  for (const [variant, name] of Object.entries(variants)) {
    const [drawn, expected] = await page
      .getByRole("button", { name })
      .evaluate((element, variant) => {
        // An element colored straight from the tokens, to compare the button with.
        const probe = document.createElement("div");
        probe.style.color = `var(--rc-button-${variant}-fg)`;
        probe.style.backgroundColor =
          variant === "ghost" ? "transparent" : `var(--rc-button-${variant}-bg-default)`;
        document.body.append(probe);
        const style = getComputedStyle(element);
        const tokens = getComputedStyle(probe);
        const result = [
          [style.color, style.backgroundColor],
          [tokens.color, tokens.backgroundColor],
        ];
        probe.remove();
        return result;
      }, variant);
    expect(drawn, `${variant} button`).toEqual(expected);
  }
});

test("a click, Enter, and Space run the action, and Enter follows the link", async ({ page }) => {
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(lastAction(page)).toHaveText("Last action: Save changes");

  await page.getByRole("button", { name: "Cancel" }).focus();
  await page.keyboard.press("Enter");
  await expect(lastAction(page)).toHaveText("Last action: Cancel");

  await page.getByRole("button", { name: "Show details" }).focus();
  await page.keyboard.press("Space");
  await expect(lastAction(page)).toHaveText("Last action: Show details");

  await page.getByRole("link", { name: "Read the guide" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#guide$/);
});

test("Tab moves through the controls in order, skipping disabled buttons", async ({ page }) => {
  const order = [
    "Save changes",
    "Cancel",
    "Show details",
    "Delete project",
    "Small",
    "Medium",
    "Large",
    // Publish is disabled. Send invite is loading, which keeps it in the order.
    "Send invite",
    // Archive is disabled.
    "Delete page",
    "Continue",
    LONG_LABEL,
    "Read the guide",
  ];
  for (const name of order) {
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAccessibleName(name);
  }
});

test("a disabled or loading button ignores the mouse and the keyboard, and a loading one keeps focus", async ({
  page,
}) => {
  for (const name of ["Publish", "Send invite", "Archive"]) {
    const { x, y, width, height } = await box(page.getByRole("button", { name }));
    await page.mouse.click(x + width / 2, y + height / 2);
  }
  const loading = page.getByRole("button", { name: "Send invite" });
  await loading.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await nextFrame(page);

  await expect(loading).toBeFocused();
  await expect(lastAction(page)).toHaveText("Last action: Nothing yet");
});

test("buttons grow with the person's font size, and no label is cut off", async ({ page }) => {
  const save = page.getByRole("button", { name: "Save changes" });
  const fontSize = () => save.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  const before = { size: await fontSize(), box: await box(save) };

  // The browser's font size setting, at twice its default of 16px.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await nextFrame(page);

  const after = { size: await fontSize(), box: await box(save) };
  expect(after.size).toBeCloseTo(before.size * 2);
  expect(after.box.width).toBeGreaterThan(before.box.width);
  expect(after.box.height).toBeGreaterThan(before.box.height);

  const clipped = await page
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons
        .filter((b) => b.scrollWidth > b.clientWidth || b.scrollHeight > b.clientHeight)
        .map((b) => b.getAttribute("aria-label") ?? b.textContent),
    );
  expect(clipped).toEqual([]);
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("the screen fits the width, long labels wrap, and a tap runs the action", async ({
    page,
  }) => {
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const long = await box(page.getByRole("button", { name: LONG_LABEL }));
    const continueButton = await box(page.getByRole("button", { name: "Continue" }));
    // The long label wraps onto more lines inside the width of the screen.
    expect(long.x + long.width).toBeLessThanOrEqual(390);
    expect(long.height).toBeGreaterThan(continueButton.height);

    await page.getByRole("button", { name: "Continue" }).tap();
    await expect(lastAction(page)).toHaveText("Last action: Continue");
  });

  test("a small button takes the room it shows, and its touch target reaches past it", async ({
    page,
  }) => {
    const locator = page.getByRole("button", { name: "Delete page" });
    const button = await box(locator);
    const above = await box(page.getByTestId("small-above"));
    const below = await box(page.getByTestId("small-below"));
    // The lines directly above and below touch the visible button.
    expect(above.y + above.height).toBeCloseTo(button.y);
    expect(below.y).toBeCloseTo(button.y + button.height);

    // The touch target is larger, and centered on the button.
    const minimum = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--rc-button-target-minimum"),
      ),
    );
    const reach = (minimum - button.height) / 2;
    expect(reach).toBeGreaterThan(0);
    const x = button.x + button.width / 2;

    // The target's edge is found by hit testing. A tap cannot show it: Chromium moves a tap that
    // lands near a target onto it, here up to 8px beyond the edge.
    const hits = (y: number) =>
      locator.evaluate(
        (element, point) => document.elementFromPoint(point.x, point.y) === element,
        { x, y },
      );
    // Inside the target but above the visible button, on the line of text there.
    expect(await hits(button.y - reach + 1)).toBe(true);
    expect(await hits(button.y + button.height + reach - 1)).toBe(true);
    // Just beyond the target.
    expect(await hits(button.y - reach - 1)).toBe(false);
    expect(await hits(button.y + button.height + reach + 1)).toBe(false);

    await page.touchscreen.tap(x, button.y - reach + 1);
    await expect(lastAction(page)).toHaveText("Last action: Delete page");
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

  test("the theme follows the system's color scheme and contrast setting", async ({ page }) => {
    const seen = new Set<string>();
    for (const setting of SETTINGS) {
      await page.emulateMedia(setting);
      // The canvas, and the muted text of a heading, which differs in every setting.
      const colors = await page.evaluate(() => [
        getComputedStyle(document.body).backgroundColor,
        getComputedStyle(document.querySelector("h2") as Element).color,
      ]);
      seen.add(colors.join(" "));
    }
    expect(seen.size).toBe(SETTINGS.length);
  });

  const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

  for (const setting of SETTINGS) {
    test(`the screen has no accessibility violations: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
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
