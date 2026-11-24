// The Tabs rendered on a server by Next.js, in Chromium, checked against
// specs/components/tabs/spec.yaml: the HTML the server sends before any JavaScript runs,
// hydration, the keyboard in both directions once hydrated, and axe in each of the system's color
// and contrast settings.
//
// The Vite app (apps/reference-web-vite) checks the Tabs in a single-page app in depth: the
// mouse, touch, overflow, and the font size. These check what only a server shows.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const TRANSLATED = [
  "Tổng quan",
  "Thông số kỹ thuật",
  "Đánh giá",
  "Câu hỏi thường gặp",
  "Vận chuyển",
  "Đổi trả",
];

const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error(`${locator} is not visible`);
  return found;
}

/** What Chromium gives assistive technology for the tab lists, tabs, and panels. */
async function tabsTree(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes
    .filter(
      (node) => !node.ignored && ["tablist", "tab", "tabpanel"].includes(String(node.role?.value)),
    )
    .map((node) => {
      const state = new Map((node.properties ?? []).map((p) => [p.name, p.value.value]));
      const role = String(node.role?.value);
      const name = node.name?.value;
      return role === "tab"
        ? `tab ${name}${state.get("selected") ? " (selected)" : ""}`
        : `${role} ${name}`;
    });
}

/** The tree of the page: each row's list, its tabs, and its selected tab's panel. */
const PAGE_TREE = (() => {
  const row = (list: string, tabs: string[], selectedIndex = 0) => [
    `tablist ${list}`,
    ...tabs.map((name, index) => `tab ${name}${index === selectedIndex ? " (selected)" : ""}`),
    `tabpanel ${tabs[selectedIndex]}`,
  ];
  return [
    ...row("Product", ["Details", "Reviews", "Shipping"], 1),
    // An icon alone has no name; these are given by the app.
    ...row("Layout", ["List", "Grid"]),
    ...row("Sản phẩm", TRANSLATED),
    ...row("المنتج", ["التفاصيل", "المراجعات", "الشحن"]),
  ].sort();
})();

/** Waits until React has hydrated the page: the Reviews panel then finds its link. */
async function hydrated(page: Page) {
  await expect(page.getByRole("tabpanel", { name: "Reviews" })).not.toHaveAttribute("tabindex");
}

test.describe("before any JavaScript runs", () => {
  test.use({ javaScriptEnabled: false });

  test.beforeEach(async ({ page }) => {
    await page.goto("/tabs");
  });

  test("the server sends every tab list, tab, and selected panel, named, with the selection", async ({
    page,
  }) => {
    // Chromium lists the nodes level by level, so they are compared sorted.
    expect((await tabsTree(page)).sort()).toEqual(PAGE_TREE);
    // Only the selected panels' content is sent.
    await expect(page.getByText("Made of waxed cotton")).toHaveCount(0);
    await expect(page.getByText("Rated 4 of 5")).toBeVisible();
    // Until a script finds the link in it, the panel takes focus itself, so that its content
    // can be reached either way.
    await expect(page.getByRole("tabpanel", { name: "Reviews" })).toHaveAttribute("tabindex", "0");
  });

  test("the tabs keep the page's direction: the first tab is on the right in a right-to-left page", async ({
    page,
  }) => {
    const first = await box(tab(page, "التفاصيل"));
    const second = await box(tab(page, "المراجعات"));
    expect(first.x).toBeGreaterThan(second.x);
    // The selected tab's indicator is drawn by the stylesheet alone.
    const indicator = await tab(page, "التفاصيل").evaluate(
      (element) => getComputedStyle(element, "::after").backgroundColor,
    );
    expect(indicator).not.toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("once React has hydrated the page", () => {
  test("hydration finds the HTML it expects, and the tree is the same", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/tabs");
    await hydrated(page);
    expect((await tabsTree(page)).sort()).toEqual(PAGE_TREE);
    expect(errors).toEqual([]);
  });

  test("the arrow keys select, Tab goes to the panel's link, and right to left the keys swap", async ({
    page,
  }) => {
    await page.goto("/tabs");
    await hydrated(page);

    await page.keyboard.press("Tab");
    await expect(tab(page, "Reviews")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Shipping")).toBeFocused();
    await expect(tab(page, "Shipping")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Shipping" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "Reviews")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Read the reviews" })).toBeFocused();

    await tab(page, "التفاصيل").click();
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "المراجعات")).toBeFocused();
    await expect(tab(page, "المراجعات")).toHaveAttribute("aria-selected", "true");
  });

  test("the styles reach the page through Tailwind: tabs draw their token colors", async ({
    page,
  }) => {
    await page.goto("/tabs");
    const colors = await tab(page, "Reviews").evaluate((element) => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const read = (value: string) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      };
      const result = {
        drawn: [
          getComputedStyle(element).color,
          getComputedStyle(element, "::after").backgroundColor,
        ],
        expected: [read("var(--rc-tabs-fg-selected)"), read("var(--rc-tabs-indicator-color)")],
      };
      probe.remove();
      return result;
    });
    expect(colors.drawn).toEqual(colors.expected);
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
    test(`the page has no accessibility violations: ${settingName(setting)}`, async ({ page }) => {
      await page.emulateMedia(setting);
      await page.goto("/tabs");
      await hydrated(page);
      // The overflowing row's scroll buttons are drawn once it has been measured.
      await expect(page.locator('[data-slot="tabs-scroll-button"]').first()).toBeAttached();
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
