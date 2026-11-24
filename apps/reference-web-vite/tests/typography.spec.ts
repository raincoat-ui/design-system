// Text and Heading in a built app, in Chromium, checked against
// specs/components/typography/spec.yaml: the headings and levels Chromium gives assistive
// technology, text cut short read in full, a label, the person's font size, and axe in each of
// the system's color and contrast settings.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const PARAGRAPH =
  "Your files are kept on this device and in the cloud. Changes made on one device reach the others the next time they connect, usually within a minute.";
const LONG_HEADING = "Notifications for comments, mentions, and changes to shared documents";

/** What Chromium gives assistive technology: each node's role, name, and level. */
async function accessibilityTree(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => {
      const level = (node.properties ?? []).find((property) => property.name === "level");
      return {
        role: String(node.role?.value),
        name: String(node.name?.value ?? ""),
        level: level?.value.value as number | undefined,
      };
    });
}

/** Every Text and Heading on the page whose content its own box cuts off. */
const clipped = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="text"], [data-slot="heading"]')]
      // Text cut short by max-lines is meant to be.
      .filter((element) => !element.hasAttribute("style"))
      .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight)
      .map((element) => element.textContent),
  );

test.beforeEach(async ({ page }) => {
  await page.goto("/typography");
});

test("each heading is a heading at its level, in the order of the outline", async ({ page }) => {
  const headings = (await accessibilityTree(page))
    .filter(({ role }) => role === "heading")
    .map(({ name, level }) => [level, name]);
  expect(headings).toEqual([
    [1, "Settings"],
    [2, "Text styles"],
    [2, "Colors"],
    [2, "Headings"],
    [3, "Level 3"],
    [4, "Level 4"],
    [5, "Level 5"],
    [6, "Level 6"],
    // A look of its own does not change the level.
    [3, "Recent files"],
    [3, "Shared with you"],
    [2, "Long text"],
    [3, LONG_HEADING],
    [2, "A label"],
  ]);
});

test("text cut short after two lines is given to assistive technology in full", async ({
  page,
}) => {
  // Narrow enough for the paragraph to need more than two lines.
  await page.setViewportSize({ width: 390, height: 844 });
  const text = page.getByTestId("max-lines");
  const lineHeight = await text.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).lineHeight),
  );
  const box = await text.boundingBox();
  expect(box?.height).toBeCloseTo(2 * lineHeight, 0);
  const tree = await accessibilityTree(page);
  expect(tree.some(({ role, name }) => role === "StaticText" && name === PARAGRAPH)).toBe(true);
});

test("a person's name takes its direction from its first strong character", async ({ page }) => {
  const directions = await page
    .getByTestId("name")
    .evaluate((element) => [
      getComputedStyle(element).direction,
      getComputedStyle(element.parentElement as Element).direction,
    ]);
  expect(directions).toEqual(["rtl", "ltr"]);
});

test("a Text rendered as a label names its field, and a click on it focuses the field", async ({
  page,
}) => {
  await page.getByText("Device name", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Device name" })).toBeFocused();
});

test("text grows with the person's font size, and nothing is cut off", async ({ page }) => {
  const sizes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-slot="text"], [data-slot="heading"]')].map((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    );
  const before = await sizes();

  // The browser's font size setting, at twice its default of 16px.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  const after = await sizes();
  expect(after).toEqual(before.map((size) => size * 2));
  expect(await clipped(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test.describe("on a phone-sized screen", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the screen fits the width, and long headings wrap", async ({ page }) => {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const heading = page.getByRole("heading", { name: LONG_HEADING });
    const lineHeight = await heading.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).lineHeight),
    );
    expect((await heading.boundingBox())?.height).toBeGreaterThan(1.5 * lineHeight);
    expect(await clipped(page)).toEqual([]);
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
    test(`the screen has no accessibility violations: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      await page.addScriptTag({ content: AXE });
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
      expect(result.violations).toEqual([]);
      expect(result.passes).toEqual(expect.arrayContaining(["heading-order", "color-contrast"]));
    });
  }
});
