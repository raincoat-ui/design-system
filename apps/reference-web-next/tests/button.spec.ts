// The Button rendered by a Next.js server, in Chromium, checked against
// specs/components/button/spec.yaml: what the server sends before any JavaScript runs, the page
// with JavaScript turned off, hydration, and the styles of the Tailwind CSS path in the package's
// README.
//
// The Vite app's tests cover the rest of what a browser makes of the Button: touch, the
// person's font size, and the order of keyboard focus. These check what only a server shows.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type * as Axe from "axe-core";

const LONG_LABEL = "Save all of these changes and send the updated version to every reviewer";

const lastAction = (page: Page) => page.getByTestId("last-action");

/** Resolves once React has hydrated the page: the Client Component marks itself. */
const hydrated = (page: Page) =>
  expect(page.locator("[data-hydrated]")).toHaveAttribute("data-hydrated", "true");

/** Every element with this tag name in a piece of HTML, in order: its attributes and its text. */
function elements(html: string, tag: string) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "g"))].map(
    ([, attributes = "", content = ""]) => ({
      attributes: new Map(
        [...attributes.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map(([, name = "", value = ""]) => [
          name,
          value,
        ]),
      ),
      text: content.replace(/<[^>]*>/g, "").trim(),
    }),
  );
}

/** What Chromium gives assistive technology for each button and link, in document order. */
async function controls(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  // Chromium lists the nodes roughly by depth, so walk the tree for the order a reader meets them.
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const ordered: typeof nodes = [];
  const visit = (node: (typeof nodes)[number] | undefined) => {
    if (!node) return;
    ordered.push(node);
    for (const id of node.childIds ?? []) visit(byId.get(id));
  };
  visit(nodes.find((node) => node.parentId === undefined));
  return ordered
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

/** Every control on the page, as assistive technology should be given it. */
const CONTROLS = [
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
];

/** Each variant's colors, as the page draws them and as its tokens define them. */
async function variantColors(page: Page) {
  const variants = {
    primary: "Save changes",
    secondary: "Cancel",
    ghost: "Show details",
    danger: "Delete project",
  };
  const result: Record<string, unknown> = {};
  for (const [variant, name] of Object.entries(variants)) {
    result[variant] = await page.getByRole("button", { name }).evaluate((element, variant) => {
      // An element colored straight from the tokens, to compare the button with.
      const probe = document.createElement("div");
      probe.style.color = `var(--rc-button-${variant}-fg)`;
      probe.style.backgroundColor =
        variant === "ghost" ? "transparent" : `var(--rc-button-${variant}-bg-default)`;
      document.body.append(probe);
      const style = getComputedStyle(element);
      const tokens = getComputedStyle(probe);
      const colors = {
        drawn: [style.color, style.backgroundColor],
        tokens: [tokens.color, tokens.backgroundColor],
      };
      probe.remove();
      return colors;
    }, variant);
  }
  return result;
}

test("the server sends every button in the page's HTML, with its state and its styles", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

  const buttons = elements(main, "button");
  const button = (name: string, variant: string, state = {}) => ({
    name,
    variant,
    size: "md",
    type: "submit",
    disabled: false,
    busy: false,
    ...state,
  });
  expect(
    buttons.map(({ attributes: a, text }) => ({
      name: a.get("aria-label") ?? text,
      variant: a.get("data-variant"),
      size: a.get("data-size"),
      type: a.get("type"),
      disabled: a.has("disabled"),
      busy: a.get("aria-busy") === "true",
    })),
  ).toEqual([
    button("Save changes", "primary"),
    button("Cancel", "secondary"),
    button("Show details", "ghost"),
    button("Delete project", "danger"),
    button("Small", "primary", { size: "sm" }),
    button("Medium", "primary"),
    button("Large", "primary", { size: "lg" }),
    button("Publish", "primary", { disabled: true }),
    // The Client Component's buttons are in the HTML too: the server renders them as well.
    button("Send invite", "primary", { busy: true }),
    button("Archive", "secondary", { disabled: true }),
    button("Delete page", "secondary", { size: "sm" }),
    button("Continue", "primary"),
    button(LONG_LABEL, "secondary"),
  ]);

  // Each button carries the class names of its token styles, and the page links the stylesheet.
  expect(buttons[0]?.attributes.get("class")).toContain("bg-(--rc-button-primary-bg-default)");
  expect(buttons[3]?.attributes.get("class")).toContain("bg-(--rc-button-danger-bg-default)");
  expect(html).toMatch(/<link rel="stylesheet" href="[^"]+\.css"/);

  // The link is a link, styled as a button.
  const links = elements(main, "a").map(({ attributes: a, text }) => ({
    text,
    href: a.get("href"),
    slot: a.get("data-slot"),
  }));
  expect(links).toEqual([{ text: "Read the guide", href: "#guide", slot: "button" }]);

  // The form posts to the Server Action, so it works before the page is hydrated.
  expect(main).toMatch(/<form [^>]*method="POST"/);
  expect(main).toContain("Last action: <!-- -->Nothing yet");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("each control is a button named by its label, with its state, and the link is a link", async ({
    page,
  }) => {
    expect(await controls(page)).toEqual(CONTROLS);
  });

  test("each variant draws its token colors", async ({ page }) => {
    for (const [variant, { drawn, tokens }] of Object.entries(
      (await variantColors(page)) as Record<string, { drawn: string[]; tokens: string[] }>,
    )) {
      expect(drawn, `${variant} button`).toEqual(tokens);
    }
  });

  test("a button submits the form to the Server Action, and the page shows that it ran", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\?last=Save%20changes$/);
    await expect(lastAction(page)).toHaveText("Last action: Save changes");

    // A button that is only an icon submits as itself too.
    await page.getByRole("button", { name: "Delete page" }).click();
    await expect(lastAction(page)).toHaveText("Last action: Delete page");
  });
});

test.describe("with JavaScript", () => {
  test("React hydrates the server's HTML without an error or a warning", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) messages.push(message.text());
    });
    page.on("pageerror", (error) => messages.push(error.message));
    await page.goto("/");
    await hydrated(page);
    expect(messages).toEqual([]);
    // Hydration changes nothing that assistive technology is given.
    expect(await controls(page)).toEqual(CONTROLS);
  });

  test("a click, Enter, and Space run the Server Action without reloading the page", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);
    // A full page load would lose this.
    await page.evaluate(() => {
      (window as unknown as { stayed: boolean }).stayed = true;
    });
    // Each call of the Server Action is a POST to the server.
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(lastAction(page)).toHaveText("Last action: Save changes");

    await page.getByRole("button", { name: "Cancel" }).focus();
    await page.keyboard.press("Enter");
    await expect(lastAction(page)).toHaveText("Last action: Cancel");

    await page.getByRole("button", { name: "Show details" }).focus();
    await page.keyboard.press("Space");
    await expect(lastAction(page)).toHaveText("Last action: Show details");

    expect(posts).toHaveLength(3);
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(
      true,
    );
  });

  test("a disabled or busy button does not submit the form, and a busy one keeps focus", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);
    // Calling the Server Action is a request to the server, which would be seen here.
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });

    // At the button's center: Playwright itself will not click a button that says it is
    // unavailable.
    for (const name of ["Publish", "Send invite", "Archive"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      if (!box) throw new Error(`${name} is not visible`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    const busy = page.getByRole("button", { name: "Send invite" });
    await busy.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    await expect(busy).toBeFocused();
    expect(posts).toEqual([]);
    await expect(lastAction(page)).toHaveText("Last action: Nothing yet");
  });

  test("each variant draws its token colors", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    for (const [variant, { drawn, tokens }] of Object.entries(
      (await variantColors(page)) as Record<string, { drawn: string[]; tokens: string[] }>,
    )) {
      expect(drawn, `${variant} button`).toEqual(tokens);
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

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
  });

  test("the page's own colors follow the theme through the shadcn/ui names", async ({ page }) => {
    const seen = new Set<string>();
    for (const setting of SETTINGS) {
      await page.emulateMedia(setting);
      // bg-background on the body and text-muted-foreground on a heading, against the tokens
      // that @raincoat-ui/react/tailwind.css maps them to.
      const [drawn, tokens] = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.backgroundColor = "var(--rc-color-bg-canvas)";
        probe.style.color = "var(--rc-color-fg-muted)";
        document.body.append(probe);
        const heading = document.querySelector("h2") as Element;
        const result = [
          [getComputedStyle(document.body).backgroundColor, getComputedStyle(heading).color],
          [getComputedStyle(probe).backgroundColor, getComputedStyle(probe).color],
        ];
        probe.remove();
        return result;
      });
      expect(drawn, settingName(setting)).toEqual(tokens);
      seen.add(String(drawn));
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
