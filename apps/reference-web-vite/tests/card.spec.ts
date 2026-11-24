// The Card in a built app, in Chromium, checked against specs/components/card/spec.yaml: the role
// and name Chromium gives each card, the outline of headings and the lists, the keyboard, the
// mouse, touch, text on the pressed fill, the person's font size, and axe in each of the system's
// color and contrast settings.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const LONG_TITLE = "Your order of three linen shirts and a wool scarf is on its way";

const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const lastAction = (page: Page) => page.getByTestId("last-action");

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error(`${locator} is not visible`);
  return found;
}

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

/** Runs axe on the page, or on part of it, and returns the violations and the rules that passed. */
async function audit(
  page: Page,
  { selector = "html", enhanced = false, only = undefined as string[] | undefined } = {},
) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(
    async ({ selector, enhanced, only }) => {
      const { axe } = window as unknown as { axe: typeof Axe };
      const results = await axe.run(document.querySelector(selector) as Element, {
        runOnly: only ?? ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
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
    },
    { selector, enhanced, only },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/card");
});

test("each interactive card is a link or a button named by its title alone, in a list", async ({
  page,
}) => {
  const tree = await accessibilityTree(page);
  // Chromium lists the tree's nodes in an order of its own, so the lists are compared sorted;
  // the order of the page is the Tab order, tested below.
  const sorted = (entries: (string | number | undefined)[][]) =>
    entries.map((entry) => entry.join(" ")).sort();
  const controls = tree
    .filter(({ role }) => ["link", "button"].includes(role))
    .map(({ role, name }) => [role, name]);
  expect(sorted(controls)).toEqual(
    sorted([
      ["link", "Order 1042"],
      ["link", LONG_TITLE],
      ["button", "Start a return"],
      // The static cards: a Button in a footer, and a link in a title with Buttons after it.
      ["button", "Manage storage"],
      ["link", "Summer trip"],
      ["button", "Share"],
      ["button", "Open album"],
    ]),
  );
  const headings = tree
    .filter(({ role }) => role === "heading")
    .map(({ name, level }) => [level, name]);
  expect(sorted(headings)).toEqual(
    sorted([
      [1, "Orders"],
      [2, "Recent orders"],
      [3, "Order 1042"],
      [3, LONG_TITLE],
      [3, "Start a return"],
      [2, "Your account"],
      [3, "Storage"],
      [3, "Summer trip"],
    ]),
  );
  // A screen reader says how many cards a list has.
  await expect(page.getByTestId("orders").getByRole("listitem")).toHaveCount(3);
});

test("each interactive card is one Tab stop; a static card's links and buttons are stops of their own", async ({
  page,
}) => {
  const order = [
    "Order 1042",
    LONG_TITLE,
    "Start a return",
    "Manage storage",
    "Summer trip",
    "Share",
    "Open album",
  ];
  const reached: string[] = [];
  for (const _ of order) {
    await page.keyboard.press("Tab");
    reached.push(await page.evaluate(() => document.activeElement?.textContent ?? ""));
  }
  expect(reached).toEqual(order);
});

test("Enter follows a link card, and Enter and Space activate a button card", async ({ page }) => {
  await page.getByRole("link", { name: "Order 1042" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#order-1042$/);

  for (const key of ["Enter", "Space"]) {
    await page.goto("/card");
    await expect(lastAction(page)).toHaveText("Last action: Nothing yet");
    await page.getByRole("button", { name: "Start a return" }).focus();
    await page.keyboard.press(key);
    await expect(lastAction(page), key).toHaveText("Last action: Start a return");
  }
});

test("a click anywhere on an interactive card activates it", async ({ page }) => {
  const card = page.getByTestId("order-1042");
  const { width, height } = await box(card);
  // On the media, then in the corner of the padding.
  await card.click({ position: { x: width / 2, y: 20 } });
  await expect(page).toHaveURL(/#order-1042$/);
  await page.goto("/card");
  await page.getByTestId("return").click({ position: { x: width - 4, y: height - 4 } });
  await expect(lastAction(page)).toHaveText("Last action: Start a return");
});

test("keyboard focus draws the ring around the whole card, and the pointer's hover changes its outline", async ({
  page,
}) => {
  const card = page.getByTestId("order-1042");
  const style = () =>
    card.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { outline: computed.outlineStyle, border: computed.borderTopColor };
    });
  const tokens = await page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    probe.style.borderColor = "var(--rc-card-border-default)";
    const rest = getComputedStyle(probe).borderTopColor;
    probe.style.borderColor = "var(--rc-card-border-hover)";
    const hover = getComputedStyle(probe).borderTopColor;
    probe.remove();
    return { rest, hover };
  });

  expect(await style()).toEqual({ outline: "none", border: tokens.rest });
  await page.keyboard.press("Tab");
  await expect.poll(async () => (await style()).outline).toBe("solid");

  await page.mouse.move(0, 0);
  await card.hover();
  await expect.poll(async () => (await style()).border).toBe(tokens.hover);
});

test("text on an interactive card keeps its contrast while the card is pressed", async ({
  page,
}) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    const card = page.getByTestId("order-1042");
    const { x, y, width, height } = await box(card);
    await page.mouse.move(x + width / 2, y + height - 12);
    await page.mouse.down();
    const pressed = await card.evaluate((element) => {
      const probe = document.createElement("div");
      document.body.append(probe);
      probe.style.backgroundColor = "var(--rc-card-bg-pressed)";
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return getComputedStyle(element).backgroundColor === expected;
    });
    expect(pressed, `pressed fill in ${scheme}`).toBe(true);
    const result = await audit(page, {
      selector: '[data-testid="order-1042"]',
      only: ["color-contrast"],
    });
    await page.mouse.up();
    expect(result.violations, scheme).toEqual([]);
    expect(result.passes).toContain("color-contrast");
    await page.goto("/card");
  }
});

test("text grows with the person's font size, cards grow with it, and nothing is cut off", async ({
  page,
}) => {
  const heights = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-slot="card"]')].map(
        (card) => card.getBoundingClientRect().height,
      ),
    );
  const before = await heights();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const after = await heights();
  for (const [index, height] of after.entries()) {
    expect(height).toBeGreaterThan(before[index] ?? 0);
  }
  // Every title and paragraph is inside its card, and the page does not scroll sideways.
  const outside = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="card"]')].flatMap((card) => {
      const edge = card.getBoundingClientRect();
      return [...card.querySelectorAll('[data-slot="card-title"], p')]
        .filter((part) => {
          const rect = part.getBoundingClientRect();
          return rect.left < edge.left || rect.right > edge.right || rect.bottom > edge.bottom;
        })
        .map((part) => part.textContent);
    }),
  );
  expect(outside).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("cards fill the width, the long title wraps, and a tap anywhere on a card activates it", async ({
    page,
  }) => {
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const list = await box(page.getByTestId("orders"));
    const card = await box(page.getByTestId("order-1042"));
    expect(card.width).toBeCloseTo(list.width, 0);
    const title = page.getByRole("heading", { name: LONG_TITLE });
    const lineHeight = await title.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).lineHeight),
    );
    expect((await box(title)).height).toBeGreaterThan(1.5 * lineHeight);

    const target = await box(page.getByTestId("return"));
    await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height - 8);
    await expect(lastAction(page)).toHaveText("Last action: Start a return");
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

  for (const setting of SETTINGS) {
    test(`the screen has no accessibility violations: ${settingName(setting)}`, async ({
      page,
    }) => {
      await page.emulateMedia(setting);
      const result = await audit(page, { enhanced: setting.contrast === "more" });
      expect(result.violations).toEqual([]);
      expect(result.passes).toEqual(
        expect.arrayContaining(["heading-order", "color-contrast", "list", "svg-img-alt"]),
      );
    });
  }
});
