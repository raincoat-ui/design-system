// Text and Heading rendered by a Server Component in Next.js, in Chromium, checked against
// specs/components/typography/spec.yaml: what the server sends reads the same with JavaScript
// off, with its headings and levels, text cut short read in full, styles loaded through
// Tailwind CSS, and axe in each of the system's color and contrast settings.
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

const OUTLINE = [
  [1, "Settings"],
  [2, "Text styles"],
  [2, "Colors"],
  [2, "Headings"],
  [3, "Level 3"],
  [4, "Level 4"],
  [5, "Level 5"],
  [6, "Level 6"],
  [3, "Recent files"],
  [3, "Shared with you"],
  [2, "Long text"],
  [3, LONG_HEADING],
];

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the server sends each heading at its level, and text cut short in full", async ({
    page,
  }) => {
    await page.goto("/typography");
    const tree = await accessibilityTree(page);
    expect(
      tree.filter(({ role }) => role === "heading").map(({ name, level }) => [level, name]),
    ).toEqual(OUTLINE);

    // Cut short after two lines, with the whole text given to assistive technology.
    const text = page.getByTestId("max-lines");
    const lineHeight = await text.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).lineHeight),
    );
    expect((await text.boundingBox())?.height).toBeCloseTo(2 * lineHeight, 0);
    expect(tree.some(({ role, name }) => role === "StaticText" && name === PARAGRAPH)).toBe(true);

    // A person's name takes its direction from its first strong character.
    expect(
      await page.getByTestId("name").evaluate((element) => getComputedStyle(element).direction),
    ).toBe("rtl");
  });
});

test("the page hydrates without an error, and the styles reach it through Tailwind", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/typography");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);

  // Each element is drawn with its text style and color, read straight from the tokens.
  const [drawn, expected] = await page
    .getByRole("heading", { name: "Settings" })
    .evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.fontSize = "var(--rc-type-heading-xl-font-size)";
      probe.style.color = "var(--rc-color-fg-default)";
      document.body.append(probe);
      const style = getComputedStyle(element);
      const tokens = getComputedStyle(probe);
      const result = [
        [style.fontSize, style.color],
        [tokens.fontSize, tokens.color],
      ];
      probe.remove();
      return result;
    });
  expect(drawn).toEqual(expected);
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
    test(`the page has no accessibility violations: ${settingName(setting)}`, async ({ page }) => {
      await page.emulateMedia(setting);
      await page.goto("/typography");
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
