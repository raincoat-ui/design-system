// The Button rendered on a server by Next.js, in Chromium, checked against
// specs/components/button/spec.yaml: the HTML the server sends before any JavaScript runs,
// hydration, forms that post to Server Actions with JavaScript on and off, styles loaded through
// Tailwind CSS, touch, and axe in each of the system's color and contrast settings.
//
// The Vite app (apps/reference-web-vite) checks the Button in a single-page app: the keyboard,
// the font size, and touch in depth. These check what only a server shows.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const LONG_LABEL = "Save all of these changes and send the updated version to every reviewer";

const lastAction = (page: Page) => page.getByTestId("last-action");

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

const control = (role: string, name: string, state = {}) => ({
  role,
  name,
  focusable: true,
  disabled: false,
  busy: false,
  ...state,
});
const button = (name: string, state = {}) => control("button", name, state);

/** Disabled by the browser: out of the Tab order, and refusing every kind of activation. */
const DISABLED = { focusable: false, disabled: true };

/** The controls of the page. Only the busy Button of the Client Component changes on hydration. */
const page_controls = (sendInvite: object) => [
  button("Save changes"),
  button("Cancel"),
  button("Show details"),
  button("Delete project"),
  button("Small"),
  button("Medium"),
  button("Large"),
  button("Publish", DISABLED),
  button("Send invite", sendInvite),
  // Disabled wins: this button is not also busy.
  button("Archive", DISABLED),
  // An icon alone has no name; this one is given by the app.
  button("Delete page"),
  button("Continue"),
  button(LONG_LABEL),
  control("link", "Read the guide"),
  // Rendered by the Server Component.
  button("Save draft"),
  button("Preview"),
  // Busy and never hydrated, so it stays disabled.
  button("Send invitation", { ...DISABLED, busy: true }),
];

/** Waits until React has hydrated the Client Component: its busy button says so. */
async function hydrated(page: Page) {
  await expect(page.getByRole("button", { name: "Send invite" })).not.toHaveAttribute(
    "data-unhydrated",
  );
}

test.describe("before any JavaScript runs", () => {
  test.use({ javaScriptEnabled: false });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the server sends every control, named, with its state", async ({ page }) => {
    // Until React hydrates it, a busy button is disabled by the browser, so that nothing can
    // activate it before its click handler exists. It still reports that it is busy.
    expect(await controls(page)).toEqual(page_controls({ ...DISABLED, busy: true }));
    for (const name of ["Send invite", "Send invitation"]) {
      await expect(page.getByRole("button", { name })).toHaveAttribute("data-unhydrated", "");
    }
  });

  test("a Button submits its form only when asked, and the form posts to its Server Action", async ({
    page,
  }) => {
    // A Button is type="button" unless told otherwise, so Preview does nothing here.
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("saved")).toHaveText("Not saved yet");

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByTestId("saved")).toHaveText("Saved: Spring launch");
  });

  test("a busy Button's form cannot be sent: not by a click, and not by Enter in a field", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Send invitation" }).click({ force: true });
    await page.getByLabel("Email").press("Enter");
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("invited")).toHaveText("Nobody invited yet");
  });
});

test.describe("once React has hydrated the page", () => {
  test("hydration finds the HTML it expects, and changes only the busy button", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await hydrated(page);

    // A busy button is focusable once hydrated, and refuses activation itself.
    expect(await controls(page)).toEqual(page_controls({ disabled: true, busy: true }));
    // The busy Button rendered by the Server Component is never hydrated.
    await expect(page.getByRole("button", { name: "Send invitation" })).toHaveAttribute(
      "data-unhydrated",
      "",
    );
    expect(errors).toEqual([]);
  });

  test("a click, Enter, and Space run the action, and a busy button ignores them and keeps focus", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(lastAction(page)).toHaveText("Last action: Save changes");

    await page.getByRole("button", { name: "Cancel" }).focus();
    await page.keyboard.press("Enter");
    await expect(lastAction(page)).toHaveText("Last action: Cancel");

    await page.getByRole("button", { name: "Show details" }).focus();
    await page.keyboard.press("Space");
    await expect(lastAction(page)).toHaveText("Last action: Show details");

    const busy = page.getByRole("button", { name: "Send invite" });
    await busy.click({ force: true });
    await busy.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await expect(busy).toBeFocused();
    await expect(lastAction(page)).toHaveText("Last action: Show details");
  });

  test("the form posts to its Server Action without loading the page again", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    // A full page load would lose this.
    await page.evaluate(() => {
      (window as unknown as { stayed: boolean }).stayed = true;
    });

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByTestId("saved")).toHaveText("Not saved yet");

    await page.getByLabel("Title").fill("Autumn launch");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByTestId("saved")).toHaveText("Saved: Autumn launch");
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(
      true,
    );
  });

  test("a busy Button from a Server Component stays disabled, and its form is never sent", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);

    await expect(page.getByRole("button", { name: "Send invitation" })).toBeDisabled();
    await page.getByLabel("Email").press("Enter");
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("invited")).toHaveText("Nobody invited yet");
  });

  test("the styles reach the page through Tailwind: each variant draws its token colors", async ({
    page,
  }) => {
    await page.goto("/");
    const variants = {
      primary: "Save changes",
      secondary: "Cancel",
      ghost: "Show details",
      danger: "Delete project",
      disabled: "Publish",
    };
    for (const [variant, name] of Object.entries(variants)) {
      const [drawn, expected] = await page
        .getByRole("button", { name })
        .evaluate((element, variant) => {
          // An element colored straight from the tokens, to compare the button with.
          const probe = document.createElement("div");
          probe.style.color = `var(--rc-button-${variant}-fg)`;
          probe.style.backgroundColor =
            variant === "ghost"
              ? "transparent"
              : variant === "disabled"
                ? "var(--rc-button-disabled-bg)"
                : `var(--rc-button-${variant}-bg-default)`;
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
});

test.describe("on a phone-sized touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("the page fits the width, and a small button's touch target reaches past it", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const locator = page.getByRole("button", { name: "Delete page" });
    const small = await box(locator);
    const above = await box(page.getByTestId("small-above"));
    const below = await box(page.getByTestId("small-below"));
    // The lines directly above and below touch the visible button.
    expect(above.y + above.height).toBeCloseTo(small.y);
    expect(below.y).toBeCloseTo(small.y + small.height);

    const minimum = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--rc-button-target-minimum"),
      ),
    );
    const reach = (minimum - small.height) / 2;
    expect(reach).toBeGreaterThan(0);
    const x = small.x + small.width / 2;
    // The target's edge, found by hit testing: Chromium moves a tap near a target onto it.
    const hits = (y: number) =>
      locator.evaluate(
        (element, point) => document.elementFromPoint(point.x, point.y) === element,
        { x, y },
      );
    expect(await hits(small.y - reach + 1)).toBe(true);
    expect(await hits(small.y + small.height + reach - 1)).toBe(true);
    expect(await hits(small.y - reach - 1)).toBe(false);
    expect(await hits(small.y + small.height + reach + 1)).toBe(false);

    await page.touchscreen.tap(x, small.y - reach + 1);
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

  test("the theme, and the shadcn/ui colors it maps, follow the system's settings", async ({
    page,
  }) => {
    await page.goto("/");
    const seen = new Set<string>();
    for (const setting of SETTINGS) {
      await page.emulateMedia(setting);
      // bg-background on the body, and text-muted-foreground on a heading, which differs in
      // every setting.
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
    test(`the page has no accessibility violations: ${settingName(setting)}`, async ({ page }) => {
      await page.emulateMedia(setting);
      await page.goto("/");
      await hydrated(page);
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
