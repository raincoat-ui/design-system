// The Card's tests, written against specs/components/card/spec.yaml. They run once for each way
// an app can load the styles: see the files that call describeCard and
// describeCardOnTouchScreens.
//
// Expected colors and sizes come from the token source (expected-tokens.js), not from the
// stylesheet, so each comparison covers the whole path from a token to what the browser draws.
import axe from "axe-core";
import {
  createRef,
  type MouseEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";
import { cdp, commands, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Button,
  Card,
  CardBody,
  CardButton,
  CardFooter,
  CardLink,
  CardMedia,
  CardTitle,
  Heading,
  Text,
} from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];

const STAGE_PADDING = 24;
const LONG_TITLE = "Your order of three linen shirts and a wool scarf is on its way";

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
  width = 420,
  children,
}: {
  mode?: Mode;
  density?: Density;
  dir?: "ltr" | "rtl";
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
        boxSizing: "border-box",
        padding: STAGE_PADDING,
        width,
      }}
    >
      {children}
    </div>
  );
}

/** A picture to stand for the media: a block of one color, at a fixed aspect ratio. */
function Picture({ label = "" }: { label?: string }) {
  return (
    <svg
      data-testid="picture"
      role="img"
      aria-label={label}
      viewBox="0 0 400 120"
      style={{ background: "var(--rc-color-accent-default)" }}
    />
  );
}

/** A static card: a title, a body, and an action in its footer. */
function StorageCard({ media = false }: { media?: boolean }) {
  return (
    <Card data-testid="card">
      <CardTitle level={3}>Storage</CardTitle>
      {media && (
        <CardMedia>
          <Picture label="A chart of the space each kind of file takes" />
        </CardMedia>
      )}
      <CardBody>
        <Text color="muted">4.2 GB of 15 GB used</Text>
      </CardBody>
      <CardFooter>
        <Button>Manage storage</Button>
      </CardFooter>
    </Card>
  );
}

/** An interactive card that is a link. */
function OrderCard({
  href = "#order-1042",
  onClick,
  title = "Order 1042",
  media = false,
}: {
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  title?: string;
  media?: boolean;
}) {
  return (
    <Card data-testid="card">
      <CardTitle level={3}>
        <CardLink href={href} onClick={onClick}>
          {title}
        </CardLink>
      </CardTitle>
      {media && (
        <CardMedia>
          <Picture label="A parcel at a front door" />
        </CardMedia>
      )}
      <CardBody>
        <Text color="muted">Delivered on Monday</Text>
      </CardBody>
    </Card>
  );
}

/** An interactive card that is a button. */
function ReturnCard({ onClick }: { onClick?: () => void }) {
  return (
    <Card data-testid="card">
      <CardTitle level={3}>
        <CardButton onClick={onClick}>Start a return</CardButton>
      </CardTitle>
      <CardBody>
        <Text color="muted">Within 30 days of delivery</Text>
      </CardBody>
    </Card>
  );
}

const computed = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);
const pixels = (value: string) => Number.parseFloat(value);
const settle = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Whether any of an element's content is cut off by its own box. */
const clipped = (element: Element) =>
  element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;

/**
 * Whether every part of a card, and every paragraph in it, is inside the card. (The card's own
 * scroll size counts the stretched target, which reaches over its outline.)
 */
function partsInside(card: Element) {
  const box = card.getBoundingClientRect();
  return [...card.querySelectorAll('[data-slot^="card-"]:not([data-slot="card-target"]), p')]
    .map((element) => element.getBoundingClientRect())
    .every(
      (rect) =>
        rect.left >= box.left - 0.5 &&
        rect.right <= box.right + 0.5 &&
        rect.top >= box.top - 0.5 &&
        rect.bottom <= box.bottom + 0.5,
    );
}

/** Moves the pointer off every card, so one test's hover cannot carry into the next. */
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
 * Points inside a card, relative to its top left corner: the middle of its body text, its
 * media when it has some, and the corner of its padding, beside the outline.
 */
function pointsIn(card: Element) {
  const box = card.getBoundingClientRect();
  const inside = (element: Element | null) => {
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    return [{ x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top }];
  };
  return [
    ...inside(card.querySelector('[data-slot="card-body"]')),
    ...inside(card.querySelector('[data-slot="card-media"]')),
    { x: box.width - 3, y: box.height - 3 },
  ];
}

/** Undoes what serverRender set up. Run after each test that uses it. */
const serverRendered: (() => void)[] = [];

/**
 * Puts the HTML that React renders on a server into the page, as a browser receives it, and runs
 * none of the card's JavaScript: the page before React hydrates it, or with JavaScript off.
 * `hydrate` then lets React take the HTML over, and returns the errors React reports.
 */
function serverRender(ui: ReactElement) {
  const container = document.createElement("div");
  container.innerHTML = renderToString(ui);
  document.body.append(container);
  let root: ReturnType<typeof hydrateRoot> | undefined;
  serverRendered.push(() => {
    root?.unmount();
    container.remove();
  });
  return {
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

export function describeCard(environment: string) {
  describe(`Card, ${environment}`, () => {
    beforeEach(parkPointer);

    describe("semantics", () => {
      test("a static card has no role of its own, and its title is a heading at the level given", async () => {
        const screen = await render(
          <Stage>
            <StorageCard />
          </Stage>,
        );
        const card = screen.getByTestId("card").element();
        expect(card.tagName).toBe("DIV");
        expect(card.getAttribute("role")).toBeNull();
        const heading = screen.getByRole("heading", { level: 3, name: "Storage" });
        await expect.element(heading).toBeVisible();
        // heading-sm unless the app chooses another look.
        expect(heading.element().getAttribute("data-variant")).toBe("heading-sm");
        expect(pixels(computed(heading.element()).fontSize)).toBe(
          number("type.heading.sm.font-size"),
        );
        // Nothing makes the whole card a link or a button.
        expect(card.querySelector('[data-slot="card-target"]')).toBeNull();
      });

      test("the title's look can be changed, and its level stays", async () => {
        const screen = await render(
          <Stage>
            <Card>
              <CardTitle level={2} variant="heading-md">
                Storage
              </CardTitle>
            </Card>
          </Stage>,
        );
        const heading = screen.getByRole("heading", { level: 2, name: "Storage" }).element();
        expect(heading.getAttribute("data-variant")).toBe("heading-md");
        expect(pixels(computed(heading).fontSize)).toBe(number("type.heading.md.font-size"));
      });

      test("a link card is one link, named by its title alone, inside the title's heading", async () => {
        const screen = await render(
          <Stage>
            <OrderCard media />
          </Stage>,
        );
        const link = screen.getByRole("link");
        await expect.element(link).toHaveAccessibleName("Order 1042");
        await expect.element(link).toHaveAttribute("href", "#order-1042");
        await expect.element(link).toHaveAttribute("data-interaction", "link");
        const heading = screen.getByRole("heading", { level: 3, name: "Order 1042" }).element();
        expect(heading.contains(link.element())).toBe(true);
        expect(screen.getByRole("link").elements()).toHaveLength(1);
        expect(screen.container.querySelector("button")).toBeNull();
        // The rest of the card is read after the title: the title comes first in the document,
        // and the media, drawn at the top, after it.
        const order = [...screen.container.querySelectorAll("[data-slot]")].map((element) =>
          element.getAttribute("data-slot"),
        );
        expect(order.indexOf("card-title")).toBeLessThan(order.indexOf("card-media"));
        expect(order.indexOf("card-media")).toBeLessThan(order.indexOf("card-body"));
      });

      test("a button card is one button, named by its title alone, of the button type", async () => {
        const screen = await render(
          <Stage>
            <form onSubmit={(event) => event.preventDefault()}>
              <ReturnCard />
            </form>
          </Stage>,
        );
        const button = screen.getByRole("button");
        await expect.element(button).toHaveAccessibleName("Start a return");
        await expect.element(button).toHaveAttribute("type", "button");
        await expect.element(button).toHaveAttribute("data-interaction", "button");
        expect(screen.getByRole("button").elements()).toHaveLength(1);
        expect(screen.container.querySelector("a")).toBeNull();
      });

      test("passes a ref, a class name, and other attributes to each element", async () => {
        const card = createRef<HTMLDivElement>();
        const link = createRef<HTMLAnchorElement>();
        const screen = await render(
          <Stage>
            <Card ref={card} id="order" className="from-the-app" aria-describedby="note">
              <CardTitle level={3} id="order-title">
                <CardLink ref={link} href="#order" target="_self">
                  Order 1042
                </CardLink>
              </CardTitle>
            </Card>
            <p id="note">Orders from the last year</p>
          </Stage>,
        );
        expect(card.current?.id).toBe("order");
        expect(card.current?.className.split(" ")).toContain("from-the-app");
        expect(card.current?.getAttribute("aria-describedby")).toBe("note");
        expect(link.current).toBe(screen.getByRole("link").element());
        await expect.element(screen.getByRole("link")).toHaveAttribute("target", "_self");
        await expect.element(screen.getByRole("heading")).toHaveAttribute("id", "order-title");
      });

      test("asChild makes a router's link the card's link", async () => {
        const screen = await render(
          <Stage>
            <Card>
              <CardTitle level={3}>
                <CardLink asChild>
                  <a href="#order" data-router="">
                    Order 1042
                  </a>
                </CardLink>
              </CardTitle>
            </Card>
          </Stage>,
        );
        const link = screen.getByRole("link", { name: "Order 1042" }).element();
        expect(link.hasAttribute("data-router")).toBe(true);
        expect(link.getAttribute("data-slot")).toBe("card-target");
        expect(computed(link, "::after").position).toBe("absolute");
      });
    });

    describe("activation", () => {
      test("a click anywhere on a link card follows the link", async () => {
        const onClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => event.preventDefault());
        const screen = await render(
          <Stage>
            <OrderCard media onClick={onClick} />
          </Stage>,
        );
        const card = screen.getByTestId("card");
        const points = pointsIn(card.element());
        expect(points).toHaveLength(3);
        for (const position of points) await card.click({ position });
        expect(onClick).toHaveBeenCalledTimes(points.length);
      });

      test("Enter follows the link of a link card", async () => {
        const screen = await render(
          <Stage>
            <OrderCard href="#order-enter" />
          </Stage>,
        );
        (screen.getByRole("link").element() as HTMLElement).focus();
        await userEvent.keyboard("{Enter}");
        await expect.poll(() => location.hash).toBe("#order-enter");
      });

      test("a click anywhere, Enter, and Space activate a button card", async () => {
        const onClick = vi.fn();
        const screen = await render(
          <Stage>
            <ReturnCard onClick={onClick} />
          </Stage>,
        );
        const card = screen.getByTestId("card");
        const points = pointsIn(card.element());
        for (const position of points) await card.click({ position });
        expect(onClick).toHaveBeenCalledTimes(points.length);
        (screen.getByRole("button").element() as HTMLElement).focus();
        await userEvent.keyboard("{Enter}");
        expect(onClick).toHaveBeenCalledTimes(points.length + 1);
        await userEvent.keyboard(" ");
        expect(onClick).toHaveBeenCalledTimes(points.length + 2);
      });

      test("an interactive card is one Tab stop", async () => {
        const screen = await render(
          <Stage>
            <Button>Before</Button>
            <OrderCard />
            <ReturnCard />
            <Button>After</Button>
          </Stage>,
        );
        await screen.getByRole("button", { name: "Before" }).click();
        await userEvent.tab();
        await expect.element(screen.getByRole("link", { name: "Order 1042" })).toHaveFocus();
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "Start a return" })).toHaveFocus();
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "After" })).toHaveFocus();
      });

      test("a static card takes no focus: Tab moves to the link and buttons in it", async () => {
        const screen = await render(
          <Stage>
            <Button>Before</Button>
            <Card data-testid="card">
              <CardTitle level={3}>
                <a href="#storage">Storage</a>
              </CardTitle>
              <CardFooter>
                <Button>Manage storage</Button>
              </CardFooter>
            </Card>
          </Stage>,
        );
        await screen.getByRole("button", { name: "Before" }).click();
        await userEvent.tab();
        await expect.element(screen.getByRole("link", { name: "Storage" })).toHaveFocus();
        // A link in a static card's title is a plain link, not stretched over the card.
        const link = screen.getByRole("link").element();
        expect(computed(link, "::after").position).not.toBe("absolute");
        // Its focus does not draw the card's ring.
        expect(computed(screen.getByTestId("card").element()).outlineStyle).toBe("none");
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "Manage storage" })).toHaveFocus();
        expect(computed(screen.getByTestId("card").element()).outlineStyle).toBe("none");
      });
    });

    describe.each(MODES)("colors in %s mode", (mode) => {
      test("a static card is drawn with its tokens and does not respond to the pointer", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <StorageCard />
          </Stage>,
        );
        const card = screen.getByTestId("card");
        const style = () => computed(card.element());
        expect(style().backgroundColor).toBe(color("card.bg.default", mode));
        expect(style().borderTopColor).toBe(color("card.border.default", mode));
        expect(style().boxShadow).toBe(token("card.shadow", mode));
        expect(style().color).toBe(color("color.fg.default", mode));

        await screen.getByRole("heading").hover();
        await commands.pressPointer();
        await settle(250);
        expect(style().borderTopColor).toBe(color("card.border.default", mode));
        expect(style().backgroundColor).toBe(color("card.bg.default", mode));
        await commands.releasePointer();
      });

      test.each(["link", "button"] as const)(
        "a %s card at rest, hovered, and pressed",
        async (kind) => {
          const screen = await render(
            <Stage mode={mode}>
              {kind === "link" ? (
                <OrderCard onClick={() => {}} href="#order-pressed" />
              ) : (
                <ReturnCard />
              )}
            </Stage>,
          );
          const card = screen.getByTestId("card");
          const style = () => computed(card.element());
          const fill = () => style().backgroundColor;
          const outline = () => style().borderTopColor;

          // At rest, as a static card.
          expect(fill()).toBe(color("card.bg.default", mode));
          expect(outline()).toBe(color("card.border.default", mode));
          expect(style().boxShadow).toBe(token("card.shadow", mode));

          // Hovered: the outline steps to strong, and the fill stays.
          await card.hover({ position: pointsIn(card.element())[0] });
          await expect.poll(outline).toBe(color("card.border.hover", mode));
          expect(fill()).toBe(color("card.bg.default", mode));

          // Pressed: the fill steps to the pressed fill, and the outline stays strong.
          await commands.pressPointer();
          await expect.poll(fill).toBe(color("card.bg.pressed", mode));
          expect(outline()).toBe(color("card.border.hover", mode));
          await commands.releasePointer();
          await parkPointer();
          await expect.poll(outline).toBe(color("card.border.default", mode));
          await expect.poll(fill).toBe(color("card.bg.default", mode));
        },
      );

      test("Space held on a button card presses it", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <ReturnCard />
          </Stage>,
        );
        const fill = () => computed(screen.getByTestId("card").element()).backgroundColor;
        (screen.getByRole("button").element() as HTMLElement).focus();
        await userEvent.keyboard("[Space>]");
        // Firefox gives a button :active only while a pointer presses it, not a key: there the
        // card keeps its fill at rest.
        await expect
          .poll(fill)
          .toBe(color(server.browser === "firefox" ? "card.bg.default" : "card.bg.pressed", mode));
        await userEvent.keyboard("[/Space]");
      });

      test("keyboard focus draws the focus ring around the whole card, and pointer focus does not", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Button>Before</Button>
            <ReturnCard />
          </Stage>,
        );
        const card = screen.getByTestId("card").element() as HTMLElement;
        const button = screen.getByRole("button", { name: "Start a return" });

        await screen.getByRole("button", { name: "Before" }).click();
        await userEvent.tab();
        await expect.element(button).toHaveFocus();
        const style = computed(card);
        expect(style.outlineStyle).toBe("solid");
        expect(pixels(style.outlineWidth)).toBe(number("card.focus-ring.width"));
        expect(pixels(style.outlineOffset)).toBe(number("card.focus-ring.offset"));
        expect(style.outlineColor).toBe(color("card.focus-ring.color", mode));
        // The ring is the card's alone: the button inside draws none.
        expect(computed(button.element()).outlineStyle).toBe("none");

        (button.element() as HTMLElement).blur();
        await screen.getByTestId("card").click({ position: pointsIn(card)[0] });
        expect(computed(card).outlineStyle).toBe("none");
      });

      test("text keeps its contrast on the pressed fill", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <OrderCard onClick={() => {}} />
          </Stage>,
        );
        const card = screen.getByTestId("card");
        await card.hover({ position: pointsIn(card.element())[0] });
        await commands.pressPointer();
        try {
          await expect
            .poll(() => computed(card.element()).backgroundColor)
            .toBe(color("card.bg.pressed", mode));
          // Once the fill has finished changing.
          await settle(number("card.transition.duration") * 1000 + 50);
          const results = await axe.run(card.element(), {
            // High-contrast modes promise 7:1 for text, which is the enhanced criterion.
            runOnly: mode.endsWith("-hc")
              ? ["color-contrast", "color-contrast-enhanced"]
              : ["color-contrast"],
          });
          expect(
            results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html)}`),
          ).toEqual([]);
          expect(results.passes.map(({ id }) => id)).toContain("color-contrast");
        } finally {
          await commands.releasePointer();
        }
      });

      test("has no accessibility violations", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Heading level={2}>Your account</Heading>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
              <li>
                <StorageCard media />
              </li>
              <li>
                <OrderCard media />
              </li>
              <li>
                <ReturnCard />
              </li>
              <li>
                <Card>
                  <CardTitle level={3}>
                    {/* The app styles its own links. */}
                    <a href="#billing" style={{ color: "inherit" }}>
                      Billing
                    </a>
                  </CardTitle>
                  <CardBody>
                    <Text>Paid every month</Text>
                  </CardBody>
                  <CardFooter>
                    <Button variant="ghost">Download invoices</Button>
                    <Button variant="primary">Change plan</Button>
                  </CardFooter>
                </Card>
              </li>
            </ul>
          </Stage>,
        );
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
        expect(results.passes.map(({ id }) => id)).toEqual(
          expect.arrayContaining(["color-contrast", "list", "svg-img-alt"]),
        );
      });
    });

    describe.each(DENSITIES)("measurements at %s density", (density) => {
      test("padding, gap, outline, and corners come from the tokens", async () => {
        const screen = await render(
          <Stage density={density}>
            <StorageCard />
          </Stage>,
        );
        const card = screen.getByTestId("card").element();
        const style = computed(card);
        const padding = number("card.padding", density);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          expect(pixels(style[`padding${side}`])).toBe(padding);
          expect(pixels(style[`border${side}Width`])).toBe(number("card.border.width", density));
        }
        expect(pixels(style.rowGap)).toBe(number("card.gap", density));
        expect(pixels(style.borderTopLeftRadius)).toBe(number("card.radius", density));
        expect(style.borderTopStyle).toBe("solid");

        // The parts, one under the other, the gap apart.
        const title = screen.getByRole("heading").element().getBoundingClientRect();
        const body = card.querySelector('[data-slot="card-body"]')?.getBoundingClientRect();
        const box = card.getBoundingClientRect();
        const border = number("card.border.width", density);
        expect(title.top).toBeCloseTo(box.top + border + padding, 1);
        expect(title.left).toBeCloseTo(box.left + border + padding, 1);
        expect(body?.top).toBeCloseTo(title.bottom + number("card.gap", density), 1);
      });

      test("the media is at the top, edge to edge inside the outline, with the card's corners", async () => {
        const screen = await render(
          <Stage density={density}>
            <OrderCard media />
          </Stage>,
        );
        const card = screen.getByTestId("card").element();
        const media = card.querySelector('[data-slot="card-media"]') as Element;
        const picture = screen.getByTestId("picture").element().getBoundingClientRect();
        const box = card.getBoundingClientRect();
        const border = number("card.border.width", density);
        const rect = media.getBoundingClientRect();
        expect(rect.top).toBeCloseTo(box.top + border, 1);
        expect(rect.left).toBeCloseTo(box.left + border, 1);
        expect(rect.right).toBeCloseTo(box.right - border, 1);
        // The picture fills it, at its own aspect ratio.
        expect(picture.width).toBeCloseTo(rect.width, 1);
        expect(picture.height).toBeCloseTo((rect.width * 120) / 400, 0);
        // The top corners follow the card's, inside the outline; the bottom ones are square.
        const radius = Math.max(0, number("card.radius", density) - border);
        expect(pixels(computed(media).borderTopLeftRadius)).toBe(radius);
        expect(pixels(computed(media).borderTopRightRadius)).toBe(radius);
        expect(pixels(computed(media).borderBottomLeftRadius)).toBe(0);
        expect(computed(media).overflow).toBe("hidden");
        // The title follows the media, the gap below it, though it comes first in the document.
        const title = screen.getByRole("heading").element().getBoundingClientRect();
        expect(title.top).toBeCloseTo(rect.bottom + number("card.gap", density), 1);
      });
    });

    describe("motion", () => {
      test("outline and fill changes use the transition tokens", async () => {
        const screen = await render(
          <Stage>
            <OrderCard />
          </Stage>,
        );
        const style = computed(screen.getByTestId("card").element());
        expect(style.transitionProperty).toBe("background-color, border-color");
        expect(style.transitionDuration).toBe(`${number("card.transition.duration")}s`);
        expect(style.transitionTimingFunction).toBe(token("card.transition.easing"));
      });

      test("with reduced motion, outline and fill changes are immediate", async () => {
        await withMedia({ reducedMotion: "reduce" }, async () => {
          const screen = await render(
            <Stage>
              <OrderCard />
            </Stage>,
          );
          expect(computed(screen.getByTestId("card").element()).transitionProperty).toBe("none");
        });
      });
    });

    describe("layout", () => {
      test("a card fills the width it is given", async () => {
        const screen = await render(
          <Stage width={400}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <StorageCard />
            </div>
          </Stage>,
        );
        expect(screen.getByTestId("card").element().getBoundingClientRect().width).toBe(
          400 - 2 * STAGE_PADDING,
        );
      });

      test("a long title wraps and the card grows taller, with nothing cut off", async () => {
        const screen = await render(
          <Stage width={320}>
            <OrderCard title={LONG_TITLE} />
          </Stage>,
        );
        const card = screen.getByTestId("card").element();
        const heading = screen.getByRole("heading").element();
        const lineHeight = number("type.heading.sm.line-height");
        expect(heading.getBoundingClientRect().height).toBeGreaterThan(1.5 * lineHeight);
        expect(clipped(heading)).toBe(false);
        expect(partsInside(card)).toBe(true);
        await expect.element(screen.getByRole("link")).toHaveAccessibleName(LONG_TITLE);
        const stage = screen.getByTestId("stage").element().getBoundingClientRect();
        expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(
          stage.right - STAGE_PADDING + 0.5,
        );
      });

      test("in a row of cards, a card with a longer title grows rather than clips, and footers line up", async () => {
        const screen = await render(
          <Stage width={560}>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {["Order 1042", LONG_TITLE].map((title) => (
                <li key={title} style={{ display: "flex" }}>
                  <Card data-testid="card">
                    <CardTitle level={3}>{title}</CardTitle>
                    <CardFooter>
                      <Button>Track</Button>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          </Stage>,
        );
        const [short, long] = screen.getByTestId("card").elements();
        if (!short || !long) throw new Error("expected two cards");
        for (const card of [short, long]) expect(partsInside(card)).toBe(true);
        // Both cards are as tall as the row, and their footers are at the bottom.
        expect(short.getBoundingClientRect().height).toBeCloseTo(
          long.getBoundingClientRect().height,
          1,
        );
        const [first, second] = screen.getByRole("button", { name: "Track" }).elements();
        expect(first?.getBoundingClientRect().bottom).toBeCloseTo(
          second?.getBoundingClientRect().bottom ?? 0,
          1,
        );
      });

      test.each(["ltr", "rtl"] as const)(
        "in %s, parts align to the start edge and footer actions sit at the end",
        async (dir) => {
          const screen = await render(
            <Stage dir={dir}>
              <StorageCard media />
            </Stage>,
          );
          const card = screen.getByTestId("card").element();
          const box = card.getBoundingClientRect();
          const inset = number("card.border.width") + number("card.padding");
          const heading = screen.getByRole("heading").element();
          expect(computed(heading).textAlign).toBe("start");
          const range = document.createRange();
          range.selectNodeContents(heading);
          const title = range.getBoundingClientRect();
          const action = screen.getByRole("button").element().getBoundingClientRect();
          if (dir === "ltr") {
            expect(title.left).toBeCloseTo(box.left + inset, 0);
            expect(action.right).toBeCloseTo(box.right - inset, 0);
          } else {
            expect(title.right).toBeCloseTo(box.right - inset, 0);
            expect(action.left).toBeCloseTo(box.left + inset, 0);
          }
          // The media spans the card in either direction.
          const media = card.querySelector('[data-slot="card-media"]')?.getBoundingClientRect();
          expect(media?.width).toBeCloseTo(box.width - 2 * number("card.border.width"), 1);
        },
      );

      test("at twice the root font size, text grows and the card grows with it, with nothing cut off", async () => {
        const screen = await render(
          <Stage width={360}>
            <OrderCard title={LONG_TITLE} />
          </Stage>,
        );
        const card = screen.getByTestId("card").element();
        const heading = screen.getByRole("heading").element();
        const before = {
          size: pixels(computed(heading).fontSize),
          height: card.getBoundingClientRect().height,
        };
        document.documentElement.style.fontSize = "200%";
        try {
          await nextFrame();
          expect(pixels(computed(heading).fontSize)).toBeCloseTo(2 * before.size, 2);
          expect(card.getBoundingClientRect().height).toBeGreaterThan(1.5 * before.height);
          expect(clipped(heading)).toBe(false);
          expect(partsInside(card)).toBe(true);
        } finally {
          document.documentElement.style.fontSize = "";
        }
      });
    });

    describe("server-rendered", () => {
      afterEach(() => {
        for (const undo of serverRendered.splice(0).reverse()) undo();
      });

      test("a link card works before it is hydrated, and hydration changes nothing", async () => {
        const ui = (
          <Stage>
            <StorageCard media />
            <OrderCard href="#order-from-the-server" media />
          </Stage>
        );
        const { screen, hydrate } = serverRender(ui);
        const link = screen.getByRole("link", { name: "Order 1042" });
        const card = link.element().closest('[data-slot="card"]') as Element;
        // Without any of its JavaScript, a click on the card's body follows the link.
        await page.elementLocator(card).click({ position: pointsIn(card)[0] });
        await expect.poll(() => location.hash).toBe("#order-from-the-server");

        const errors = hydrate();
        await nextFrame();
        expect(errors).toEqual([]);
        // The same elements: React took over the server's HTML instead of replacing it.
        expect(screen.getByRole("link", { name: "Order 1042" }).element()).toBe(link.element());
      });
    });

    describe("system preferences", () => {
      test("without a data-theme, the card follows the system's color scheme", async () => {
        await withMedia({ colorScheme: "dark" }, async () => {
          const screen = await render(<StorageCard />);
          const style = computed(screen.getByTestId("card").element());
          expect(style.backgroundColor).toBe(color("card.bg.default", "dark"));
          expect(style.borderTopColor).toBe(color("card.border.default", "dark"));
        });
      });
    });
  });
}

/**
 * The Card on a touch screen. These tests turn on a touch screen, which Chromium does not turn
 * off again for the rest of the page, so they live in files of their own (*.touch.test.tsx).
 */
export function describeCardOnTouchScreens(environment: string) {
  describe(`Card, ${environment}`, () => {
    beforeEach(parkPointer);

    test("on a touch screen, an interactive card takes touches across its surface and has no hover state", async (context) => {
      // Chromium alone can turn a touch screen on in a page that is already open. Firefox and
      // WebKit take it only when the browser starts, which would make every test a touch test.
      context.skip(server.browser !== "chromium", "touch emulation needs Chromium");
      await cdp().send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
      });
      try {
        expect(matchMedia("(pointer: coarse)").matches).toBe(true);
        const screen = await render(
          <Stage>
            <OrderCard media />
          </Stage>,
        );
        const card = screen.getByTestId("card");
        const link = screen.getByRole("link").element();
        const box = card.element().getBoundingClientRect();
        for (const { x, y } of pointsIn(card.element())) {
          expect(document.elementFromPoint(box.left + x, box.top + y)).toBe(link);
        }
        await card.hover({ position: pointsIn(card.element())[0] });
        await settle(250);
        expect(computed(card.element()).borderTopColor).toBe(color("card.border.default"));
      } finally {
        await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
      }
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = () => [
  <Card key="static">
    <CardTitle level={3}>Storage</CardTitle>
  </Card>,
  <CardTitle key="look" level={2} variant="heading-md">
    Storage
  </CardTitle>,
  // @ts-expect-error A title needs a level.
  <CardTitle key="level">Storage</CardTitle>,
  // @ts-expect-error A title is a heading, with no body look.
  <CardTitle key="body" level={3} variant="body-md">
    Storage
  </CardTitle>,
  // @ts-expect-error A card has no variants.
  <Card key="variant" variant="outlined" />,
  // @ts-expect-error A card button cannot be disabled: a card that cannot be opened is static.
  <CardButton key="disabled" disabled>
    Start a return
  </CardButton>,
];
