// The Button's tests, written against specs/components/button/spec.yaml. They run once for
// each way an app can load the styles: see the two files that call describeButton.
//
// Expected colors and sizes come from the token source (expected-tokens.js), not from the
// stylesheet, so each comparison covers the whole path from a token to what the browser draws.
import axe from "axe-core";
import {
  createRef,
  type FormEvent,
  Profiler,
  type ProfilerOnRenderCallback,
  type ReactElement,
  type ReactNode,
} from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";
import { cdp, commands, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BUTTON_SIZES, BUTTON_VARIANTS, Button } from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];

const TRANSPARENT = "rgba(0, 0, 0, 0)";
const LONG_LABEL = "Save all of these changes and send the updated version to every reviewer";
const STAGE_PADDING = 24;

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

function Dot({ id }: { id?: string }) {
  return (
    <svg data-testid={id} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  );
}

/** A form whose submit button can be put into the loading state. */
function SubmitForm({
  loading,
  onClick,
  onSubmit,
}: {
  loading: boolean;
  onClick: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Stage>
      <form onSubmit={onSubmit}>
        <Button type="submit" loading={loading} onClick={onClick}>
          Send
        </Button>
      </form>
    </Stage>
  );
}

/** Undoes what serverRender and recordSubmissions set up. Run after each test that uses them. */
const serverRendered: (() => void)[] = [];

/**
 * Puts the HTML that React renders on a server into the page, as a browser receives it, and
 * runs none of the Button's JavaScript: the page before React hydrates it, or with JavaScript
 * off. `hydrate` then lets React take the HTML over, as an app's script does once it loads,
 * and returns the errors React reports while it does.
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

/**
 * Stops every form submission in the page, so that none can navigate away, and lists the name
 * of the button that submitted each one.
 */
function recordSubmissions() {
  const submitters: string[] = [];
  const record = (event: SubmitEvent) => {
    event.preventDefault();
    submitters.push(event.submitter?.getAttribute("name") ?? "the form itself");
  };
  document.addEventListener("submit", record, true);
  serverRendered.push(() => document.removeEventListener("submit", record, true));
  return submitters;
}

const computed = (element: Element) => getComputedStyle(element);
const pixels = (value: string) => Number.parseFloat(value);
const settle = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Moves the pointer off every button, so one test's hover cannot carry into the next. */
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

const center = (rect: DOMRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

export function describeButton(environment: string) {
  describe(`Button, ${environment}`, () => {
    beforeEach(parkPointer);

    describe("semantics", () => {
      test("is a button named by its label, with the defaults of the spec", async () => {
        const screen = await render(
          <Stage>
            <Button>Save changes</Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save changes" });
        await expect.element(button).toBeVisible();
        await expect.element(button).toHaveAttribute("type", "button");
        await expect.element(button).toHaveAttribute("data-variant", "secondary");
        await expect.element(button).toHaveAttribute("data-size", "md");
      });

      test("is activated by a click, by Enter, and by Space", async () => {
        const onClick = vi.fn();
        const screen = await render(
          <Stage>
            <Button onClick={onClick}>Save</Button>
          </Stage>,
        );
        await screen.getByRole("button", { name: "Save" }).click();
        expect(onClick).toHaveBeenCalledTimes(1);
        await userEvent.keyboard("{Enter}");
        expect(onClick).toHaveBeenCalledTimes(2);
        await userEvent.keyboard(" ");
        expect(onClick).toHaveBeenCalledTimes(3);
      });

      test("submits a form only when it is given the submit type", async () => {
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        const screen = await render(
          <Stage>
            <form onSubmit={onSubmit}>
              <Button>Preview</Button>
              <Button type="submit">Send</Button>
            </form>
          </Stage>,
        );
        await screen.getByRole("button", { name: "Preview" }).click();
        expect(onSubmit).not.toHaveBeenCalled();
        await screen.getByRole("button", { name: "Send" }).click();
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      test("passes a ref, a class name, and other attributes to the element", async () => {
        const ref = createRef<HTMLButtonElement>();
        const screen = await render(
          <Stage>
            <Button ref={ref} className="from-the-app" id="save" name="intent" value="save">
              Save
            </Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" });
        expect(ref.current).toBe(button.element());
        await expect.element(button).toHaveClass("from-the-app");
        await expect.element(button).toHaveAttribute("id", "save");
        await expect.element(button).toHaveAttribute("name", "intent");
        await expect.element(button).toHaveAttribute("value", "save");
      });

      test("a class from the app replaces the component's class for the same property", async () => {
        const screen = await render(
          <Stage>
            <Button className="bg-(--rc-color-bg-subtle)">Save</Button>
          </Stage>,
        );
        const classes = screen.getByRole("button").element().className.split(" ");
        expect(classes).toContain("bg-(--rc-color-bg-subtle)");
        expect(classes).not.toContain("bg-(--rc-button-secondary-bg-default)");
      });
    });

    describe("disabled", () => {
      test("cannot be focused or activated", async () => {
        const onClick = vi.fn();
        const screen = await render(
          <Stage>
            <Button disabled onClick={onClick}>
              Save
            </Button>
            <Button>After</Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" });
        await expect.element(button).toBeDisabled();
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "After" })).toHaveFocus();
        await button.click({ force: true });
        expect(onClick).not.toHaveBeenCalled();
      });

      test("is also disabled by a disabled fieldset, and looks it", async () => {
        const screen = await render(
          <Stage>
            <fieldset disabled>
              <Button variant="primary">Save</Button>
            </fieldset>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" });
        await expect.element(button).toBeDisabled();
        expect(computed(button.element()).backgroundColor).toBe(color("button.disabled.bg"));
      });

      test("wins over loading", async () => {
        const screen = await render(
          <Stage>
            <Button disabled loading>
              Save
            </Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" });
        await expect.element(button).toBeDisabled();
        await expect.element(button).not.toHaveAttribute("aria-busy");
        expect(button.element().querySelector('[data-slot="button-spinner"]')).toBeNull();
      });
    });

    describe("loading", () => {
      test("is busy, keeps its label, and shows a spinner in place of the leading icon", async () => {
        const screen = await render(
          <Stage>
            <Button loading leadingIcon={<Dot id="leading" />}>
              Save
            </Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" });
        await expect.element(button).toHaveAttribute("aria-busy", "true");
        await expect.element(button).toHaveAttribute("aria-disabled", "true");
        // Busy, but not disabled: it can still hold focus.
        expect(button.element().hasAttribute("disabled")).toBe(false);
        const spinner = button.element().querySelector('[data-slot="button-spinner"]');
        expect(spinner).not.toBeNull();
        expect(computed(spinner as Element).animationName).toBe("rc-spin");
        expect(button.element().querySelector('[data-testid="leading"]')).toBeNull();
      });

      test("keeps focus and ignores activation until loading ends", async () => {
        const onClick = vi.fn();
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        const onDocumentClick = vi.fn();
        const form = (loading: boolean) => (
          <SubmitForm loading={loading} onClick={onClick} onSubmit={onSubmit} />
        );
        const screen = await render(form(false));
        const button = screen.getByRole("button", { name: "Send" });
        await userEvent.tab();
        await expect.element(button).toHaveFocus();

        await screen.rerender(form(true));
        await expect.element(button).toHaveFocus();
        document.addEventListener("click", onDocumentClick);
        try {
          await userEvent.keyboard("{Enter}");
          await userEvent.keyboard(" ");
          await button.click({ force: true });
        } finally {
          document.removeEventListener("click", onDocumentClick);
        }
        expect(onClick).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
        // As with a disabled button, nothing outside hears the click either.
        expect(onDocumentClick).not.toHaveBeenCalled();

        await screen.rerender(form(false));
        await userEvent.keyboard("{Enter}");
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      test("does not react to the pointer", async () => {
        const screen = await render(
          <Stage>
            <Button variant="primary" loading>
              Save
            </Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" });
        await button.hover({ force: true });
        await settle(250);
        expect(computed(button.element()).backgroundColor).toBe(color("button.primary.bg.default"));
      });
    });

    describe.each(MODES)("colors in %s mode", (mode) => {
      test.each(BUTTON_VARIANTS)(
        "the %s variant at rest, hovered, and pressed",
        async (variant) => {
          const screen = await render(
            <Stage mode={mode}>
              <Button variant={variant}>Save</Button>
            </Stage>,
          );
          const locator = screen.getByRole("button", { name: "Save" });
          const button = locator.element() as HTMLElement;
          const fill = () => computed(button).backgroundColor;
          const rest =
            variant === "ghost" ? TRANSPARENT : color(`button.${variant}.bg.default`, mode);
          const pressed = color(`button.${variant}.bg.pressed`, mode);

          expect(fill()).toBe(rest);
          expect(computed(button).color).toBe(color(`button.${variant}.fg`, mode));
          expect(computed(button).borderTopColor).toBe(
            variant === "secondary" ? color("button.secondary.border", mode) : TRANSPARENT,
          );

          await locator.hover();
          await expect.poll(fill).toBe(color(`button.${variant}.bg.hover`, mode));

          // Pressed: the mouse button held down on it. The pressed fill wins over the hover fill.
          await commands.pressPointer();
          await expect.poll(fill).toBe(pressed);
          await commands.releasePointer();

          // Pressed: Space held down, with the pointer elsewhere. The pressed fill selects
          // :active, which Firefox gives a button only while a pointer presses it, not a key:
          // there the button keeps its fill at rest.
          await parkPointer();
          button.focus();
          await userEvent.keyboard("[Space>]");
          await expect.poll(fill).toBe(server.browser === "firefox" ? rest : pressed);
          await userEvent.keyboard("[/Space]");
        },
      );

      test("every variant looks the same when disabled", async () => {
        const screen = await render(
          <Stage mode={mode}>
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} disabled>
                {variant}
              </Button>
            ))}
          </Stage>,
        );
        for (const variant of BUTTON_VARIANTS) {
          const style = computed(screen.getByRole("button", { name: variant }).element());
          expect(style.backgroundColor).toBe(color("button.disabled.bg", mode));
          expect(style.color).toBe(color("button.disabled.fg", mode));
          expect(style.borderTopColor).toBe(color("button.disabled.border", mode));
        }
      });

      test("keyboard focus draws the focus ring, and pointer focus does not", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Button>Save</Button>
          </Stage>,
        );
        const locator = screen.getByRole("button", { name: "Save" });
        const button = locator.element() as HTMLElement;

        await userEvent.tab();
        await expect.element(locator).toHaveFocus();
        expect(computed(button).outlineStyle).toBe("solid");
        expect(pixels(computed(button).outlineWidth)).toBe(number("button.focus-ring.width"));
        expect(pixels(computed(button).outlineOffset)).toBe(number("button.focus-ring.offset"));
        expect(computed(button).outlineColor).toBe(color("button.focus-ring.color", mode));

        button.blur();
        await locator.click();
        await expect.element(locator).toHaveFocus();
        expect(computed(button).outlineStyle).toBe("none");
      });

      test("has no accessibility violations", async () => {
        const screen = await render(
          <Stage mode={mode}>
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} leadingIcon={<Dot />}>
                {`Save as ${variant}`}
              </Button>
            ))}
            {BUTTON_SIZES.map((size) => (
              <Button key={size} size={size}>{`Size ${size}`}</Button>
            ))}
            <Button disabled>Unavailable</Button>
            <Button variant="primary" loading>
              Saving
            </Button>
            <Button aria-label="Delete page" leadingIcon={<Dot />} />
            <Button asChild variant="ghost">
              <a href="#guide">Read the guide</a>
            </Button>
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
        expect(results.passes.map(({ id }) => id)).toContain("color-contrast");
      });
    });

    describe.each(DENSITIES)("measurements at %s density", (density) => {
      test.each(BUTTON_SIZES)("the %s size", async (size) => {
        const screen = await render(
          <Stage density={density}>
            <Button size={size} leadingIcon={<Dot id="icon" />}>
              Save
            </Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" }).element();
        const style = computed(button);
        const label = `button.label.${size}`;

        expect(button.getBoundingClientRect().height).toBeCloseTo(
          number(`button.height.${size}`, density),
          2,
        );
        expect(pixels(style.paddingInlineStart)).toBe(number(`button.padding-inline.${size}`));
        expect(pixels(style.paddingInlineEnd)).toBe(number(`button.padding-inline.${size}`));
        expect(pixels(style.columnGap)).toBe(number("button.gap"));
        expect(pixels(style.borderTopWidth)).toBe(number("button.border-width"));
        expect(pixels(style.borderTopLeftRadius)).toBe(number("button.radius"));

        expect(style.fontFamily).toContain(String(token(`${label}.font-family`)));
        expect(pixels(style.fontSize)).toBe(number(`${label}.font-size`));
        expect(style.fontWeight).toBe(token(`${label}.font-weight`));
        expect(pixels(style.lineHeight)).toBeCloseTo(number(`${label}.line-height`), 2);
        expect(pixels(style.letterSpacing) || 0).toBe(number(`${label}.letter-spacing`));

        const icon = screen.getByTestId("icon").element().getBoundingClientRect();
        expect(icon.width).toBe(number(`button.icon-size.${size}`));
        expect(icon.height).toBe(number(`button.icon-size.${size}`));
      });

      test.each(BUTTON_SIZES)("an icon-only %s button is square", async (size) => {
        const screen = await render(
          <Stage density={density}>
            <Button size={size} aria-label="Delete page" leadingIcon={<Dot />} />
          </Stage>,
        );
        const rect = screen
          .getByRole("button", { name: "Delete page" })
          .element()
          .getBoundingClientRect();
        expect(rect.height).toBeCloseTo(number(`button.height.${size}`, density), 2);
        expect(rect.width).toBeCloseTo(rect.height, 2);
      });
    });

    describe("motion", () => {
      test("color changes use the transition tokens", async () => {
        const screen = await render(
          <Stage>
            <Button>Save</Button>
          </Stage>,
        );
        const style = computed(screen.getByRole("button").element());
        expect(style.transitionProperty).toBe("background-color, border-color, color");
        expect(style.transitionDuration).toBe(`${number("button.transition.duration")}s`);
        expect(style.transitionTimingFunction).toBe(token("button.transition.easing"));
      });

      test("with reduced motion, color changes are immediate", async () => {
        await withMedia({ reducedMotion: "reduce" }, async () => {
          const screen = await render(
            <Stage>
              <Button>Save</Button>
            </Stage>,
          );
          expect(computed(screen.getByRole("button").element()).transitionProperty).toBe("none");
        });
      });
    });

    describe("layout", () => {
      test("a long label wraps onto more lines and is never cut off", async () => {
        const screen = await render(
          <Stage width={280}>
            <Button variant="primary">{LONG_LABEL}</Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: LONG_LABEL }).element();
        const style = computed(button);
        const rect = button.getBoundingClientRect();
        const stage = screen.getByTestId("stage").element().getBoundingClientRect();
        const lineHeight = number("button.label.md.line-height");

        // At least three lines, inside the stage, with nothing clipped or elided.
        expect(rect.height).toBeGreaterThan(3 * lineHeight);
        expect(rect.right).toBeLessThanOrEqual(stage.right - STAGE_PADDING);
        expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
        expect(style.overflow).toBe("visible");
        expect(style.textOverflow).toBe("clip");
        expect(style.textAlign).toBe("center");

        // The space above and below the text is the same as in a one-line button.
        const padding =
          (number("button.height.md") - lineHeight) / 2 - number("button.border-width");
        expect(pixels(style.paddingTop)).toBeCloseTo(padding, 2);
        expect(pixels(style.paddingBottom)).toBeCloseTo(padding, 2);
      });

      test("fullWidth stretches the button to its container", async () => {
        const screen = await render(
          <Stage width={400}>
            <Button fullWidth>Save</Button>
          </Stage>,
        );
        const rect = screen.getByRole("button").element().getBoundingClientRect();
        expect(rect.width).toBe(400 - 2 * STAGE_PADDING);
      });

      test.each(["ltr", "rtl"] as const)(
        "in %s, the leading icon is on the side where reading starts",
        async (dir) => {
          const screen = await render(
            <Stage dir={dir}>
              <Button leadingIcon={<Dot id="leading" />} trailingIcon={<Dot id="trailing" />}>
                Next
              </Button>
            </Stage>,
          );
          // The icons are decoration: the name is the label alone.
          const button = screen.getByRole("button", { name: "Next", exact: true }).element();
          for (const wrapper of button.querySelectorAll('[data-slot="button-icon"]')) {
            expect(wrapper.getAttribute("aria-hidden")).toBe("true");
          }
          const leading = screen.getByTestId("leading").element().getBoundingClientRect();
          const trailing = screen.getByTestId("trailing").element().getBoundingClientRect();
          if (dir === "ltr") expect(leading.right).toBeLessThan(trailing.left);
          else expect(leading.left).toBeGreaterThan(trailing.right);
        },
      );
    });

    describe("asChild", () => {
      test("styles a link as a button without making it one", async () => {
        const screen = await render(
          <Stage>
            <Button asChild variant="primary">
              <a href="#guide">Read the guide</a>
            </Button>
          </Stage>,
        );
        const link = screen.getByRole("link", { name: "Read the guide" }).element();
        expect(link.tagName).toBe("A");
        expect(link.hasAttribute("type")).toBe(false);
        expect(link.hasAttribute("disabled")).toBe(false);
        expect(screen.container.querySelector("button")).toBeNull();

        const style = computed(link);
        expect(style.backgroundColor).toBe(color("button.primary.bg.default"));
        expect(style.color).toBe(color("button.primary.fg"));
        expect(style.textDecorationLine).toBe("none");
        expect(link.getBoundingClientRect().height).toBeCloseTo(number("button.height.md"), 2);
      });

      test("a disabled link cannot be focused or followed", async () => {
        const onClick = vi.fn();
        const clicks: Event[] = [];
        const record = (event: Event) => clicks.push(event);
        const screen = await render(
          <Stage>
            <Button asChild disabled>
              {/* biome-ignore lint/a11y/useValidAnchor: a router's link has a click handler of its own, and the test proves that it is not called. */}
              <a href="#never" onClick={onClick}>
                Read the guide
              </a>
            </Button>
            <Button>After</Button>
          </Stage>,
        );
        const link = screen.getByRole("link", { name: "Read the guide" });
        await expect.element(link).toHaveAttribute("aria-disabled", "true");
        await expect.element(link).toHaveAttribute("tabindex", "-1");
        expect(computed(link.element()).backgroundColor).toBe(color("button.disabled.bg"));

        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "After" })).toHaveFocus();

        window.addEventListener("click", record, { capture: true });
        try {
          await link.click({ force: true });
        } finally {
          window.removeEventListener("click", record, { capture: true });
        }
        expect(clicks).toHaveLength(1);
        expect(clicks[0]?.defaultPrevented).toBe(true);
        expect(onClick).not.toHaveBeenCalled();
        expect(location.hash).not.toBe("#never");
      });
    });

    describe("server-rendered, before hydration", () => {
      afterEach(() => {
        for (const undo of serverRendered.splice(0).reverse()) undo();
      });

      /** A form whose only submit button is busy, and one whose busy submit button comes first. */
      const forms = (
        <Stage>
          <form>
            <input aria-label="Email" name="email" defaultValue="ada@example.com" />
            <Button type="submit" variant="primary" loading name="send">
              Send invite
            </Button>
          </form>
          <form>
            <input aria-label="Title" name="title" defaultValue="Release notes" />
            <Button type="submit" loading name="draft">
              Save draft
            </Button>
            <Button type="submit" name="publish">
              Publish
            </Button>
          </form>
        </Stage>
      );

      test("a busy submit button cannot submit its form, and keeps its busy look", async () => {
        const { screen } = serverRender(forms);
        const submissions = recordSubmissions();
        const send = screen.getByRole("button", { name: "Send invite" });
        const field = (name: string) => screen.getByLabelText(name, { exact: true });
        const press = (name: string) => async () => {
          await field(name).click();
          await userEvent.keyboard("{Enter}");
        };

        // What submits a form: a click on its submit button, Enter or Space on that button
        // once Tab reaches it, and Enter in a field, which clicks the form's first submit
        // button. Both forms' first submit buttons are busy.
        const attempts = {
          "a click on Send invite": () => send.click({ force: true }),
          "a click on Save draft": () =>
            screen.getByRole("button", { name: "Save draft" }).click({ force: true }),
          "Enter in the Email field": press("Email"),
          "Enter in the Title field": press("Title"),
          "Tab from the Email field, then Enter": async () => {
            await field("Email").click();
            await userEvent.tab();
            await userEvent.keyboard("{Enter}");
          },
          "Tab from the Email field, then Space": async () => {
            await field("Email").click();
            await userEvent.tab();
            await userEvent.keyboard(" ");
          },
        };
        const submitted: Record<string, string[]> = {};
        for (const [attempt, run] of Object.entries(attempts)) {
          await run();
          submitted[attempt] = submissions.splice(0);
        }
        expect(submitted).toEqual(Object.fromEntries(Object.keys(attempts).map((a) => [a, []])));

        // Until hydration the browser refuses it: the button is disabled, so Tab passes it.
        // (toBeDisabled would not tell: it counts aria-disabled, which a busy button always has.)
        await expect.element(send).toHaveAttribute("disabled");
        await field("Email").click();
        await userEvent.tab();
        await expect.element(field("Title")).toHaveFocus();
        // It still says it is busy, and looks it rather than disabled.
        await expect.element(send).toHaveAttribute("aria-busy", "true");
        expect(computed(send.element()).backgroundColor).toBe(color("button.primary.bg.default"));
        expect(send.element().querySelector('[data-slot="button-spinner"]')).not.toBeNull();
        // An idle button is not affected.
        const publish = screen.getByRole("button", { name: "Publish" });
        await expect.element(publish).not.toHaveAttribute("disabled");
        await expect.element(publish).not.toHaveAttribute("data-unhydrated");
      });

      test("once hydrated, a busy button can take focus and still ignores activation", async () => {
        const { screen, hydrate } = serverRender(forms);
        const submissions = recordSubmissions();
        const errors = hydrate();
        const send = screen.getByRole("button", { name: "Send invite" });
        await expect.element(send).not.toHaveAttribute("data-unhydrated");
        await expect.element(send).not.toHaveAttribute("disabled");
        await expect.element(send).toHaveAttribute("aria-disabled", "true");

        await screen.getByLabelText("Email", { exact: true }).click();
        await userEvent.keyboard("{Enter}");
        await userEvent.tab();
        await expect.element(send).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard(" ");
        await send.click({ force: true });
        await expect.element(send).toHaveFocus();
        expect(submissions).toEqual([]);
        // React found the server's HTML to be what it renders itself.
        expect(errors).toEqual([]);
      });

      test("hydration renders a busy button a second time, and an idle one only once", async () => {
        const renders: Record<string, number> = { idle: 0, busy: 0 };
        const count: ProfilerOnRenderCallback = (id) => {
          renders[id] = (renders[id] ?? 0) + 1;
        };
        const { screen, hydrate } = serverRender(
          <Stage>
            <Profiler id="idle" onRender={count}>
              <Button>Save</Button>
            </Profiler>
            <Profiler id="busy" onRender={count}>
              <Button loading>Send</Button>
            </Profiler>
          </Stage>,
        );
        const errors = hydrate();
        const busy = screen.getByRole("button", { name: "Send" });
        await expect.element(busy).not.toHaveAttribute("data-unhydrated");
        await settle(100);
        expect(renders).toEqual({ idle: 1, busy: 2 });
        expect(errors).toEqual([]);
      });

      test("a disabled or busy link cannot be followed, and Tab passes it", async () => {
        const { screen, hydrate } = serverRender(
          <Stage>
            <Button>Before</Button>
            <Button asChild disabled>
              <a href="#previous">Previous page</a>
            </Button>
            <Button asChild loading>
              <a href="#next">Next page</a>
            </Button>
            <Button>After</Button>
          </Stage>,
        );
        const hash = location.hash;
        const before = screen.getByRole("button", { name: "Before" });
        const next = screen.getByRole("link", { name: "Next page" });

        await screen.getByRole("link", { name: "Previous page" }).click({ force: true });
        await next.click({ force: true });
        expect(location.hash).toBe(hash);
        await before.click();
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "After" })).toHaveFocus();

        // Once hydrated, the busy link is back in the Tab order, and still is not followed.
        const errors = hydrate();
        await expect.element(next).not.toHaveAttribute("data-unhydrated");
        await before.click();
        await userEvent.tab();
        await expect.element(next).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await next.click({ force: true });
        expect(location.hash).toBe(hash);
        expect(errors).toEqual([]);
      });
    });

    describe("pointer and touch", () => {
      test("with a mouse, only the visible button can be hit", async () => {
        const screen = await render(
          <Stage density="compact">
            <Button size="sm">Save</Button>
          </Stage>,
        );
        const button = screen.getByRole("button", { name: "Save" }).element();
        const rect = button.getBoundingClientRect();
        expect(matchMedia("(pointer: coarse)").matches).toBe(false);
        expect(document.elementFromPoint(center(rect).x, rect.top - 2)).not.toBe(button);
      });
    });

    describe("system preferences", () => {
      test("without a data-theme, the button follows the system's color scheme", async () => {
        await withMedia({ colorScheme: "dark" }, async () => {
          const screen = await render(<Button>Save</Button>);
          const style = computed(screen.getByRole("button").element());
          expect(style.backgroundColor).toBe(color("button.secondary.bg.default", "dark"));
          expect(style.color).toBe(color("button.secondary.fg", "dark"));
        });
      });
    });
  });
}

/**
 * The Button on a touch screen. These tests run in projects of their own, after every other
 * component test (vitest.config.ts): Chromium does not give a page its mouse back once a touch
 * screen was turned on in it.
 */
export function describeButtonOnTouchScreens(environment: string) {
  describe(`Button, ${environment}`, () => {
    beforeEach(parkPointer);

    describe("pointer and touch", () => {
      test("on a touch screen, a small button can be hit across the minimum target, and has no hover state", async (context) => {
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
            <Stage density="compact">
              <Button size="sm" variant="primary" aria-label="Delete page" leadingIcon={<Dot />} />
            </Stage>,
          );
          const locator = screen.getByRole("button", { name: "Delete page" });
          const button = locator.element();
          const rect = button.getBoundingClientRect();
          const { x, y } = center(rect);
          // How far the target reaches beyond each edge of the visible button.
          const reach = (number("button.target-minimum") - rect.height) / 2;
          expect(rect.height).toBe(number("button.height.sm", "compact"));
          expect(reach).toBeGreaterThan(0);

          expect(document.elementFromPoint(x, rect.top - reach + 1)).toBe(button);
          expect(document.elementFromPoint(x, rect.bottom + reach - 1)).toBe(button);
          expect(document.elementFromPoint(rect.left - reach + 1, y)).toBe(button);
          expect(document.elementFromPoint(rect.right + reach - 1, y)).toBe(button);
          expect(document.elementFromPoint(x, rect.top - reach - 1)).not.toBe(button);
          expect(document.elementFromPoint(rect.right + reach + 1, y)).not.toBe(button);

          await locator.hover();
          await settle(250);
          expect(computed(button).backgroundColor).toBe(color("button.primary.bg.default"));
        } finally {
          await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
        }
      });
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = () => [
  <Button key="label">Save</Button>,
  <Button key="name" aria-label="Delete page" leadingIcon={<Dot />} />,
  <Button key="labelled" aria-labelledby="heading" leadingIcon={<Dot />} />,
  // @ts-expect-error A button with no label needs an accessible name.
  <Button key="unnamed" leadingIcon={<Dot />} />,
  // @ts-expect-error "tertiary" is not a variant in the spec.
  <Button key="variant" variant="tertiary">
    Save
  </Button>,
  // @ts-expect-error "xl" is not a size in the spec.
  <Button key="size" size="xl">
    Save
  </Button>,
];
