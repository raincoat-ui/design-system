// The Tabs in a built app, in Chromium, checked against specs/components/tabs/spec.yaml: what
// assistive technology is told, the keyboard in both directions, the mouse and touch, an
// overflowing translated row, the person's font size, and axe in each of the system's color and
// contrast settings.
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

const selected = (page: Page) => page.getByTestId("selected");
const focused = (page: Page) => page.locator(":focus");
const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });

/** Waits until the browser has drawn a frame, so that the effects of earlier input are seen. */
const nextFrame = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error(`${locator} is not visible`);
  return found;
}

/** Whether the tab lies wholly inside the visible part of its scrolling list. */
const shownInList = (locator: Locator) =>
  locator.evaluate((element) => {
    const list = element.closest('[role="tablist"]') as Element;
    const outer = list.getBoundingClientRect();
    const inner = element.getBoundingClientRect();
    return inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5;
  });

/** What Chromium gives assistive technology for the tab lists, tabs, and panels, in order. */
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

test.beforeEach(async ({ page }) => {
  await page.goto("/tabs");
});

test("each row is a tab list of tabs named by their labels, with the selected one marked, and the panel named by its tab", async ({
  page,
}) => {
  const row = (list: string, tabs: string[], selectedIndex = 0) => [
    `tablist ${list}`,
    ...tabs.map((name, index) => `tab ${name}${index === selectedIndex ? " (selected)" : ""}`),
    `tabpanel ${tabs[selectedIndex]}`,
  ];
  // Chromium lists the nodes of the tree level by level, so they are compared sorted; the order
  // of the tabs is checked below.
  const expected = [
    ...row("Product", ["Details", "Reviews", "Shipping"]),
    ...row("Media", ["Photos", "Videos", "Files"]),
    // An icon alone has no name; these are given by the app.
    ...row("Layout", ["List", "Grid"]),
    ...row("Sản phẩm", TRANSLATED),
    ...row("المنتج", ["التفاصيل", "المراجعات", "الشحن"]),
    ...row("Order", ["Note", "History"]),
  ];
  expect((await tabsTree(page)).sort()).toEqual(expected.sort());
  const order = await page
    .getByRole("tablist", { name: "Product" })
    .getByRole("tab")
    .evaluateAll((tabs) => tabs.map((t) => t.textContent));
  expect(order).toEqual(["Details", "Reviews", "Shipping"]);
});

test("the styles reach the page through the build: tabs draw their token colors", async ({
  page,
}) => {
  const drawn = (name: string, pseudo?: string) =>
    tab(page, name).evaluate((element, pseudo) => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const read = (value: string) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      };
      const style = getComputedStyle(element, pseudo);
      const result = {
        color: style.color,
        indicator: getComputedStyle(element, "::after").backgroundColor,
        expected: {
          selected: read("var(--rc-tabs-fg-selected)"),
          rest: read("var(--rc-tabs-fg-default)"),
          indicator: read("var(--rc-tabs-indicator-color)"),
        },
      };
      probe.remove();
      return result;
    }, pseudo);
  const details = await drawn("Details");
  expect(details.color).toBe(details.expected.selected);
  expect(details.indicator).toBe(details.expected.indicator);
  const reviews = await drawn("Reviews");
  expect(reviews.color).toBe(reviews.expected.rest);
  expect(reviews.indicator).toBe("rgba(0, 0, 0, 0)");
});

test("a click selects a tab and shows its panel in place of the other", async ({ page }) => {
  await tab(page, "Reviews").click();
  await expect(selected(page)).toHaveText("Selected: reviews");
  await expect(page.getByRole("tabpanel", { name: "Reviews" })).toContainText("Rated 4 of 5");
  await expect(page.getByText("Made of waxed cotton")).toHaveCount(0);
});

test("the arrow keys move and select, wrapping at the ends, Home and End go to the ends, and Tab leaves for the panel", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(focused(page)).toHaveAccessibleName("Details");
  const moves: [string, string][] = [
    ["ArrowRight", "reviews"],
    ["End", "shipping"],
    ["ArrowRight", "details"],
    ["ArrowLeft", "shipping"],
    ["Home", "details"],
  ];
  for (const [key, value] of moves) {
    await page.keyboard.press(key);
    await expect(selected(page)).toHaveText(`Selected: ${value}`);
  }
  // The Details panel has nothing focusable, so it takes focus itself.
  await page.keyboard.press("Tab");
  await expect(focused(page)).toHaveRole("tabpanel");
  await expect(focused(page)).toHaveAccessibleName("Details");

  // The Reviews panel has a link, so Tab goes to the link and the panel is not a stop.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Reviews")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(focused(page)).toHaveAccessibleName("Read the reviews");
});

test("right to left, Left moves to the next tab and the first tab is on the right", async ({
  page,
}) => {
  const first = await box(tab(page, "التفاصيل"));
  const second = await box(tab(page, "المراجعات"));
  expect(first.x).toBeGreaterThan(second.x);

  await tab(page, "التفاصيل").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "المراجعات")).toBeFocused();
  await expect(tab(page, "المراجعات")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "التفاصيل")).toHaveAttribute("aria-selected", "true");
});

test("in manual mode the arrow keys only move focus and Enter selects, and a kept panel keeps what was typed", async ({
  page,
}) => {
  await page.getByLabel("Note for the courier").fill("Leave at the door");
  await tab(page, "Note").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "History")).toBeFocused();
  await expect(tab(page, "History")).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("Enter");
  await expect(tab(page, "History")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Note for the courier")).toBeHidden();

  await tab(page, "Note").click();
  await expect(page.getByLabel("Note for the courier")).toHaveValue("Leave at the door");
});

test("with a mouse, the overflowing row has scroll buttons that page it, hidden from assistive technology and the Tab order", async ({
  page,
}) => {
  const list = page.getByTestId("translated");
  const frame = list.locator("xpath=..");
  const buttons = frame.locator('[data-slot="tabs-scroll-button"]');
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) {
    await expect(button).toHaveAttribute("aria-hidden", "true");
    await expect(button).toHaveAttribute("tabindex", "-1");
  }
  const end = buttons.last();
  const last = tab(page, TRANSLATED[TRANSLATED.length - 1] as string);
  expect(await shownInList(last)).toBe(false);
  for (let page_ = 0; page_ < TRANSLATED.length && !(await shownInList(last)); page_++) {
    await end.click();
    await nextFrame(page);
  }
  expect(await shownInList(last)).toBe(true);
  // A click on a scroll button does not take focus.
  await expect(end).not.toBeFocused();
  await last.click();
  await expect(last).toHaveAttribute("aria-selected", "true");
});

test("tabs grow with the person's font size, and no label is cut off or wrapped", async ({
  page,
}) => {
  const details = tab(page, "Details");
  const fontSize = () =>
    details.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  const before = { size: await fontSize(), box: await box(details) };
  // The browser's font size setting, at twice its default of 16px.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await nextFrame(page);
  const after = { size: await fontSize(), box: await box(details) };
  expect(after.size).toBeCloseTo(before.size * 2);
  expect(after.box.width).toBeGreaterThan(before.box.width);
  expect(after.box.height).toBeGreaterThan(before.box.height);

  const problems = await page
    .getByRole("tab")
    .evaluateAll((tabs) =>
      tabs
        .filter((t) => t.scrollWidth > t.clientWidth || t.scrollHeight > t.clientHeight)
        .map((t) => t.getAttribute("aria-label") ?? t.textContent),
    );
  expect(problems).toEqual([]);
  // One line: every tab of a row is as tall as the others.
  const heights = await page
    .getByTestId("translated")
    .getByRole("tab")
    .evaluateAll(
      (tabs) => new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().height))).size,
    );
  expect(heights).toBe(1);
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("the screen fits the width, the overflowing row scrolls with no buttons, and a tap selects", async ({
    page,
  }) => {
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const list = page.getByTestId("translated");
    const buttons = list.locator("xpath=..").locator('[data-slot="tabs-scroll-button"]');
    for (const button of await buttons.all()) await expect(button).toBeHidden();

    const last = tab(page, TRANSLATED[TRANSLATED.length - 1] as string);
    await list.scrollIntoViewIfNeeded();
    expect(await shownInList(last)).toBe(false);
    // A swipe across the row, as a wheel turned sideways.
    const row = await box(list);
    await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
    for (let turn = 0; turn < 10 && !(await shownInList(last)); turn++) {
      await page.mouse.wheel(200, 0);
      await nextFrame(page);
    }
    expect(await shownInList(last)).toBe(true);
    await last.tap();
    await expect(last).toHaveAttribute("aria-selected", "true");
  });

  test("every tab's touch target is at least the minimum", async ({ page }) => {
    const minimum = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--rc-tabs-target-minimum"),
      ),
    );
    for (const name of ["Details", "Photos", "List", "Grid", "التفاصيل", "Note"]) {
      const target = tab(page, name);
      await target.scrollIntoViewIfNeeded();
      const found = await box(target);
      expect(found.height, name).toBeGreaterThanOrEqual(minimum - 0.5);
      expect(found.width, name).toBeGreaterThanOrEqual(minimum - 0.5);
    }
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
