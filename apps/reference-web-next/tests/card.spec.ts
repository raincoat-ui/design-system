// The Card rendered by a Server Component in Next.js, in Chromium, checked against
// specs/components/card/spec.yaml: what the server sends works with JavaScript off, each card's
// role and name, hydration, the styles loaded through Tailwind CSS, and axe in each of the
// system's color and contrast settings.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const LONG_TITLE = "Your order of three linen shirts and a wool scarf is on its way";

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

// Chromium lists the tree's nodes in an order of its own, so the lists are compared sorted.
const sorted = (entries: (string | number | undefined)[][]) =>
  entries.map((entry) => entry.join(" ")).sort();

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the server sends each card with its title and name, and a link card follows its link", async ({
    page,
  }) => {
    await page.goto("/card");
    const tree = await accessibilityTree(page);
    expect(
      sorted(
        tree
          .filter(({ role }) => ["link", "button"].includes(role))
          .map(({ role, name }) => [role, name]),
      ),
    ).toEqual(
      sorted([
        ["link", "Order 1042"],
        ["link", LONG_TITLE],
        ["button", "Start a return"],
        ["link", "Summer trip"],
        ["link", "Open album"],
      ]),
    );
    expect(
      sorted(tree.filter(({ role }) => role === "heading").map(({ name, level }) => [level, name])),
    ).toEqual(
      sorted([
        [1, "Orders"],
        [2, "Recent orders"],
        [3, "Order 1042"],
        [3, LONG_TITLE],
        [3, "Start a return"],
        [2, "Your account"],
        [3, "Summer trip"],
      ]),
    );

    // A click on the card's body, away from its title, follows the link: no script needed.
    const card = page.getByTestId("order-1042");
    const box = await card.boundingBox();
    if (!box) throw new Error("the card is not visible");
    await card.click({ position: { x: box.width / 2, y: box.height - 12 } });
    await expect(page).toHaveURL(/#order-1042$/);
  });
});

test("the page hydrates without an error, and a click anywhere on the button card runs it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/card");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);

  const card = page.getByTestId("return");
  const box = await card.boundingBox();
  if (!box) throw new Error("the card is not visible");
  // Once hydrated, the button has its handler: a click in the corner of the card runs it.
  await expect(async () => {
    await card.click({ position: { x: box.width - 4, y: box.height - 4 } });
    await expect(page.getByTestId("returns")).toContainText("Returns started:", { timeout: 500 });
  }).toPass();
  await page.getByRole("button", { name: "Start a return" }).focus();
  const before = await page.getByTestId("returns").textContent();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("returns")).not.toHaveText(before ?? "");
});

test("the styles reach the page through Tailwind: each card is drawn with the card tokens", async ({
  page,
}) => {
  await page.goto("/card");
  const [drawn, expected] = await page.getByTestId("order-1042").evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--rc-card-bg-default)";
    probe.style.borderColor = "var(--rc-card-border-default)";
    probe.style.borderRadius = "var(--rc-card-radius)";
    probe.style.padding = "var(--rc-card-padding)";
    document.body.append(probe);
    const style = getComputedStyle(element);
    const tokens = getComputedStyle(probe);
    const result = [
      [style.backgroundColor, style.borderTopColor, style.borderTopLeftRadius, style.paddingTop],
      [
        tokens.backgroundColor,
        tokens.borderTopColor,
        tokens.borderTopLeftRadius,
        tokens.paddingTop,
      ],
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
      await page.goto("/card");
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
      expect(result.passes).toEqual(
        expect.arrayContaining(["heading-order", "color-contrast", "list", "svg-img-alt"]),
      );
    });
  }
});
