// The Toast's tests, written against specs/components/toast/spec.yaml. They run once for each
// way an app can load the styles: see the two files that call describeToast.
//
// Expected colors and sizes come from the token source (expected-tokens.js), not from the
// stylesheet, so each comparison covers the whole path from a token to what the browser draws.
// Tests of the timer use a fake clock: Vitest's, in place of setTimeout and Date.
import axe from "axe-core";
import { Component, type ReactNode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";
import { cdp, commands, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Button,
  Toast,
  type ToastOptions,
  ToastProvider,
  type ToastProviderProps,
  useToast,
} from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];

const LABEL = "Notifications";
const DURATION = 6000;
const LONG_MESSAGE =
  "Every message in the Archive folder older than one year was moved to the Deleted folder";
// The long message in Japanese and in Korean, as specs/components/toast/strings.yaml has it.
const LONG_MESSAGE_JA = "1年以上前のメッセージをアーカイブから削除済みフォルダに移動しました";
const LONG_MESSAGE_KO = "1년이 지난 메시지를 보관함에서 휴지통 폴더로 옮겼습니다";
// What may not start a line of Japanese: small kana and the prolonged sound mark, which strict
// line breaking keeps on the line before, and the closing comma and full stop.
const NO_LINE_START_JA = /[ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰ-ㇿー、。]/u;
const ARCHIVED: ToastOptions = { message: "Message archived" };
const WITH_UNDO = (onClick = () => {}): ToastOptions => ({
  message: "Message archived",
  action: { label: "Undo", onClick },
  closeLabel: "Close",
});

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

const computed = (element: Element) => getComputedStyle(element);
const pixels = (value: string) => Number.parseFloat(value);
const rect = (element: Element) => element.getBoundingClientRect();

/** The lines an element's text is drawn on, as the characters of each. */
function lines(element: Element) {
  const lineHeight = pixels(computed(element).lineHeight);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const found: string[] = [];
  let top = Number.NEGATIVE_INFINITY;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    for (let index = 0; index < text.length; index++) {
      const character = text.data.charAt(index);
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const box = range.getBoundingClientRect();
      if (found.length === 0 || (character.trim() !== "" && box.top > top + lineHeight / 2)) {
        found.push("");
        top = box.top;
      }
      found[found.length - 1] += character;
    }
  }
  return found;
}

/** Lets React render and run effects. Animation frames are not faked by the fake clock. */
async function frames(count = 3) {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Moves the pointer to a corner of the page, so that it cannot be over a toast by chance. */
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

/** The `show` of the provider around it, for a test to call. */
let show: (toast: ToastOptions) => void = () => {
  throw new Error("no ToastProvider rendered");
};
function Capture() {
  show = useToast().show;
  return null;
}

/** Shows a toast once, when it is first rendered. */
function ShowOnMount({ toast }: { toast: ToastOptions }) {
  const { show } = useToast();
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on mount.
  useEffect(() => {
    show(toast);
  }, []);
  return null;
}

/** A themed page with a toast provider, as an app would have. */
function Stage({
  mode = "light",
  density,
  dir,
  children,
  ...provider
}: {
  mode?: Mode;
  density?: Density;
  dir?: "ltr" | "rtl";
  children?: ReactNode;
} & Partial<ToastProviderProps>) {
  return (
    <div
      data-testid="stage"
      data-theme={mode}
      data-density={density}
      dir={dir}
      style={{ background: "var(--rc-color-bg-canvas)", padding: 24 }}
    >
      <ToastProvider label={LABEL} {...provider}>
        <Capture />
        {children}
      </ToastProvider>
    </div>
  );
}

/** The open toast on the screen, or null. */
const openToast = () =>
  document.querySelector<HTMLElement>('[data-slot="toast"][data-state="open"]');
/** Any toast in the region, open or leaving. */
const anyToast = () => document.querySelector<HTMLElement>('li[data-slot="toast"]');
const part = (toast: Element, slot: string) => {
  const found = toast.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  if (!found) throw new Error(`no ${slot} in the toast`);
  return found;
};

/** Shows a toast and waits until it is on the screen and has finished entering. */
async function showAndWait(toast: ToastOptions) {
  show(toast);
  await expect.poll(openToast).not.toBeNull();
  const shown = openToast() as HTMLElement;
  await Promise.all(shown.getAnimations().map((animation) => animation.finished));
  return shown;
}

/** Waits, frame by frame, until a condition holds. For tests with a fake clock. */
async function framesUntil(condition: () => boolean, limit = 300) {
  for (let frame = 0; frame < limit && !condition(); frame += 1) await frames(1);
  expect(condition()).toBe(true);
}

/** Waits until no toast is in the region, the last one's exit animation included. */
const gone = () => expect.poll(anyToast).toBeNull();

/** Makes the page hidden or visible, as switching to another tab or app does. */
function setPageHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Catches a render error, so that a test can read it. */
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? (
      <p data-testid="error">{this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

/** A component that asks for toasts with no provider around it. */
function Lonely() {
  useToast();
  return null;
}

export function describeToast(environment: string) {
  describe(`Toast, ${environment}`, () => {
    beforeEach(parkPointer);
    afterEach(() => {
      vi.useRealTimers();
      // Undo setPageHidden: the property on the document shadows the browser's own.
      delete (document as { hidden?: boolean }).hidden;
    });

    describe("semantics", () => {
      test("the toasts are in a region landmark named by the app, empty until a toast is shown", async () => {
        const screen = await render(<Stage />);
        const region = screen.getByRole("region", { name: LABEL });
        await expect.element(region).toBeInTheDocument();
        expect(region.element().querySelector("li")).toBeNull();
      });

      test("a toast shows its message, is announced politely, and does not take focus", async () => {
        const screen = await render(
          <Stage>
            <Button onClick={() => show(ARCHIVED)}>Archive</Button>
          </Stage>,
        );
        const archive = screen.getByRole("button", { name: "Archive" });
        await archive.click();
        await expect.poll(openToast).not.toBeNull();
        const toast = openToast() as HTMLElement;
        expect(part(toast, "toast-message").textContent).toBe("Message archived");
        await expect.element(archive).toHaveFocus();

        // The message alone, in a status region: polite, so it is read after whatever the
        // screen reader is saying.
        const status = screen.getByRole("status");
        await expect.element(status).toHaveTextContent("Message archived");
        await expect.element(status).toHaveAttribute("aria-live", "polite");
        // Radix's own announcement, which would put the region's name before the message, is
        // not in the page.
        expect(document.body.textContent).not.toContain(`${LABEL} Message archived`);
      });

      test("a toast with an action has the action and a named close button", async () => {
        const undo = vi.fn();
        const screen = await render(<Stage />);
        await showAndWait(WITH_UNDO(undo));
        const region = screen.getByRole("region", { name: LABEL });
        await expect.element(region.getByRole("button", { name: "Undo" })).toBeVisible();
        await expect.element(region.getByRole("button", { name: "Close" })).toBeVisible();
        // The cross is decoration: the close button is named by the app.
        expect(
          part(openToast() as HTMLElement, "toast-close-icon").getAttribute("aria-hidden"),
        ).toBe("true");
      });

      test("the action runs, then the toast closes", async () => {
        const undo = vi.fn();
        const screen = await render(<Stage />);
        await showAndWait(WITH_UNDO(undo));
        await screen.getByRole("button", { name: "Undo" }).click();
        expect(undo).toHaveBeenCalledTimes(1);
        await gone();
        await expect.element(screen.getByRole("status")).toHaveTextContent("");
      });

      test("the close button closes the toast, and a toast without an action may have one", async () => {
        const screen = await render(<Stage />);
        await showAndWait({ message: "Link copied", closeLabel: "Close" });
        await screen.getByRole("button", { name: "Close" }).click();
        await gone();
      });

      test("a toast without an action or a close label has no buttons", async () => {
        await render(<Stage />);
        const toast = await showAndWait(ARCHIVED);
        expect(toast.querySelector("button")).toBeNull();
      });

      test("useToast needs a provider", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
          const screen = await render(
            <Boundary>
              <Lonely />
            </Boundary>,
          );
          await expect
            .element(screen.getByTestId("error"))
            .toHaveTextContent("useToast() needs a ToastProvider around the component.");
        } finally {
          logged.mockRestore();
        }
      });
    });

    describe("queue", () => {
      test("toasts are shown one at a time, in the order they were asked for", async () => {
        const screen = await render(<Stage />);
        show({ message: "First", closeLabel: "Close" });
        show({ message: "Second", closeLabel: "Close" });
        show({ message: "Third", closeLabel: "Close" });
        const status = screen.getByRole("status");

        for (const message of ["First", "Second", "Third"]) {
          await expect.poll(() => openToast()?.textContent).toBe(message);
          expect(document.querySelectorAll('li[data-slot="toast"]')).toHaveLength(1);
          await expect.element(status).toHaveTextContent(message);
          await screen.getByRole("button", { name: "Close" }).click();
        }
        await gone();
      });

      test("the same message twice in a row is announced twice", async () => {
        const screen = await render(<Stage />);
        const status = screen.getByRole("status");
        show({ message: "Link copied", closeLabel: "Close" });
        show({ message: "Link copied", closeLabel: "Close" });
        await expect.element(status).toHaveTextContent("Link copied");
        await screen.getByRole("button", { name: "Close" }).click();
        // Cleared between the two, so that the second is a change a screen reader reads.
        await expect.element(status).toHaveTextContent("");
        await expect.element(status).toHaveTextContent("Link copied");
      });
    });

    describe("timing, with a fake clock", () => {
      const fakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });

      test("without an action, a toast closes after 6 seconds", async () => {
        await render(<Stage />);
        fakeClock();
        show(ARCHIVED);
        await frames();
        expect(openToast()).not.toBeNull();
        vi.advanceTimersByTime(DURATION - 1);
        await frames();
        expect(openToast()).not.toBeNull();
        vi.advanceTimersByTime(1);
        await frames();
        expect(openToast()).toBeNull();
        vi.useRealTimers();
        await gone();
      });

      test("with an action, a toast stays until it is used or closed", async () => {
        await render(<Stage />);
        fakeClock();
        show(WITH_UNDO());
        await frames();
        vi.advanceTimersByTime(10 * 60 * 1000);
        await frames();
        expect(openToast()).not.toBeNull();
      });

      test("the timer pauses while a pointer is over the toast, and goes on from where it stopped", async () => {
        await render(<Stage />);
        fakeClock();
        show(ARCHIVED);
        await frames();
        const toast = openToast() as HTMLElement;
        vi.advanceTimersByTime(4000);

        // What the browser sends when a pointer moves onto the toast, and off it.
        toast.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        await frames();
        vi.advanceTimersByTime(60 * 1000);
        await frames();
        expect(openToast()).not.toBeNull();

        toast.dispatchEvent(
          new PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body }),
        );
        await frames();
        vi.advanceTimersByTime(DURATION - 4000 - 1);
        await frames();
        expect(openToast()).not.toBeNull();
        vi.advanceTimersByTime(1);
        await frames();
        expect(openToast()).toBeNull();
      });

      test("the timer pauses while focus is in the toast", async () => {
        await render(<Stage />);
        fakeClock();
        show(ARCHIVED);
        await frames();
        const toast = openToast() as HTMLElement;
        toast.focus();
        await frames();
        vi.advanceTimersByTime(60 * 1000);
        await frames();
        expect(openToast()).not.toBeNull();

        toast.blur();
        await frames();
        vi.advanceTimersByTime(DURATION);
        await frames();
        expect(openToast()).toBeNull();
      });

      test("the timer pauses while the app is in the background", async () => {
        await render(<Stage />);
        fakeClock();
        show(ARCHIVED);
        await frames();
        vi.advanceTimersByTime(1000);
        setPageHidden(true);
        await frames();
        vi.advanceTimersByTime(60 * 1000);
        await frames();
        expect(openToast()).not.toBeNull();

        setPageHidden(false);
        await frames();
        vi.advanceTimersByTime(DURATION - 1000 - 1);
        await frames();
        expect(openToast()).not.toBeNull();
        vi.advanceTimersByTime(1);
        await frames();
        expect(openToast()).toBeNull();
      });

      test("a toast shown while the app is in the background waits for the app to come back", async () => {
        await render(<Stage />);
        fakeClock();
        setPageHidden(true);
        await frames();
        show(ARCHIVED);
        await frames();
        vi.advanceTimersByTime(60 * 1000);
        await frames();
        expect(openToast()).not.toBeNull();
        setPageHidden(false);
        await frames();
        vi.advanceTimersByTime(DURATION);
        await frames();
        expect(openToast()).toBeNull();
      });

      test("the next toast in the queue gets a timer of its own", async () => {
        await render(<Stage />);
        fakeClock();
        show({ message: "First" });
        show({ message: "Second" });
        await frames();
        vi.advanceTimersByTime(DURATION);
        // The first leaves, then the second enters. The animations run on the real clock.
        await framesUntil(() => openToast()?.textContent === "Second");
        await frames();
        vi.advanceTimersByTime(DURATION - 1);
        await frames();
        expect(openToast()?.textContent).toBe("Second");
        vi.advanceTimersByTime(1);
        await frames();
        expect(openToast()).toBeNull();
      });
    });

    describe("keyboard", () => {
      test("F8 moves focus to the toast, and F8 again moves it back", async () => {
        const screen = await render(
          <Stage>
            <Button>Compose</Button>
          </Stage>,
        );
        const compose = screen.getByRole("button", { name: "Compose" });
        await showAndWait(WITH_UNDO());
        await userEvent.tab();
        await expect.element(compose).toHaveFocus();

        await userEvent.keyboard("{F8}");
        expect(document.activeElement).toBe(openToast());
        await userEvent.keyboard("{F8}");
        await expect.element(compose).toHaveFocus();
      });

      test("F8 does nothing when there is no toast", async () => {
        const screen = await render(
          <Stage>
            <Button>Compose</Button>
          </Stage>,
        );
        const compose = screen.getByRole("button", { name: "Compose" });
        await userEvent.tab();
        await userEvent.keyboard("{F8}");
        await expect.element(compose).toHaveFocus();
      });

      test("from the toast, Tab reaches the action and then the close button", async () => {
        const screen = await render(
          <Stage>
            <Button>Compose</Button>
          </Stage>,
        );
        await showAndWait(WITH_UNDO());
        await userEvent.tab();
        await userEvent.keyboard("{F8}");
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "Undo" })).toHaveFocus();
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "Close" })).toHaveFocus();
      });

      test("Escape closes the focused toast, and focus goes back to where it was", async () => {
        const screen = await render(
          <Stage>
            <Button>Compose</Button>
          </Stage>,
        );
        const compose = screen.getByRole("button", { name: "Compose" });
        await showAndWait(WITH_UNDO());
        await userEvent.tab();
        await userEvent.keyboard("{F8}");
        await userEvent.keyboard("{Escape}");
        await gone();
        await expect.element(compose).toHaveFocus();
      });

      test("Enter on the close button closes the toast, and focus goes back", async () => {
        const screen = await render(
          <Stage>
            <Button>Compose</Button>
          </Stage>,
        );
        const compose = screen.getByRole("button", { name: "Compose" });
        await showAndWait(WITH_UNDO());
        await userEvent.tab();
        await userEvent.keyboard("{F8}");
        await userEvent.tab();
        await userEvent.tab();
        await userEvent.keyboard("{Enter}");
        await gone();
        await expect.element(compose).toHaveFocus();
      });

      test.each(MODES)("keyboard focus draws a ring around the toast, in %s mode", async (mode) => {
        await render(
          <Stage mode={mode}>
            <Button>Compose</Button>
          </Stage>,
        );
        await showAndWait(WITH_UNDO());
        await userEvent.tab();
        await userEvent.keyboard("{F8}");
        const style = computed(openToast() as HTMLElement);
        expect(style.outlineStyle).toBe("solid");
        expect(pixels(style.outlineWidth)).toBe(number("button.focus-ring.width"));
        expect(pixels(style.outlineOffset)).toBe(number("button.focus-ring.offset"));
        expect(style.outlineColor).toBe(color("button.focus-ring.color", mode));
      });
    });

    describe("swipe", () => {
      test("a swipe down closes the toast, and a short one does not", async (context) => {
        // Chromium alone can turn a touch screen on in a page that is already open.
        context.skip(server.browser !== "chromium", "touch emulation needs Chromium");
        // Leave room below the toast to swipe into.
        await render(<Stage bottomInset={240} />);
        const toast = await showAndWait(WITH_UNDO());
        // Input goes to the page, which holds this test's frame.
        const frame = (window.frameElement as HTMLElement | null)?.getBoundingClientRect();
        const scale = frame ? frame.width / innerWidth : 1;
        const at = (x: number, y: number) => ({
          x: (frame?.left ?? 0) + x * scale,
          y: (frame?.top ?? 0) + y * scale,
        });
        const box = rect(toast);
        const start = { x: box.left + box.width / 2, y: box.top + 8 };
        const swipe = async (distance: number) => {
          await cdp().send("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 1,
          });
          try {
            await cdp().send("Input.dispatchTouchEvent", {
              type: "touchStart",
              touchPoints: [at(start.x, start.y)],
            });
            for (let step = 1; step <= 5; step += 1) {
              await cdp().send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [at(start.x, start.y + (distance * step) / 5)],
              });
            }
            await cdp().send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          } finally {
            await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
          }
        };

        await swipe(20);
        await frames();
        expect(openToast()).not.toBeNull();
        // It went back to where it was.
        expect(openToast()?.style.translate).toBe("");

        await swipe(120);
        await gone();
      });
    });

    describe.each(MODES)("colors in %s mode", (mode) => {
      test("the toast is drawn with its tokens", async () => {
        await render(<Stage mode={mode} />);
        const toast = await showAndWait(WITH_UNDO());
        const style = computed(toast);
        expect(style.backgroundColor).toBe(color("toast.bg", mode));
        expect(style.borderTopColor).toBe(color("toast.border.color", mode));
        expect(style.borderTopStyle).toBe("solid");
        expect(style.color).toBe(color("toast.fg", mode));
        expect(style.boxShadow).toBe(token("toast.shadow", mode));
        expect(computed(part(toast, "toast-message")).color).toBe(color("toast.fg", mode));
        // The action and the close button are ghost Buttons.
        for (const slot of ["toast-action", "toast-close"]) {
          const button = computed(part(toast, slot));
          expect(button.backgroundColor).toBe("rgba(0, 0, 0, 0)");
          expect(button.color).toBe(color("button.ghost.fg", mode));
        }
      });

      test("has no accessibility violations", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Button>Compose</Button>
          </Stage>,
        );
        await showAndWait(WITH_UNDO());
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
        expect(results.passes.map(({ id }) => id)).toContain("color-contrast");
      });
    });

    describe.each(DENSITIES)("measurements at %s density", (density) => {
      test("the container, the message, and the buttons", async () => {
        await render(<Stage density={density} />);
        const toast = await showAndWait(WITH_UNDO());
        const style = computed(toast);
        expect(pixels(style.paddingTop)).toBe(number("toast.padding-block", density));
        expect(pixels(style.paddingBottom)).toBe(number("toast.padding-block", density));
        expect(pixels(style.paddingInlineStart)).toBe(number("toast.padding-inline", density));
        expect(pixels(style.paddingInlineEnd)).toBe(number("toast.padding-inline", density));
        expect(pixels(style.columnGap)).toBe(number("toast.gap", density));
        expect(pixels(style.borderTopWidth)).toBe(number("toast.border.width"));
        expect(pixels(style.borderTopLeftRadius)).toBe(number("toast.radius"));
        expect(pixels(style.maxWidth)).toBe(number("toast.max-width"));

        const message = part(toast, "toast-message");
        const text = computed(message);
        expect(text.fontFamily).toContain(String(token("toast.message.font-family")));
        expect(pixels(text.fontSize)).toBe(number("toast.message.font-size"));
        expect(text.fontWeight).toBe(token("toast.message.font-weight"));
        expect(pixels(text.lineHeight)).toBeCloseTo(number("toast.message.line-height"), 2);

        // Both buttons are small; the close button is square, with its cross at the icon size.
        const action = rect(part(toast, "toast-action"));
        const close = rect(part(toast, "toast-close"));
        const height = number("button.height.sm", density);
        expect(action.height).toBeCloseTo(height, 2);
        expect(close.height).toBeCloseTo(height, 2);
        expect(close.width).toBeCloseTo(height, 2);
        const cross = rect(part(toast, "toast-close-icon"));
        expect(cross.width).toBe(number("button.icon-size.sm"));

        // One line: the toast is as tall as a small button and its padding, and the message is
        // centered on the buttons.
        const box = rect(toast);
        const border = number("toast.border.width");
        expect(box.height).toBeCloseTo(
          height + 2 * number("toast.padding-block", density) + 2 * border,
          1,
        );
        const line = rect(message);
        expect(line.top + line.height / 2).toBeCloseTo(action.top + action.height / 2, 0);
        // In left-to-right, the action follows the message, and the close button comes last.
        expect(line.right).toBeLessThanOrEqual(action.left);
        expect(action.right).toBeLessThanOrEqual(close.left);
      });
    });

    describe("placement", () => {
      test("at the bottom center of the window, its margin from the edge", async () => {
        await render(<Stage />);
        const box = rect(await showAndWait(ARCHIVED));
        const margin = number("toast.margin");
        expect(box.bottom).toBeCloseTo(innerHeight - margin, 0);
        expect(box.left + box.width / 2).toBeCloseTo(innerWidth / 2, 0);
      });

      test("above a bar the app keeps at the bottom", async () => {
        await render(<Stage bottomInset={64} />);
        const box = rect(await showAndWait(ARCHIVED));
        expect(box.bottom).toBeCloseTo(innerHeight - 64 - number("toast.margin"), 0);
      });

      test("above the on-screen keyboard", async () => {
        // A visible part of the page that the keyboard has shortened, as a phone reports it.
        const shown = Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0 });
        const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
        Object.defineProperty(window, "visualViewport", { configurable: true, value: shown });
        try {
          await render(<Stage bottomInset={64} />);
          await showAndWait(ARCHIVED);
          shown.height = innerHeight - 300;
          shown.dispatchEvent(new Event("resize"));
          await frames();
          const box = rect(openToast() as HTMLElement);
          // The keyboard covers the bar, so only the keyboard counts.
          expect(box.bottom).toBeCloseTo(innerHeight - 300 - number("toast.margin"), 0);
        } finally {
          if (original) Object.defineProperty(window, "visualViewport", original);
          else delete (window as { visualViewport?: unknown }).visualViewport;
        }
      });

      test("the space beside the toast takes no clicks: they reach the page", async () => {
        await render(<Stage />);
        const box = rect(await showAndWait(ARCHIVED));
        const beside = document.elementFromPoint(box.left / 2, box.top + box.height / 2);
        expect(beside?.closest('[data-slot="toast-viewport"]')).toBeNull();
      });
    });

    describe("layout", () => {
      test("a long message wraps, and the action moves below it, at the end", async () => {
        await render(<Stage />);
        const toast = await showAndWait({ ...WITH_UNDO(), message: LONG_MESSAGE });
        const box = rect(toast);
        const message = rect(part(toast, "toast-message"));
        const action = rect(part(toast, "toast-action"));
        const close = rect(part(toast, "toast-close"));
        const lineHeight = number("toast.message.line-height");

        // The toast is as wide as it may be, and the message takes more than one line.
        expect(box.width).toBeCloseTo(number("toast.max-width"), 0);
        expect(message.height).toBeGreaterThan(1.5 * lineHeight);
        expect(part(toast, "toast-message").scrollWidth).toBeLessThanOrEqual(message.width);
        // The action is below the message, at the end of the message's column; the close button
        // stays at the end of the first line.
        expect(action.top).toBeGreaterThanOrEqual(message.bottom);
        expect(action.right).toBeCloseTo(message.right, 0);
        expect(close.top).toBeLessThan(message.top + lineHeight);
        expect(close.left).toBeGreaterThan(message.right);
      });

      test("in right-to-left, the action and the close button are on the left", async () => {
        await render(<Stage dir="rtl" />);
        const toast = await showAndWait(WITH_UNDO());
        const message = rect(part(toast, "toast-message"));
        const action = rect(part(toast, "toast-action"));
        const close = rect(part(toast, "toast-close"));
        expect(action.right).toBeLessThanOrEqual(message.left);
        expect(close.right).toBeLessThanOrEqual(action.left);
        // Still centered.
        const box = rect(toast);
        expect(box.left + box.width / 2).toBeCloseTo(innerWidth / 2, 0);
      });

      /** The lines of a long message, in a toast drawn at every width from narrow to wide. */
      async function messageLinesAtEveryWidth(lang: string, message: string) {
        const screen = await render(
          <div data-testid="holder" data-theme="light" lang={lang}>
            <Toast message={message} />
          </div>,
        );
        const holder = screen.getByTestId("holder").element() as HTMLElement;
        const element = part(screen.container, "toast-message");
        const found: string[][] = [];
        for (let width = 160; width <= 480; width += 4) {
          holder.style.width = `${width}px`;
          found.push(lines(element));
        }
        // Guard against a run that broke no line.
        expect(found.filter((each) => each.length > 1).length).toBeGreaterThan(found.length / 2);
        expect(found.every((each) => each.join("") === message)).toBe(true);
        return { style: computed(element), found };
      }

      test("a Korean message breaks only between words", async () => {
        const { style, found } = await messageLinesAtEveryWidth("ko", LONG_MESSAGE_KO);
        const ended = found.flatMap((each) => each.slice(0, -1));
        expect(ended.filter((line) => !line.endsWith(" "))).toEqual([]);
        expect(style.wordBreak).toBe("keep-all");
      });

      test("a Japanese message never starts a line with a small kana or a prolonged sound mark", async () => {
        const { style, found } = await messageLinesAtEveryWidth("ja", LONG_MESSAGE_JA);
        const later = found.flatMap((each) => each.slice(1));
        expect(later.filter((line) => NO_LINE_START_JA.test(line.charAt(0)))).toEqual([]);
        expect(style.lineBreak).toBe("strict");
        // Japanese has no spaces, so its lines still break between characters.
        expect(style.wordBreak).toBe("normal");
      });

      test("lines of other languages break by the default rules", async () => {
        const { style } = await messageLinesAtEveryWidth("en", LONG_MESSAGE);
        expect(style.lineBreak).toBe("auto");
        expect(style.wordBreak).toBe("normal");
      });
    });

    describe("motion", () => {
      test("it enters and leaves with the motion tokens, sliding as it fades", async () => {
        const screen = await render(<Stage />);
        const toast = await showAndWait(WITH_UNDO());
        let style = computed(toast);
        expect(style.animationName).toBe("rc-toast-enter");
        expect(style.animationDuration).toBe(`${number("toast.enter.duration")}s`);
        expect(style.animationTimingFunction).toBe(token("toast.enter.easing"));

        await screen.getByRole("button", { name: "Close" }).click();
        style = computed(toast);
        expect(style.animationName).toBe("rc-toast-exit");
        expect(style.animationDuration).toBe(`${number("toast.exit.duration")}s`);
        expect(style.animationTimingFunction).toBe(token("toast.exit.easing"));
        await gone();
      });

      test("with reduced motion, it only fades", async () => {
        await withMedia({ reducedMotion: "reduce" }, async () => {
          const screen = await render(<Stage />);
          const toast = await showAndWait(WITH_UNDO());
          expect(computed(toast).animationName).toBe("rc-toast-fade-in");
          await screen.getByRole("button", { name: "Close" }).click();
          expect(computed(toast).animationName).toBe("rc-toast-fade-out");
          await gone();
        });
      });
    });

    describe("server-rendered", () => {
      const cleanups: (() => void)[] = [];
      afterEach(() => {
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
      });

      test("the provider renders on a server, hydrates without a mismatch, then shows toasts", async () => {
        const ui = (
          <Stage>
            <p>The app</p>
          </Stage>
        );
        const container = document.createElement("div");
        container.innerHTML = renderToString(ui);
        document.body.append(container);
        const screen = page.elementLocator(container);
        // Before any JavaScript runs, the region and the status region are there, empty.
        await expect.element(screen.getByRole("region", { name: LABEL })).toBeInTheDocument();
        await expect.element(screen.getByRole("status")).toHaveTextContent("");

        const errors: unknown[] = [];
        const logged = vi
          .spyOn(console, "error")
          .mockImplementation((...args) => errors.push(args));
        const root = hydrateRoot(container, ui, {
          onRecoverableError: (error) => errors.push(error),
        });
        cleanups.push(() => {
          root.unmount();
          container.remove();
          logged.mockRestore();
        });
        await frames();
        show(ARCHIVED);
        await expect.element(screen.getByRole("status")).toHaveTextContent("Message archived");
        expect(errors).toEqual([]);
      });
    });

    describe("Toast, standing still", () => {
      test("draws the same toast without a provider: no timer, no announcement", async () => {
        const onClose = vi.fn();
        const screen = await render(
          <div data-theme="light">
            <Toast {...WITH_UNDO()} onClose={onClose} />
          </div>,
        );
        const toast = screen.container.querySelector('[data-slot="toast"]') as HTMLElement;
        expect(computed(toast).backgroundColor).toBe(color("toast.bg"));
        expect(computed(toast).animationName).toBe("none");
        expect(screen.container.querySelector('[role="status"]')).toBeNull();
        await screen.getByRole("button", { name: "Close" }).click();
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    describe("system preferences", () => {
      test("without a data-theme, the toast follows the system's color scheme", async () => {
        await withMedia({ colorScheme: "dark" }, async () => {
          await render(
            <ToastProvider label={LABEL}>
              <ShowOnMount toast={ARCHIVED} />
            </ToastProvider>,
          );
          await expect.poll(openToast).not.toBeNull();
          const style = computed(openToast() as HTMLElement);
          expect(style.backgroundColor).toBe(color("toast.bg", "dark"));
          expect(style.color).toBe(color("toast.fg", "dark"));
        });
      });
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = () => [
  <ToastProvider key="provider" label="Notifications" />,
  // @ts-expect-error The region needs a name from the app.
  <ToastProvider key="unnamed" />,
  <Toast key="plain" message="Message archived" />,
  <Toast
    key="action"
    message="Message archived"
    action={{ label: "Undo", onClick: () => {} }}
    closeLabel="Close"
  />,
  // @ts-expect-error A toast with an action needs a named close button.
  <Toast key="no-close" message="Message archived" action={{ label: "Undo", onClick: () => {} }} />,
];
