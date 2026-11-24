// The Tabs' tests, written against specs/components/tabs/spec.yaml. They run once for each way
// an app can load the styles: see the two files that call describeTabs.
//
// Expected colors and sizes come from the token source (expected-tokens.js), not from the
// stylesheet, so each comparison covers the whole path from a token to what the browser draws.
import axe from "axe-core";
import { createRef, type ReactElement, type ReactNode, useState } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  inject,
  type TestContext,
  test,
  vi,
} from "vitest";
import { cdp, commands, type Locator, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  TABS_ACTIVATION_MODES,
  Tabs,
  TabsContent,
  TabsList,
  type TabsProps,
  TabsTrigger,
} from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
const DIRECTIONS = ["ltr", "rtl"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];
type Direction = (typeof DIRECTIONS)[number];

const TRANSPARENT = "rgba(0, 0, 0, 0)";
const STAGE_PADDING = 24;
/** More tabs than fit a phone-sized stage. */
const MANY = [
  "Overview",
  "Specifications",
  "Reviews",
  "Questions and answers",
  "Shipping",
  "Returns",
  "Warranty",
];
const NARROW = 360;

const expected = inject("tokens");

function token(id: string, mode: Mode = "light", density: Density = "comfortable") {
  const value = expected[`${mode}/${density}`]?.[id];
  if (value === undefined) throw new Error(`no expected value for ${id} in ${mode}/${density}`);
  return value;
}
/** A color token as the browser reports it: "rgb(247, 210, 42)". */
const color = (id: string, mode?: Mode) => String(token(id, mode));
/** A dimension token in CSS pixels, or a duration token in seconds. */
const number = (id: string, density?: Density) => Number(token(id, "light", density));

/** A themed surface for the component under test, as an app would provide. */
function Stage({
  mode = "light",
  density,
  dir,
  width,
  children,
}: {
  mode?: Mode;
  density?: Density;
  dir?: Direction;
  width?: number;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="stage"
      data-theme={mode}
      data-density={density}
      dir={dir}
      style={{
        background: "var(--rc-color-bg-canvas)",
        color: "var(--rc-color-fg-default)",
        boxSizing: "border-box",
        padding: STAGE_PADDING,
        width,
      }}
    >
      {children}
    </div>
  );
}

function Dot({ id }: { id?: string }) {
  return (
    <svg data-testid={id} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  );
}

const tabValue = (label: string) => label.toLowerCase().replaceAll(" ", "-");

/**
 * A product's details, reviews, and shipping. The reviews panel holds a link; the others hold
 * only text.
 */
function Product(props: Partial<TabsProps> & { keepMounted?: boolean; icons?: boolean }) {
  const { keepMounted, icons, ...tabs } = props;
  return (
    <Tabs defaultValue="details" {...tabs}>
      <TabsList aria-label="Product">
        <TabsTrigger value="details" leadingIcon={icons && <Dot id="details-icon" />}>
          Details
        </TabsTrigger>
        <TabsTrigger value="reviews" leadingIcon={icons && <Dot />}>
          Reviews
        </TabsTrigger>
        <TabsTrigger value="shipping" leadingIcon={icons && <Dot />}>
          Shipping
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" keepMounted={keepMounted}>
        <label>
          Note <input aria-label="Note" defaultValue="" />
        </label>
      </TabsContent>
      <TabsContent value="reviews" keepMounted={keepMounted}>
        Rated 4 of 5. <a href="#all-reviews">Read all reviews</a>
      </TabsContent>
      <TabsContent value="shipping" keepMounted={keepMounted}>
        Ships in two days.
      </TabsContent>
    </Tabs>
  );
}

/** More tabs than fit a narrow stage, each with a panel of text. */
function Many(props: Partial<TabsProps>) {
  return (
    <Tabs defaultValue={tabValue(MANY[0] as string)} {...props}>
      <TabsList aria-label="Product">
        {MANY.map((label) => (
          <TabsTrigger key={label} value={tabValue(label)}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {MANY.map((label) => (
        <TabsContent key={label} value={tabValue(label)}>
          {`About ${label.toLowerCase()}.`}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** A panel whose only link comes and goes. Its button is not a Tab stop. */
function ChangingPanel() {
  const [withLink, setWithLink] = useState(false);
  return (
    <Tabs defaultValue="a">
      <TabsList aria-label="Sections">
        <TabsTrigger value="a">First</TabsTrigger>
      </TabsList>
      <TabsContent value="a">
        <button type="button" onClick={() => setWithLink(!withLink)} tabIndex={-1}>
          Toggle
        </button>
        {withLink && <a href="#more">More</a>}
      </TabsContent>
    </Tabs>
  );
}

/** Many tabs whose selection the app controls, and a button that selects the last one. */
function ControlledMany() {
  const [value, setValue] = useState("overview");
  return (
    <>
      <button type="button" onClick={() => setValue("warranty")}>
        Show the warranty
      </button>
      <Many value={value} onValueChange={setValue} />
    </>
  );
}

/** Undoes what serverRender set up. Run after each test that uses it. */
const serverRendered: (() => void)[] = [];

/**
 * Puts the HTML that React renders on a server into the page, as a browser receives it, and
 * runs none of the component's JavaScript. `hydrate` then lets React take the HTML over, and
 * returns the errors React reports while it does.
 */
function serverRender(ui: ReactElement) {
  const container = document.createElement("div");
  container.innerHTML = renderToString(ui);
  document.body.append(container);
  let root: Root | undefined;
  serverRendered.push(() => {
    root?.unmount();
    container.remove();
  });
  return {
    container,
    screen: page.elementLocator(container),
    hydrate() {
      const errors: unknown[] = [];
      const logged = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
      serverRendered.push(() => logged.mockRestore());
      root = hydrateRoot(container, ui, { onRecoverableError: (error) => errors.push(error) });
      return errors;
    },
  };
}

const computed = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);
const pixels = (value: string) => Number.parseFloat(value);
const settle = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const rect = (locator: Locator) => locator.element().getBoundingClientRect();

/** Moves the pointer off every tab, so one test's hover cannot carry into the next. */
const parkPointer = () => commands.movePointerAway();

type Media = Parameters<typeof commands.emulateMedia>[0];
/** Runs with a system setting emulated, such as `{ reducedMotion: "reduce" }`. */
async function withMedia(media: Media, run: () => Promise<void>) {
  await commands.emulateMedia(media);
  try {
    await run();
  } finally {
    await commands.emulateMedia(Object.fromEntries(Object.keys(media).map((name) => [name, null])));
  }
}

/**
 * Runs with a touch screen. Chromium alone can turn one on in a page that is already open;
 * Firefox and WebKit take it only when the browser starts, which would make every test a touch
 * test, so the test is skipped there.
 */
async function withTouch(context: TestContext, run: () => Promise<void>) {
  context.skip(server.browser !== "chromium", "touch emulation needs Chromium");
  await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  try {
    expect(matchMedia("(pointer: coarse)").matches).toBe(true);
    await run();
  } finally {
    await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
  }
}

/** Whether the element lies wholly inside the visible part of the scrolling list. */
function shownInList(element: Element) {
  const list = element.closest('[role="tablist"]') as Element;
  const outer = list.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  return inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5;
}

const selectedTab = (screen: { getByRole: Locator["getByRole"] }) =>
  screen.getByRole("tab", { selected: true });

/**
 * The text of each panel whose content is rendered. A panel that is not selected is still an
 * element, so that its tab can point at it, but it is hidden and empty.
 */
function renderedPanels(container: Element) {
  const panels = [...container.querySelectorAll('[role="tabpanel"]')] as HTMLElement[];
  for (const panel of panels.filter((each) => each.hidden)) {
    expect(panel.childNodes).toHaveLength(0);
  }
  return panels.filter((panel) => !panel.hidden).map((panel) => panel.textContent);
}

export function describeTabs(environment: string) {
  describe(`Tabs, ${environment}`, () => {
    beforeEach(parkPointer);

    describe("semantics", () => {
      test("is a tab list of tabs named by their labels, the selected one marked, and the panel named by its tab", async () => {
        const screen = await render(
          <Stage>
            <Product />
          </Stage>,
        );
        const list = screen.getByRole("tablist", { name: "Product" });
        await expect.element(list).toBeVisible();
        const tabs = list.getByRole("tab").all();
        expect(tabs.map((tab) => tab.element().textContent)).toEqual([
          "Details",
          "Reviews",
          "Shipping",
        ]);
        await expect
          .element(screen.getByRole("tab", { name: "Details" }))
          .toHaveAttribute("aria-selected", "true");
        for (const name of ["Reviews", "Shipping"]) {
          await expect
            .element(screen.getByRole("tab", { name }))
            .toHaveAttribute("aria-selected", "false");
        }
        // Only the selected tab's panel is rendered, and its tab names it.
        const panel = screen.getByRole("tabpanel", { name: "Details" });
        await expect.element(panel).toBeVisible();
        expect(renderedPanels(screen.container)).toEqual(["Note "]);
        await expect
          .element(screen.getByRole("tab", { name: "Details" }))
          .toHaveAttribute("aria-controls", panel.element().id);
      });

      test("a click selects a tab and shows its panel in place of the other", async () => {
        const onValueChange = vi.fn();
        const screen = await render(
          <Stage>
            <Product onValueChange={onValueChange} />
          </Stage>,
        );
        await screen.getByRole("tab", { name: "Shipping" }).click();
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Shipping");
        await expect.element(screen.getByRole("tabpanel", { name: "Shipping" })).toBeVisible();
        expect(renderedPanels(screen.container)).toEqual(["Ships in two days."]);
        expect(onValueChange).toHaveBeenCalledWith("shipping");
      });

      test("selection can be controlled by the app", async () => {
        const onValueChange = vi.fn();
        const screen = await render(
          <Stage>
            <Product value="reviews" onValueChange={onValueChange} />
          </Stage>,
        );
        await screen.getByRole("tab", { name: "Shipping" }).click();
        expect(onValueChange).toHaveBeenCalledWith("shipping");
        // The app has not changed its value, so the selection stays.
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Reviews");

        await screen.rerender(
          <Stage>
            <Product value="shipping" onValueChange={onValueChange} />
          </Stage>,
        );
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Shipping");
      });

      test("passes refs, class names, and other attributes to the elements", async () => {
        const refs = {
          tabs: createRef<HTMLDivElement>(),
          list: createRef<HTMLDivElement>(),
          tab: createRef<HTMLButtonElement>(),
          panel: createRef<HTMLDivElement>(),
        };
        const screen = await render(
          <Stage>
            <Tabs ref={refs.tabs} defaultValue="a" className="app-tabs" id="tabs">
              <TabsList ref={refs.list} className="app-list" aria-label="Sections">
                <TabsTrigger ref={refs.tab} value="a" className="app-tab" data-testid="tab">
                  First
                </TabsTrigger>
                <TabsTrigger value="b">Second</TabsTrigger>
              </TabsList>
              <TabsContent ref={refs.panel} value="a" className="app-panel" data-testid="panel">
                First panel
              </TabsContent>
            </Tabs>
          </Stage>,
        );
        expect(refs.tabs.current?.id).toBe("tabs");
        expect(refs.tabs.current).toHaveClass("app-tabs");
        expect(refs.list.current).toBe(screen.getByRole("tablist").element());
        expect(refs.list.current).toHaveClass("app-list");
        expect(refs.tab.current).toBe(screen.getByTestId("tab").element());
        expect(refs.tab.current).toHaveClass("app-tab");
        expect(refs.panel.current).toBe(screen.getByTestId("panel").element());
        expect(refs.panel.current).toHaveClass("app-panel");
      });

      test("a class from the app replaces the component's class for the same property", async () => {
        const screen = await render(
          <Stage>
            <Tabs defaultValue="a">
              <TabsList aria-label="Sections">
                <TabsTrigger value="a" className="text-(--rc-color-fg-default)">
                  First
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Stage>,
        );
        const classes = screen.getByRole("tab").element().className.split(" ");
        expect(classes).toContain("text-(--rc-color-fg-default)");
        expect(classes).not.toContain("text-(--rc-tabs-fg-default)");
      });

      test("a tab with only an icon is named by its accessible name, and an icon beside a label is decoration", async () => {
        const screen = await render(
          <Stage>
            <Tabs defaultValue="list">
              <TabsList aria-label="View">
                <TabsTrigger value="list" aria-label="List" leadingIcon={<Dot id="list" />} />
                <TabsTrigger value="grid" leadingIcon={<Dot id="grid" />}>
                  Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Stage>,
        );
        await expect.element(screen.getByRole("tab", { name: "List" })).toBeVisible();
        const grid = screen.getByRole("tab", { name: "Grid", exact: true }).element();
        for (const wrapper of grid.querySelectorAll('[data-slot="tabs-icon"]')) {
          expect(wrapper.getAttribute("aria-hidden")).toBe("true");
        }
      });
    });

    describe.each(DIRECTIONS)("the keyboard, %s", (dir) => {
      const next = dir === "ltr" ? "{ArrowRight}" : "{ArrowLeft}";
      const previous = dir === "ltr" ? "{ArrowLeft}" : "{ArrowRight}";

      test("the arrow keys move and select, wrapping at the ends, and Home and End go to the ends", async () => {
        // The direction is the page's: the tabs are not told it.
        const screen = await render(
          <Stage dir={dir}>
            <Product />
          </Stage>,
        );
        const name = () => selectedTab(screen);
        await userEvent.tab();
        await expect.element(screen.getByRole("tab", { name: "Details" })).toHaveFocus();

        const moves: [string, string][] = [
          [next, "Reviews"],
          [next, "Shipping"],
          [next, "Details"],
          [previous, "Shipping"],
          [previous, "Reviews"],
          ["{Home}", "Details"],
          ["{End}", "Shipping"],
        ];
        for (const [key, label] of moves) {
          await userEvent.keyboard(key);
          await expect.element(screen.getByRole("tab", { name: label })).toHaveFocus();
          await expect.element(name()).toHaveAccessibleName(label);
          await expect.element(screen.getByRole("tabpanel", { name: label })).toBeVisible();
        }
      });

      test("the first tab is on the side where reading starts, and so is a leading icon", async () => {
        const screen = await render(
          <Stage dir={dir}>
            <Product icons />
          </Stage>,
        );
        const first = rect(screen.getByRole("tab", { name: "Details" }));
        const last = rect(screen.getByRole("tab", { name: "Shipping" }));
        const icon = rect(screen.getByTestId("details-icon"));
        if (dir === "ltr") {
          expect(first.right).toBeLessThanOrEqual(last.left);
          expect(icon.left).toBeLessThan(first.left + first.width / 2);
        } else {
          expect(first.left).toBeGreaterThanOrEqual(last.right);
          expect(icon.right).toBeGreaterThan(first.left + first.width / 2);
        }
      });

      test("in manual mode the arrow keys only move focus, and Enter or Space selects", async () => {
        const screen = await render(
          <Stage dir={dir}>
            <Product activationMode="manual" />
          </Stage>,
        );
        await userEvent.tab();
        await userEvent.keyboard(next);
        await expect.element(screen.getByRole("tab", { name: "Reviews" })).toHaveFocus();
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Details");
        await userEvent.keyboard("{Enter}");
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Reviews");

        await userEvent.keyboard(next);
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Reviews");
        await userEvent.keyboard(" ");
        await expect.element(selectedTab(screen)).toHaveAccessibleName("Shipping");
      });
    });

    describe("Tab and the panel", () => {
      test("Tab enters the list at the selected tab and leaves it for a panel with nothing focusable, which takes focus itself", async () => {
        const screen = await render(
          <Stage>
            <button type="button">Before</button>
            <Product defaultValue="shipping" />
          </Stage>,
        );
        await userEvent.tab();
        await userEvent.tab();
        await expect.element(screen.getByRole("tab", { name: "Shipping" })).toHaveFocus();
        await userEvent.tab();
        const panel = screen.getByRole("tabpanel", { name: "Shipping" });
        await expect.element(panel).toHaveFocus();
        await expect.element(panel).toHaveAttribute("tabindex", "0");
        // And back.
        await userEvent.tab({ shift: true });
        await expect.element(screen.getByRole("tab", { name: "Shipping" })).toHaveFocus();
      });

      test("a panel with a focusable control is not itself a Tab stop: Tab goes to the control", async () => {
        const screen = await render(
          <Stage>
            <Product defaultValue="reviews" />
          </Stage>,
        );
        const panel = screen.getByRole("tabpanel", { name: "Reviews" });
        await expect.element(panel).not.toHaveAttribute("tabindex");
        await userEvent.tab();
        await expect.element(screen.getByRole("tab", { name: "Reviews" })).toHaveFocus();
        await userEvent.tab();
        await expect.element(screen.getByRole("link", { name: "Read all reviews" })).toHaveFocus();
      });

      test("a panel that gains or loses its only control changes whether it takes focus", async () => {
        const screen = await render(
          <Stage>
            <ChangingPanel />
          </Stage>,
        );
        const panel = screen.getByRole("tabpanel");
        await expect.element(panel).toHaveAttribute("tabindex", "0");
        await screen.getByRole("button", { name: "Toggle" }).click();
        await expect.element(panel).not.toHaveAttribute("tabindex");
        await screen.getByRole("button", { name: "Toggle" }).click();
        await expect.element(panel).toHaveAttribute("tabindex", "0");
      });

      test("a kept panel stays in the page, hidden from everyone, and keeps its state", async () => {
        const screen = await render(
          <Stage>
            <Product keepMounted />
          </Stage>,
        );
        await screen.getByRole("textbox", { name: "Note" }).fill("Gift wrap");
        await screen.getByRole("tab", { name: "Reviews" }).click();
        // All three panels are rendered; only the selected one is shown, or in the
        // accessibility tree.
        expect(
          [...screen.container.querySelectorAll('[role="tabpanel"]')].map((p) => p.textContent),
        ).toEqual(["Note ", "Rated 4 of 5. Read all reviews", "Ships in two days."]);
        const details = screen.container.querySelector('[data-slot="tabs-content"]') as Element;
        expect(computed(details).display).toBe("none");
        await expect.element(screen.getByRole("textbox", { name: "Note" })).not.toBeInTheDocument();
        await screen.getByRole("tab", { name: "Details" }).click();
        await expect
          .element(screen.getByRole("textbox", { name: "Note" }))
          .toHaveValue("Gift wrap");
      });

      test("a panel that is not kept is rendered again when it is selected again", async () => {
        const screen = await render(
          <Stage>
            <Product />
          </Stage>,
        );
        await screen.getByRole("textbox", { name: "Note" }).fill("Gift wrap");
        await screen.getByRole("tab", { name: "Reviews" }).click();
        await screen.getByRole("tab", { name: "Details" }).click();
        await expect.element(screen.getByRole("textbox", { name: "Note" })).toHaveValue("");
      });
    });

    describe.each(MODES)("colors in %s mode", (mode) => {
      test("a tab at rest, pressed, and selected", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Product />
          </Stage>,
        );
        const locator = screen.getByRole("tab", { name: "Reviews" });
        const tab = locator.element() as HTMLElement;
        const fill = () => computed(tab).backgroundColor;
        const label = () => computed(tab).color;
        const indicator = () => computed(tab, "::after").backgroundColor;

        expect(fill()).toBe(TRANSPARENT);
        expect(label()).toBe(color("tabs.fg.default", mode));
        expect(indicator()).toBe(TRANSPARENT);

        // Pressed: the mouse button held down on it, which also selects it.
        await locator.hover();
        await commands.pressPointer();
        await expect.poll(fill).toBe(color("tabs.bg.pressed", mode));
        await expect.poll(label).toBe(color("tabs.fg.hover", mode));
        await commands.releasePointer();

        // Selected: the label in the selected color, over the indicator.
        await parkPointer();
        await expect.element(locator).toHaveAttribute("aria-selected", "true");
        await expect.poll(fill).toBe(TRANSPARENT);
        await expect.poll(label).toBe(color("tabs.fg.selected", mode));
        await expect.poll(indicator).toBe(color("tabs.indicator.color", mode));

        // Pressed: Space held down. The pressed fill selects :active, which Firefox gives only
        // while a pointer presses: there the tab keeps its fill at rest.
        const shipping = screen.getByRole("tab", { name: "Shipping" }).element() as HTMLElement;
        shipping.focus();
        await userEvent.keyboard("[Space>]");
        await expect
          .poll(() => computed(shipping).backgroundColor)
          .toBe(server.browser === "firefox" ? TRANSPARENT : color("tabs.bg.pressed", mode));
        await userEvent.keyboard("[/Space]");
      });

      test("a tab under a hovering pointer", async (context) => {
        // Chromium does not give a page its mouse back after a touch screen was turned on and
        // off in it, and test files take turns in the same pages. In a page an earlier file
        // left so, nothing can hover.
        context.skip(
          !matchMedia("(hover: hover)").matches,
          "an earlier test file left this page without a pointer that hovers",
        );
        const screen = await render(
          <Stage mode={mode}>
            <Product />
          </Stage>,
        );
        const locator = screen.getByRole("tab", { name: "Reviews" });
        const tab = locator.element() as HTMLElement;
        await locator.hover();
        await expect.poll(() => computed(tab).backgroundColor).toBe(color("tabs.bg.hover", mode));
        await expect.poll(() => computed(tab).color).toBe(color("tabs.fg.hover", mode));
      });

      test("the hairline runs under the whole list, and the indicator covers it under the selected tab", async () => {
        const screen = await render(
          <Stage mode={mode} width={480}>
            <Product />
          </Stage>,
        );
        const frame = screen.container.querySelector('[data-slot="tabs-list-frame"]') as Element;
        const hairline = computed(frame, "::before");
        expect(hairline.backgroundColor).toBe(color("tabs.divider.color", mode));
        expect(pixels(hairline.height)).toBe(number("tabs.divider.width"));
        expect(pixels(hairline.width)).toBe(480 - 2 * STAGE_PADDING);

        // At the bottom edge, under the selected tab the indicator is on top; beside the tabs,
        // the hairline shows.
        const bottom = frame.getBoundingClientRect().bottom - 0.5;
        const selected = rect(screen.getByRole("tab", { name: "Details" }));
        expect(document.elementFromPoint(selected.left + selected.width / 2, bottom)).toBe(
          screen.getByRole("tab", { name: "Details" }).element(),
        );
        const tab = screen.getByRole("tab", { name: "Details" }).element();
        const mark = computed(tab, "::after");
        expect(pixels(mark.bottom)).toBe(0);
        expect(pixels(mark.height)).toBe(number("tabs.indicator.width"));
        expect(selected.bottom).toBeCloseTo(frame.getBoundingClientRect().bottom, 2);
      });

      test("keyboard focus draws the focus ring inside the tab, and pointer focus does not", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <button type="button">Before</button>
            <Product />
          </Stage>,
        );
        // A click first, by a mouse that has just clicked another control, so that no earlier
        // test's keyboard counts.
        await screen.getByRole("button", { name: "Before" }).click();
        const reviews = screen.getByRole("tab", { name: "Reviews" });
        await reviews.click();
        await expect.element(reviews).toHaveFocus();
        expect(computed(reviews.element()).outlineStyle).toBe("none");

        await userEvent.keyboard("{ArrowRight}");
        const locator = screen.getByRole("tab", { name: "Shipping" });
        const tab = locator.element() as HTMLElement;
        await expect.element(locator).toHaveFocus();
        expect(computed(tab).outlineStyle).toBe("solid");
        expect(pixels(computed(tab).outlineWidth)).toBe(number("tabs.focus-ring.width"));
        // A negative offset draws the ring inside the tab's edge.
        expect(pixels(computed(tab).outlineOffset)).toBe(-number("tabs.focus-ring.width"));
        expect(computed(tab).outlineColor).toBe(color("tabs.focus-ring.color", mode));
      });

      test("a panel that takes focus shows the focus ring inside its edge", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Product defaultValue="shipping" />
          </Stage>,
        );
        await userEvent.tab();
        await userEvent.tab();
        const panel = screen.getByRole("tabpanel", { name: "Shipping" });
        await expect.element(panel).toHaveFocus();
        const style = computed(panel.element());
        expect(style.outlineStyle).toBe("solid");
        expect(pixels(style.outlineWidth)).toBe(number("tabs.focus-ring.width"));
        expect(pixels(style.outlineOffset)).toBe(-number("tabs.focus-ring.width"));
        expect(style.outlineColor).toBe(color("tabs.focus-ring.color", mode));
      });

      test("has no accessibility violations", async () => {
        const screen = await render(
          <Stage mode={mode} width={NARROW}>
            <Product icons />
            <Tabs defaultValue="list">
              <TabsList aria-label="View">
                <TabsTrigger value="list" aria-label="List" leadingIcon={<Dot />} />
                <TabsTrigger value="grid" aria-label="Grid" leadingIcon={<Dot />} />
              </TabsList>
              <TabsContent value="list">Shown as a list.</TabsContent>
              <TabsContent value="grid">Shown as a grid.</TabsContent>
            </Tabs>
            <Many />
          </Stage>,
        );
        // The overflowing lists show their scroll buttons.
        await expect
          .poll(() => screen.container.querySelectorAll('[data-slot="tabs-scroll-button"]').length)
          .toBeGreaterThanOrEqual(2);
        const results = await axe.run(screen.container, {
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          rules: {
            "target-size": { enabled: true },
            // High-contrast modes promise 7:1 for text, which is the enhanced criterion.
            "color-contrast-enhanced": { enabled: mode.endsWith("-hc") },
          },
        });
        expect(
          results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html)}`),
        ).toEqual([]);
        // Guard against a run that checked nothing.
        expect(results.passes.map(({ id }) => id)).toContain("color-contrast");
      });
    });

    describe.each(DENSITIES)("measurements at %s density", (density) => {
      test("a tab and its label, icon, and indicator", async () => {
        const screen = await render(
          <Stage density={density}>
            <Product icons />
          </Stage>,
        );
        const tab = screen.getByRole("tab", { name: "Details" }).element();
        const style = computed(tab);
        const label = "tabs.label";

        expect(tab.getBoundingClientRect().height).toBeCloseTo(number("tabs.height", density), 2);
        expect(pixels(style.paddingInlineStart)).toBe(number("tabs.padding-inline"));
        expect(pixels(style.paddingInlineEnd)).toBe(number("tabs.padding-inline"));
        expect(pixels(style.columnGap)).toBe(number("tabs.gap"));

        expect(style.fontFamily).toContain(String(token(`${label}.font-family`)));
        expect(pixels(style.fontSize)).toBe(number(`${label}.font-size`));
        expect(style.fontWeight).toBe(token(`${label}.font-weight`));
        expect(pixels(style.lineHeight)).toBeCloseTo(number(`${label}.line-height`), 2);
        expect(pixels(style.letterSpacing) || 0).toBe(number(`${label}.letter-spacing`));
        expect(style.whiteSpace).toBe("nowrap");

        const icon = screen.getByTestId("details-icon").element().getBoundingClientRect();
        expect(icon.width).toBe(number("tabs.icon-size"));
        expect(icon.height).toBe(number("tabs.icon-size"));

        // The list is as tall as its tabs: the hairline and the indicator take no room.
        const list = screen.getByRole("tablist").element().getBoundingClientRect();
        expect(list.height).toBeCloseTo(number("tabs.height", density), 2);
      });

      test("selecting a tab does not change its width", async () => {
        const screen = await render(
          <Stage density={density}>
            <Product />
          </Stage>,
        );
        const reviews = screen.getByRole("tab", { name: "Reviews" });
        const before = rect(reviews).width;
        await reviews.click();
        await expect.element(reviews).toHaveAttribute("aria-selected", "true");
        expect(rect(reviews).width).toBe(before);
        expect(computed(reviews.element()).fontWeight).toBe(
          computed(screen.getByRole("tab", { name: "Details" }).element()).fontWeight,
        );
      });
    });

    describe("motion", () => {
      test("color changes use the transition tokens", async () => {
        const screen = await render(
          <Stage>
            <Product />
          </Stage>,
        );
        const tab = screen.getByRole("tab", { name: "Details" }).element();
        for (const style of [computed(tab), computed(tab, "::after")]) {
          expect(style.transitionDuration).toBe(`${number("tabs.transition.duration")}s`);
          expect(style.transitionTimingFunction).toBe(token("tabs.transition.easing"));
        }
        expect(computed(tab).transitionProperty).toBe("background-color, color");
        expect(computed(tab, "::after").transitionProperty).toBe("background-color");
      });

      test("with reduced motion, color changes are immediate", async () => {
        await withMedia({ reducedMotion: "reduce" }, async () => {
          const screen = await render(
            <Stage>
              <Product />
            </Stage>,
          );
          const tab = screen.getByRole("tab", { name: "Details" }).element();
          expect(computed(tab).transitionProperty).toBe("none");
          expect(computed(tab, "::after").transitionProperty).toBe("none");
        });
      });
    });

    describe("overflow", () => {
      test("labels stay on one line and are never cut off: the list scrolls sideways inside the width it is given", async () => {
        const screen = await render(
          <Stage width={NARROW}>
            <Many />
          </Stage>,
        );
        const list = screen.getByRole("tablist").element() as HTMLElement;
        const stage = screen.getByTestId("stage").element().getBoundingClientRect();
        expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
        expect(list.getBoundingClientRect().right).toBeLessThanOrEqual(stage.right - STAGE_PADDING);
        const height = number("tabs.height");
        for (const tab of screen.getByRole("tab").elements()) {
          // One line, all of it shown.
          expect(tab.getBoundingClientRect().height).toBeCloseTo(height, 2);
          expect(tab.scrollWidth).toBeLessThanOrEqual(tab.clientWidth);
          expect(computed(tab).textOverflow).toBe("clip");
        }
        // The page itself does not scroll sideways.
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
      });

      test.each(DIRECTIONS)("in %s, moving focus to a tab scrolls it into view", async (dir) => {
        const screen = await render(
          <Stage dir={dir} width={NARROW}>
            <Many />
          </Stage>,
        );
        const last = screen.getByRole("tab", { name: "Warranty" }).element();
        expect(shownInList(last)).toBe(false);
        await userEvent.tab();
        await userEvent.keyboard("{End}");
        await expect.element(screen.getByRole("tab", { name: "Warranty" })).toHaveFocus();
        await expect.poll(() => shownInList(last)).toBe(true);
        await userEvent.keyboard("{Home}");
        await expect
          .poll(() => shownInList(screen.getByRole("tab").elements()[0] as Element))
          .toBe(true);
      });

      test("a selected tab out of view is scrolled into view, when the list first shows and when the app selects it", async () => {
        const screen = await render(
          <Stage width={NARROW}>
            <Many defaultValue="returns" />
          </Stage>,
        );
        await expect
          .poll(() => shownInList(screen.getByRole("tab", { name: "Returns" }).element()))
          .toBe(true);
        await screen.unmount();

        const controlled = await render(
          <Stage width={NARROW}>
            <ControlledMany />
          </Stage>,
        );
        const warranty = controlled.getByRole("tab", { name: "Warranty" }).element();
        expect(shownInList(warranty)).toBe(false);
        await controlled.getByRole("button", { name: "Show the warranty" }).click();
        await expect.poll(() => shownInList(warranty)).toBe(true);
      });

      test("when every tab fits there are no scroll buttons", async () => {
        const screen = await render(
          <Stage width={NARROW}>
            <Product />
          </Stage>,
        );
        await settle(100);
        expect(screen.container.querySelector('[data-slot="tabs-scroll-button"]')).toBeNull();
      });

      test.each(DIRECTIONS)(
        "in %s, a mouse gets scroll buttons that page the list, hidden from assistive technology and out of the Tab order",
        async (dir) => {
          const screen = await render(
            <Stage dir={dir} width={NARROW}>
              <button type="button">Before</button>
              <Many />
              <button type="button">After</button>
            </Stage>,
          );
          const buttons = () =>
            [
              ...screen.container.querySelectorAll('[data-slot="tabs-scroll-button"]'),
            ] as HTMLElement[];
          await expect.poll(() => buttons().length).toBe(2);
          const [start, end] = buttons() as [HTMLElement, HTMLElement];
          const list = screen.getByRole("tablist").element() as HTMLElement;
          const shown = (button: HTMLElement) => computed(button).visibility === "visible";

          for (const button of [start, end]) {
            expect(button.getAttribute("aria-hidden")).toBe("true");
            expect(button.tabIndex).toBe(-1);
          }
          // The buttons are at the ends: the start button where reading starts.
          const listBox = list.getBoundingClientRect();
          if (dir === "ltr") {
            expect(start.getBoundingClientRect().right).toBeLessThanOrEqual(listBox.left + 0.5);
            expect(end.getBoundingClientRect().left).toBeGreaterThanOrEqual(listBox.right - 0.5);
          } else {
            expect(start.getBoundingClientRect().left).toBeGreaterThanOrEqual(listBox.right - 0.5);
            expect(end.getBoundingClientRect().right).toBeLessThanOrEqual(listBox.left + 0.5);
          }
          // Nothing for a screen reader, and Tab passes them.
          expect(
            screen
              .getByRole("button")
              .elements()
              .map((b) => b.textContent),
          ).toEqual(["Before", "After"]);
          await screen.getByRole("button", { name: "Before" }).click();
          await userEvent.tab();
          await expect.element(selectedTab(screen)).toHaveFocus();
          await userEvent.tab();
          await userEvent.tab();
          await expect.element(screen.getByRole("button", { name: "After" })).toHaveFocus();

          // At the start, only the button toward the end is shown. It pages the list until the
          // last tab is in view, without taking focus.
          expect(shown(start)).toBe(false);
          expect(shown(end)).toBe(true);
          const last = screen.getByRole("tab", { name: "Warranty" }).element();
          for (let page = 0; page < MANY.length && !shownInList(last); page++) {
            const before = list.scrollLeft;
            await userEvent.click(end);
            await expect.poll(() => list.scrollLeft).not.toBe(before);
          }
          expect(shownInList(last)).toBe(true);
          expect(document.activeElement).not.toBe(end);
          await expect.poll(() => shown(end)).toBe(false);
          expect(shown(start)).toBe(true);

          // And back.
          const first = screen.getByRole("tab", { name: "Overview" }).element();
          for (let page = 0; page < MANY.length && !shownInList(first); page++) {
            await userEvent.click(start);
            await settle(50);
          }
          expect(shownInList(first)).toBe(true);
          await expect.poll(() => shown(start)).toBe(false);
        },
      );
    });

    describe("server-rendered", () => {
      afterEach(() => {
        for (const undo of serverRendered.splice(0).reverse()) undo();
      });

      test("the HTML has the roles, the selection, and only the selected panel; React then hydrates it", async () => {
        const ui = (
          <Stage dir="rtl">
            <Product defaultValue="reviews" />
          </Stage>
        );
        const { container, screen, hydrate } = serverRender(ui);
        await expect.element(screen.getByRole("tablist", { name: "Product" })).toBeVisible();
        await expect
          .element(screen.getByRole("tab", { name: "Reviews" }))
          .toHaveAttribute("aria-selected", "true");
        const panel = screen.getByRole("tabpanel", { name: "Reviews" });
        expect(renderedPanels(container)).toEqual(["Rated 4 of 5. Read all reviews"]);
        // The indicator is drawn before any script runs, and the tabs keep the page's direction:
        // the first tab is on the right.
        expect(
          computed(screen.getByRole("tab", { name: "Reviews" }).element(), "::after")
            .backgroundColor,
        ).toBe(color("tabs.indicator.color"));
        expect(container.querySelector('[data-slot="tabs"]')?.hasAttribute("dir")).toBe(false);
        expect(rect(screen.getByRole("tab", { name: "Details" })).left).toBeGreaterThan(
          rect(screen.getByRole("tab", { name: "Reviews" })).left,
        );
        // Until a script finds the link in it, the panel takes focus itself, so that its content
        // can be reached either way.
        await expect.element(panel).toHaveAttribute("tabindex", "0");

        const errors = hydrate();
        await expect.element(panel).not.toHaveAttribute("tabindex");
        await page.getByRole("tab", { name: "Reviews" }).click();
        // Right-to-left: Left moves to the next tab.
        await userEvent.keyboard("{ArrowLeft}");
        await expect.element(page.getByRole("tab", { name: "Shipping" })).toHaveFocus();
        await expect.element(page.getByRole("tabpanel", { name: "Shipping" })).toBeVisible();
        // React found the server's HTML to be what it renders itself.
        expect(errors).toEqual([]);
      });
    });

    describe("system preferences", () => {
      test("without a data-theme, the tabs follow the system's color scheme", async () => {
        await withMedia({ colorScheme: "dark" }, async () => {
          const screen = await render(<Product />);
          const style = computed(screen.getByRole("tab", { name: "Reviews" }).element());
          expect(style.color).toBe(color("tabs.fg.default", "dark"));
        });
      });
    });

    // Last, because Chromium does not give a page its mouse back after a touch screen was
    // turned on in it.
    describe("pointer and touch", () => {
      test("with a mouse, only the visible tab can be hit", async () => {
        const screen = await render(
          <Stage density="compact">
            <Product />
          </Stage>,
        );
        const tab = screen.getByRole("tab", { name: "Reviews" }).element();
        const box = tab.getBoundingClientRect();
        expect(matchMedia("(pointer: coarse)").matches).toBe(false);
        expect(document.elementFromPoint(box.left + box.width / 2, box.top - 2)).not.toBe(tab);
      });

      test("on a touch screen, a tab shorter than the minimum can be hit across it, the list takes no more room, and there is no hover", async (context) => {
        await withTouch(context, async () => {
          const screen = await render(
            <Stage density="compact">
              <p style={{ margin: 0 }} data-testid="above">
                Above
              </p>
              <Product />
            </Stage>,
          );
          const locator = screen.getByRole("tab", { name: "Reviews" });
          const tab = locator.element();
          const box = tab.getBoundingClientRect();
          const x = box.left + box.width / 2;
          const reach = (number("tabs.target-minimum") - box.height) / 2;
          expect(box.height).toBeCloseTo(number("tabs.height", "compact"), 2);
          expect(reach).toBeGreaterThan(0);

          expect(document.elementFromPoint(x, box.top - reach + 1)).toBe(tab);
          expect(document.elementFromPoint(x, box.bottom + reach - 1)).toBe(tab);
          expect(document.elementFromPoint(x, box.top - reach - 1)).not.toBe(tab);
          // The line above touches the list: the target takes no room.
          const above = rect(screen.getByTestId("above"));
          expect(above.bottom).toBeCloseTo(box.top, 1);

          await locator.hover();
          await settle(250);
          expect(computed(tab).backgroundColor).toBe(TRANSPARENT);
        });
      });

      test("on a touch screen, an overflowing list has no scroll buttons: a swipe scrolls it", async (context) => {
        await withTouch(context, async () => {
          const screen = await render(
            <Stage width={NARROW}>
              <Many />
            </Stage>,
          );
          await settle(100);
          for (const button of screen.container.querySelectorAll(
            '[data-slot="tabs-scroll-button"]',
          )) {
            expect(computed(button).display).toBe("none");
          }
          const list = screen.getByRole("tablist").element() as HTMLElement;
          expect(computed(list).overflowX).toBe("auto");
        });
      });
    });

    test("the activation modes are the spec's", () => {
      expect(TABS_ACTIVATION_MODES).toEqual(["automatic", "manual"]);
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = () => [
  <TabsTrigger key="label" value="a">
    Details
  </TabsTrigger>,
  <TabsTrigger key="name" value="a" aria-label="List" leadingIcon={<Dot />} />,
  <TabsTrigger key="labelled" value="a" aria-labelledby="heading" leadingIcon={<Dot />} />,
  // @ts-expect-error A tab with no label needs an accessible name.
  <TabsTrigger key="unnamed" value="a" leadingIcon={<Dot />} />,
  // @ts-expect-error There are no disabled tabs: hide a tab that leads nowhere.
  <TabsTrigger key="disabled" value="a" disabled>
    Details
  </TabsTrigger>,
  // @ts-expect-error There are no vertical tabs.
  <Tabs key="vertical" orientation="vertical" />,
  // @ts-expect-error "focus" is not an activation mode in the spec.
  <Tabs key="mode" activationMode="focus" />,
];
