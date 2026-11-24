// The Input's tests, written against specs/components/input/spec.yaml. They run once for each
// way an app can load the styles: see the two files that call describeInput.
//
// Expected colors and sizes come from the token source (expected-tokens.js), not from the
// stylesheet, so each comparison covers the whole path from a token to what the browser draws.
import axe from "axe-core";
import { createRef, type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";
import { cdp, commands, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { INPUT_SIZES, INPUT_TYPES, Input, type InputProps } from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];

const LONG_TEXT =
  "Write the address where the invoice should go, including the floor and the name of the building";
const STAGE_PADDING = 24;

const expected = inject("tokens");

function token(id: string, mode: Mode = "light", density: Density = "comfortable") {
  const value = expected[`${mode}/${density}`]?.[id];
  if (value === undefined) throw new Error(`no expected value for ${id} in ${mode}/${density}`);
  return value;
}
/** A color token as the browser reports it: "rgb(247, 210, 42)". */
const color = (id: string, mode?: Mode) => String(token(id, mode));
/** A dimension token in CSS pixels. */
const number = (id: string, density?: Density) => Number(token(id, "light", density));

/** A themed surface for the component under test, as an app would provide. */
function Stage({
  mode = "light",
  density,
  dir,
  width = 400,
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
        display: "flex",
        flexDirection: "column",
        gap: STAGE_PADDING,
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

const computed = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);
const pixels = (value: string) => Number.parseFloat(value);
const settle = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** The parts of the Input around a control. */
function parts(control: Element) {
  const root = control.closest('[data-slot="input"]') as HTMLElement;
  const part = (slot: string) => root.querySelector(`[data-slot="input-${slot}"]`) as HTMLElement;
  return {
    root,
    label: part("label"),
    description: part("description"),
    field: part("field"),
    icon: part("icon"),
    error: part("error"),
  };
}

/** Moves the pointer off every field, so one test's hover cannot carry into the next. */
const parkPointer = () => commands.movePointerAway();

type Media = Parameters<typeof commands.emulateMedia>[0];
/** Runs with a system setting emulated, such as `{ colorScheme: "dark" }`. */
async function withMedia(media: Media, run: () => Promise<void>) {
  await commands.emulateMedia(media);
  try {
    await run();
  } finally {
    await commands.emulateMedia(Object.fromEntries(Object.keys(media).map((name) => [name, null])));
  }
}

/** Whether the browser can size a multi-line field to its content: Chromium can. */
const sizesToContent = () => CSS.supports("field-sizing", "content");

/**
 * Runs with the text size enlarged by `scale`: a larger root font size, as a browser's text
 * size setting sets. The snapshots draw the largest text size the same way.
 */
async function withTextSize(scale: number, run: () => Promise<void>) {
  document.documentElement.style.fontSize = `${scale * 100}%`;
  try {
    await run();
  } finally {
    document.documentElement.style.fontSize = "";
  }
}

/** Undoes what serverRender set up. */
const serverRendered: (() => void)[] = [];

/**
 * Puts the HTML that React renders on a server into the page, as a browser receives it.
 * `hydrate` then lets React take the HTML over and returns the errors React reports.
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

/** What an input method sends while it composes and commits text, as events. */
const ime = {
  start(control: HTMLElement) {
    control.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
  },
  /** The input method writes `text` into the field, as it does for each key of a composition. */
  update(control: HTMLInputElement | HTMLTextAreaElement, text: string) {
    control.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: text }));
    // The prototype's setter, which is what the browser uses: React watches the element's own.
    const prototype = Object.getPrototypeOf(control);
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(control, text);
    control.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        isComposing: true,
        inputType: "insertCompositionText",
        data: text,
      }),
    );
  },
  end(control: HTMLElement, text: string) {
    control.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: text }));
  },
  /**
   * A key press of Enter, with the key code a browser gives it: 229 for a key an input method
   * takes. Returns whether something prevented what the key would do.
   */
  enter(
    control: HTMLElement,
    { keyCode, isComposing = false }: { keyCode: number; isComposing?: boolean },
  ) {
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
      isComposing,
    });
    // Not every browser takes the legacy key code from the event's options.
    Object.defineProperty(event, "keyCode", { value: keyCode });
    control.dispatchEvent(event);
    return event.defaultPrevented;
  },
};

/** A field whose value the app holds, as most forms do, and checks as it changes. */
function CheckedField({ onValue }: { onValue?: (value: string) => void }) {
  const [value, setValue] = useState("");
  const invalid = value.length > 0 && !value.includes("@");
  return (
    <Input
      label="Email"
      type="email"
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onValue?.(event.target.value);
      }}
      invalid={invalid}
      error="Enter an email address, like name@example.com"
    />
  );
}

export function describeInput(environment: string) {
  describe(`Input, ${environment}`, () => {
    beforeEach(parkPointer);

    describe("semantics", () => {
      test("is a text field named by its label, with the defaults of the spec", async () => {
        const screen = await render(
          <Stage>
            <Input label="Full name" />
          </Stage>,
        );
        const field = screen.getByRole("textbox", { name: "Full name" });
        await expect.element(field).toBeVisible();
        await expect.element(field).toHaveAttribute("type", "text");
        expect(field.element().tagName).toBe("INPUT");
        expect(parts(field.element()).root.getAttribute("data-size")).toBe("md");
        // Nothing else is said about it until there is something to say.
        await expect.element(field).not.toHaveAttribute("aria-describedby");
        await expect.element(field).not.toHaveAttribute("aria-invalid");
        await expect.element(field).not.toBeRequired();
        // The label is a label for the field, so a click on it focuses the field.
        await screen.getByText("Full name").click();
        await expect.element(field).toHaveFocus();
      });

      test("a hidden label is still the name, and takes no room", async () => {
        const screen = await render(
          <Stage>
            <Input label="Search the docs" labelHidden type="search" />
          </Stage>,
        );
        const field = screen.getByRole("searchbox", { name: "Search the docs" });
        const { label, root } = parts(field.element());
        expect(label.getBoundingClientRect().height).toBeLessThanOrEqual(1);
        expect(root.getBoundingClientRect().height).toBeCloseTo(number("input.height.md"), 2);
      });

      test("the description and then the error describe the field, and the error shows only while invalid", async () => {
        const props = {
          label: "Email",
          description: "We send the receipt here.",
          "aria-describedby": "from-the-app",
        };
        const error = "Enter an email address, like name@example.com";
        const screen = await render(
          <Stage>
            <Input {...props} error={error} />
          </Stage>,
        );
        const field = screen.getByRole("textbox", { name: "Email" });
        const id = field.element().id;
        await expect
          .element(field)
          .toHaveAttribute("aria-describedby", `${id}-description from-the-app`);
        await expect.element(field).toHaveAccessibleDescription("We send the receipt here.");
        await expect.element(field).not.toHaveAttribute("aria-invalid");
        expect(screen.container.textContent).not.toContain(error);

        await screen.rerender(
          <Stage>
            <Input {...props} invalid error={error} />
          </Stage>,
        );
        await expect.element(field).toHaveAttribute("aria-invalid", "true");
        await expect
          .element(field)
          .toHaveAttribute("aria-describedby", `${id}-description ${id}-error from-the-app`);
        await expect
          .element(field)
          .toHaveAccessibleDescription(`We send the receipt here. ${error}`);
        // The error is below the field, and the description stays.
        const { description, field: box, error: message } = parts(field.element());
        expect(description.getBoundingClientRect().bottom).toBeLessThan(
          box.getBoundingClientRect().top,
        );
        expect(message.getBoundingClientRect().top).toBeGreaterThan(
          box.getBoundingClientRect().bottom,
        );
        // Errors are not announced as they appear: the message is not a live region.
        expect(message.closest("[aria-live], [role=alert], [role=status]")).toBeNull();
      });

      test("required is the field's required state", async () => {
        const screen = await render(
          <Stage>
            <Input label="Full name" required />
          </Stage>,
        );
        await expect.element(screen.getByRole("textbox", { name: "Full name" })).toBeRequired();
      });

      test("each type is the input type of the same name; email, phone, and web address fields stay left-to-right", async () => {
        const screen = await render(
          <Stage dir="rtl">
            {INPUT_TYPES.map((type) => (
              <Input key={type} label={type} type={type} />
            ))}
          </Stage>,
        );
        for (const type of INPUT_TYPES) {
          const control = screen.getByLabelText(type, { exact: true }).element();
          expect(control.getAttribute("type")).toBe(type);
          const { field, label } = parts(control);
          const ltr = ["email", "tel", "url"].includes(type);
          expect(computed(field).direction, type).toBe(ltr ? "ltr" : "rtl");
          expect(computed(control).direction, type).toBe(ltr ? "ltr" : "rtl");
          // The label follows the layout.
          expect(computed(label).direction, type).toBe("rtl");
        }
      });

      test("passes a ref, the id, the name, and other attributes to the field, and the class to the whole", async () => {
        const ref = createRef<HTMLInputElement>();
        const screen = await render(
          <Stage>
            <Input
              ref={ref}
              label="Email"
              id="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              className="from-the-app"
            />
          </Stage>,
        );
        const field = screen.getByRole("textbox", { name: "Email" });
        expect(ref.current).toBe(field.element());
        await expect.element(field).toHaveAttribute("id", "email");
        await expect.element(field).toHaveAttribute("name", "email");
        await expect.element(field).toHaveAttribute("autocomplete", "email");
        await expect.element(field).toHaveAttribute("placeholder", "name@example.com");
        expect(parts(field.element()).root.classList).toContain("from-the-app");
        expect(field.element().classList).not.toContain("from-the-app");
      });

      test("takes typing, and the app can hold the value", async () => {
        const onValue = vi.fn();
        const screen = await render(
          <Stage>
            <CheckedField onValue={onValue} />
          </Stage>,
        );
        const field = screen.getByRole("textbox", { name: "Email" });
        await userEvent.type(field, "ana");
        await expect.element(field).toHaveValue("ana");
        expect(onValue).toHaveBeenLastCalledWith("ana");
      });
    });

    describe("multi-line", () => {
      test("is a text area that starts three lines tall and takes Enter as a new line", async () => {
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        const screen = await render(
          <Stage>
            <form onSubmit={onSubmit}>
              <Input label="Message" multiline />
            </form>
          </Stage>,
        );
        const field = screen.getByRole("textbox", { name: "Message" });
        expect(field.element().tagName).toBe("TEXTAREA");
        await expect.element(field).toHaveAttribute("rows", "3");
        const { field: box } = parts(field.element());
        const line = number("input.value.md.line-height");
        expect(box.getBoundingClientRect().height).toBeCloseTo(
          number("input.height.md") + 2 * line,
          0,
        );

        await userEvent.type(field, "First{Enter}Second");
        await expect.element(field).toHaveValue("First\nSecond");
        expect(onSubmit).not.toHaveBeenCalled();
      });

      test("grows with its content where the browser can size it, and can be made taller where it cannot", async () => {
        const screen = await render(
          <Stage>
            <Input label="Message" multiline rows={2} />
            <Input label="Subject" />
          </Stage>,
        );
        const area = screen.getByRole("textbox", { name: "Message" }).element() as HTMLElement;
        const box = parts(area).field;
        const line = number("input.value.md.line-height");
        const start = box.getBoundingClientRect().height;
        expect(start).toBeCloseTo(number("input.height.md") + line, 0);

        await userEvent.type(area, "One{Enter}Two{Enter}Three{Enter}Four");
        if (sizesToContent()) {
          // The person need not resize it, and nothing scrolls inside it.
          expect(computed(area).resize).toBe("none");
          expect(box.getBoundingClientRect().height).toBeCloseTo(start + 2 * line, 0);
          expect(area.scrollHeight).toBeLessThanOrEqual(area.clientHeight);
        } else {
          expect(computed(area).resize).toBe("vertical");
          expect(box.getBoundingClientRect().height).toBeCloseTo(start, 0);
        }

        // The first line sits where a one-line field's text does.
        const padding = (number("input.height.md") - line) / 2 - number("input.border-width");
        expect(pixels(computed(area).paddingTop)).toBeCloseTo(padding, 2);
      });

      test("the number of rows sets the height it starts at", async () => {
        const screen = await render(
          <Stage>
            <Input label="Note" multiline rows={5} size="sm" />
          </Stage>,
        );
        const area = screen.getByRole("textbox", { name: "Note" }).element();
        const line = number("input.value.sm.line-height");
        expect(parts(area).field.getBoundingClientRect().height).toBeCloseTo(
          number("input.height.sm") + 4 * line,
          0,
        );
      });
    });

    describe("keyboard and states", () => {
      test("Tab reaches a read-only field and skips a disabled one", async () => {
        const screen = await render(
          <Stage>
            <Input label="First" />
            <Input label="Unavailable" disabled />
            <Input label="Account number" readOnly defaultValue="DE89 3704 0044" />
            <Input label="Last" />
          </Stage>,
        );
        await screen.getByRole("textbox", { name: "First" }).click();
        const names = [];
        for (let press = 0; press < 2; press++) {
          await userEvent.tab();
          names.push((document.activeElement as HTMLInputElement).labels?.[0]?.textContent);
        }
        expect(names).toEqual(["Account number", "Last"]);
      });

      test("a disabled field cannot be focused or changed, also through a disabled fieldset", async () => {
        const screen = await render(
          <Stage>
            <Input label="Unavailable" disabled defaultValue="Kept" />
            <fieldset disabled>
              <Input label="In a fieldset" />
            </fieldset>
          </Stage>,
        );
        for (const name of ["Unavailable", "In a fieldset"]) {
          const field = screen.getByRole("textbox", { name });
          await expect.element(field).toBeDisabled();
          await field.click({ force: true });
          await expect.element(field).not.toHaveFocus();
          expect(computed(parts(field.element()).field).backgroundColor).toBe(
            color("input.bg.disabled"),
          );
        }
      });

      test("a read-only field can be focused and selected, but not changed", async () => {
        const screen = await render(
          <Stage>
            <Input label="Account number" readOnly defaultValue="DE89 3704 0044" />
          </Stage>,
        );
        const field = screen.getByRole("textbox", { name: "Account number" });
        await expect.element(field).toHaveAttribute("readonly");
        await field.click();
        await expect.element(field).toHaveFocus();
        await userEvent.keyboard("abc");
        await expect.element(field).toHaveValue("DE89 3704 0044");
        (field.element() as HTMLInputElement).select();
        expect(getSelection()?.toString() || (field.element() as HTMLInputElement).value).toBe(
          "DE89 3704 0044",
        );
      });

      test("Enter in a one-line field submits its form, as the browser does", async () => {
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        const screen = await render(
          <Stage>
            <form onSubmit={onSubmit}>
              <Input label="Email" type="email" />
            </form>
          </Stage>,
        );
        await screen.getByRole("textbox", { name: "Email" }).click();
        await userEvent.keyboard("{Enter}");
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    describe("input methods", () => {
      test("Enter that commits a composition does not submit the form", async () => {
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        const onKeyDown = vi.fn();
        const screen = await render(
          <Stage>
            <form onSubmit={onSubmit}>
              <Input label="Name" onKeyDown={onKeyDown} />
            </form>
          </Stage>,
        );
        const locator = screen.getByRole("textbox", { name: "Name" });
        const control = locator.element() as HTMLInputElement;
        control.focus();

        // Vietnamese Telex: "d", "đ", "đa", "đâ", "đây".
        ime.start(control);
        for (const text of ["d", "đ", "đa", "đâ", "đây"]) ime.update(control, text);
        // Chromium and Firefox: Enter commits the composition while it is still composing.
        expect(ime.enter(control, { isComposing: true, keyCode: 229 })).toBe(true);
        ime.end(control, "đây");
        // Safari sends that Enter after the composition has ended, as key code 229.
        expect(ime.enter(control, { keyCode: 229 })).toBe(true);
        await settle(50);
        expect(onSubmit).not.toHaveBeenCalled();
        // The app still hears every key.
        expect(onKeyDown).toHaveBeenCalledTimes(2);

        // Any other Enter is left to the browser, which submits the form.
        expect(ime.enter(control, { keyCode: 13 })).toBe(false);
        await locator.click();
        await userEvent.keyboard("{Enter}");
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      test("the value is the input method's, and the error state waits until the composition ends", async () => {
        const values: string[] = [];
        const screen = await render(
          <Stage>
            <CheckedField onValue={(value) => values.push(value)} />
          </Stage>,
        );
        const locator = screen.getByRole("textbox", { name: "Email" });
        const control = locator.element() as HTMLInputElement;
        const errorShown = () => parts(control).error !== null;
        control.focus();

        // Japanese: "な" then "なま", which has no "@", so the app finds it invalid as it changes.
        ime.start(control);
        ime.update(control, "な");
        await expect.element(locator).toHaveValue("な");
        ime.update(control, "なま");
        await expect.element(locator).toHaveValue("なま");
        await settle(50);
        // The app was told each change, and nothing replaced what the input method wrote.
        expect(values).toEqual(["な", "なま"]);
        expect(control.value).toBe("なま");
        // The field shows no error while the character is not finished.
        expect(errorShown()).toBe(false);
        await expect.element(locator).not.toHaveAttribute("aria-invalid");

        ime.end(control, "なま");
        await expect.element(locator).toHaveAttribute("aria-invalid", "true");
        expect(errorShown()).toBe(true);
        expect(control.value).toBe("なま");
      });

      test("an error that is shown stays while a composition fixes it, and clears when it ends", async () => {
        const screen = await render(
          <Stage>
            <CheckedField />
          </Stage>,
        );
        const locator = screen.getByRole("textbox", { name: "Email" });
        await userEvent.type(locator, "ana");
        await expect.element(locator).toHaveAttribute("aria-invalid", "true");
        const control = locator.element() as HTMLInputElement;

        ime.start(control);
        ime.update(control, "ana@");
        await settle(50);
        await expect.element(locator).toHaveAttribute("aria-invalid", "true");
        ime.end(control, "@");
        await expect.element(locator).not.toHaveAttribute("aria-invalid");
      });
    });

    describe.each(MODES)("colors in %s mode", (mode) => {
      test("at rest, the field, its text, and the placeholder take their tokens, and hover changes nothing", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Input
              label="Email"
              description="We send the receipt here."
              placeholder="name@example.com"
              leadingIcon={<Dot id="icon" />}
            />
          </Stage>,
        );
        const locator = screen.getByRole("textbox", { name: "Email" });
        const control = locator.element();
        const { label, description, field } = parts(control);
        const style = computed(field);

        expect(style.backgroundColor).toBe(color("input.bg.default", mode));
        expect(style.borderTopColor).toBe(color("input.border.default", mode));
        expect(style.borderTopStyle).toBe("solid");
        expect(computed(control).color).toBe(color("input.fg.default", mode));
        expect(computed(control, "::placeholder").color).toBe(color("input.placeholder", mode));
        expect(computed(label).color).toBe(color("input.label.fg", mode));
        expect(computed(description).color).toBe(color("input.description.fg", mode));
        expect(computed(screen.getByTestId("icon").element()).color).toBe(
          color("input.fg.default", mode),
        );

        await locator.hover();
        await settle(100);
        expect(computed(field).backgroundColor).toBe(color("input.bg.default", mode));
        expect(computed(field).borderTopColor).toBe(color("input.border.default", mode));
      });

      test("invalid, disabled, and read-only fields take their tokens", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Input label="Invalid" invalid error="Enter a name" />
            <Input
              label="Disabled"
              disabled
              placeholder="Example"
              leadingIcon={<Dot id="icon" />}
            />
            <Input label="Read-only" readOnly defaultValue="DE89 3704 0044" />
            <Input label="Disabled and invalid" disabled invalid error="Enter a name" />
          </Stage>,
        );
        const field = (name: string) => screen.getByRole("textbox", { name }).element();

        const invalid = parts(field("Invalid"));
        expect(computed(invalid.field).borderTopColor).toBe(color("input.border.invalid", mode));
        expect(computed(invalid.field).backgroundColor).toBe(color("input.bg.default", mode));
        expect(computed(invalid.error).color).toBe(color("input.error.fg", mode));

        const disabled = parts(field("Disabled"));
        expect(computed(disabled.field).backgroundColor).toBe(color("input.bg.disabled", mode));
        expect(computed(disabled.field).borderTopColor).toBe(color("input.border.disabled", mode));
        expect(computed(field("Disabled")).color).toBe(color("input.fg.disabled", mode));
        expect(computed(field("Disabled"), "::placeholder").color).toBe(
          color("input.fg.disabled", mode),
        );
        expect(computed(screen.getByTestId("icon").element()).color).toBe(
          color("input.fg.disabled", mode),
        );

        const readOnly = parts(field("Read-only"));
        expect(computed(readOnly.field).backgroundColor).toBe(color("input.bg.read-only", mode));
        expect(computed(readOnly.field).borderTopColor).toBe(color("input.border.read-only", mode));
        expect(computed(field("Read-only")).color).toBe(color("input.fg.default", mode));

        // Disabled wins over invalid.
        const both = parts(field("Disabled and invalid"));
        expect(computed(both.field).borderTopColor).toBe(color("input.border.disabled", mode));
      });

      test("the focus ring is drawn whenever the field has focus, by Tab or by a click", async () => {
        const screen = await render(
          <Stage mode={mode}>
            <Input label="Email" />
            <Input label="Account number" readOnly defaultValue="DE89 3704 0044" />
          </Stage>,
        );
        for (const name of ["Email", "Account number"]) {
          const locator = screen.getByRole("textbox", { name });
          const field = parts(locator.element()).field;
          const ring = () => computed(field).outlineStyle;
          expect(ring()).toBe("none");

          await locator.click();
          await expect.element(locator).toHaveFocus();
          expect(ring()).toBe("solid");
          expect(pixels(computed(field).outlineWidth)).toBe(number("input.focus-ring.width"));
          expect(pixels(computed(field).outlineOffset)).toBe(number("input.focus-ring.offset"));
          expect(computed(field).outlineColor).toBe(color("input.focus-ring.color", mode));
          (locator.element() as HTMLElement).blur();
          expect(ring()).toBe("none");
        }
        // By Tab, from one field to the next.
        const first = screen.getByRole("textbox", { name: "Email" });
        const second = screen.getByRole("textbox", { name: "Account number" });
        await first.click();
        await userEvent.tab();
        await expect.element(second).toHaveFocus();
        expect(computed(parts(second.element()).field).outlineStyle).toBe("solid");
        expect(computed(parts(first.element()).field).outlineStyle).toBe("none");
      });

      test("has no accessibility violations", async () => {
        const screen = await render(
          <Stage mode={mode}>
            {INPUT_SIZES.map((size) => (
              <Input key={size} size={size} label={`Size ${size}`} defaultValue="Ana Lima" />
            ))}
            <Input
              label="Email"
              type="email"
              description="We send the receipt here."
              placeholder="name@example.com"
              required
            />
            <Input label="Search" labelHidden type="search" leadingIcon={<Dot />} />
            <Input
              label="Phone"
              type="tel"
              defaultValue="12345"
              invalid
              error="Enter the whole number, with the area code"
            />
            <Input label="Unavailable" disabled />
            <Input label="Account number" readOnly defaultValue="DE89 3704 0044" />
            <Input label="Message" multiline defaultValue="Hello" />
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
          expect.arrayContaining(["color-contrast", "label", "aria-valid-attr-value"]),
        );
      });
    });

    describe.each(DENSITIES)("measurements at %s density", (density) => {
      test.each(INPUT_SIZES)("the %s size", async (size) => {
        const screen = await render(
          <Stage density={density}>
            <Input
              size={size}
              label="Email"
              description="We send the receipt here."
              invalid
              error="Enter an email address"
              defaultValue="ana"
              leadingIcon={<Dot id="icon" />}
            />
          </Stage>,
        );
        const control = screen.getByRole("textbox", { name: "Email" }).element();
        const { label, description, field, error } = parts(control);
        const box = field.getBoundingClientRect();
        const style = computed(field);
        const value = `input.value.${size}`;
        const labelStyle = `input.label.${size}`;

        // The field is exactly as tall as its token, like a Button of the same size.
        expect(box.height).toBeCloseTo(number(`input.height.${size}`, density), 2);
        expect(pixels(style.borderTopWidth)).toBe(number("input.border-width"));
        expect(pixels(style.borderTopLeftRadius)).toBe(number("input.radius"));

        // The text starts after the padding, the icon, and the gap; and ends before the padding.
        const padding = number(`input.padding-inline.${size}`);
        const iconSize = number(`input.icon-size.${size}`);
        expect(pixels(computed(control).paddingInlineStart)).toBeCloseTo(
          padding + iconSize + number("input.gap"),
          2,
        );
        expect(pixels(computed(control).paddingInlineEnd)).toBe(padding);
        const icon = screen.getByTestId("icon").element().getBoundingClientRect();
        expect(icon.width).toBeCloseTo(iconSize, 2);
        expect(icon.height).toBeCloseTo(iconSize, 2);
        expect(icon.left).toBeCloseTo(box.left + number("input.border-width") + padding, 2);
        expect(icon.top + icon.height / 2).toBeCloseTo(box.top + box.height / 2, 2);

        for (const [element, id] of [
          [control, value],
          [label, labelStyle],
          [description, "input.description.type"],
          [error, "input.error.type"],
        ] as const) {
          const text = computed(element);
          expect(text.fontFamily, id).toContain(String(token(`${id}.font-family`)));
          expect(pixels(text.fontSize), id).toBe(number(`${id}.font-size`));
          expect(text.fontWeight, id).toBe(token(`${id}.font-weight`));
          expect(pixels(text.lineHeight), id).toBeCloseTo(number(`${id}.line-height`), 2);
          expect(pixels(text.letterSpacing) || 0, id).toBe(number(`${id}.letter-spacing`));
        }

        // Label, description, field, and error, from top to bottom, the gap apart.
        const gap = number("input.gap");
        const rect = (element: Element) => element.getBoundingClientRect();
        expect(rect(description).top - rect(label).bottom).toBeCloseTo(gap, 2);
        expect(box.top - rect(description).bottom).toBeCloseTo(gap, 2);
        expect(rect(error).top - box.bottom).toBeCloseTo(gap, 2);
      });

      test("a field and a button of the same size are the same height", async () => {
        for (const size of INPUT_SIZES) {
          expect(number(`input.height.${size}`, density)).toBe(
            number(`button.height.${size}`, density),
          );
        }
      });
    });

    describe("at twice the text size", () => {
      test.each(INPUT_SIZES)(
        "the %s value and icon are twice as large, and the space above and below the value stays",
        async (size) => {
          await withTextSize(2, async () => {
            const screen = await render(
              <Stage>
                <Input
                  size={size}
                  label="Email"
                  defaultValue="ana"
                  leadingIcon={<Dot id="icon" />}
                />
              </Stage>,
            );
            const control = screen.getByRole("textbox", { name: "Email" }).element();
            const style = computed(control);
            const box = parts(control).field.getBoundingClientRect();
            const height = number(`input.height.${size}`);
            const lineHeight = number(`input.value.${size}.line-height`);
            const iconSize = number(`input.icon-size.${size}`);
            // What it is at the default text size.
            const padding = (height - lineHeight) / 2 - number("input.border-width");

            expect(pixels(style.fontSize)).toBeCloseTo(
              2 * number(`input.value.${size}.font-size`),
              2,
            );
            expect(pixels(style.lineHeight)).toBeCloseTo(2 * lineHeight, 2);
            expect(pixels(style.paddingTop)).toBeCloseTo(padding, 2);
            expect(pixels(style.paddingBottom)).toBeCloseTo(padding, 2);
            // So the field is taller by what the line grew.
            expect(box.height).toBeCloseTo(height + lineHeight, 1);

            // The icon grows with the text, beside the line, and the text starts after it.
            const icon = screen.getByTestId("icon").element().getBoundingClientRect();
            expect(icon.width).toBeCloseTo(2 * iconSize, 2);
            expect(icon.height).toBeCloseTo(2 * iconSize, 2);
            expect(icon.top + icon.height / 2).toBeCloseTo(box.top + box.height / 2, 1);
            expect(pixels(style.paddingInlineStart)).toBeCloseTo(
              number(`input.padding-inline.${size}`) + 2 * iconSize + number("input.gap"),
              2,
            );
          });
        },
      );

      test("a multi-line field keeps the same space, and its icon stays beside the first line", async () => {
        await withTextSize(2, async () => {
          const screen = await render(
            <Stage>
              <Input label="Message" multiline rows={3} leadingIcon={<Dot id="icon" />} />
            </Stage>,
          );
          const control = screen.getByRole("textbox", { name: "Message" }).element();
          const box = parts(control).field.getBoundingClientRect();
          const height = number("input.height.md");
          const lineHeight = number("input.value.md.line-height");
          const padding = (height - lineHeight) / 2 - number("input.border-width");
          expect(pixels(computed(control).paddingTop)).toBeCloseTo(padding, 2);
          // Three lines, each twice as tall, and the space above and below them.
          expect(box.height).toBeCloseTo(height - lineHeight + 3 * 2 * lineHeight, 1);
          // The icon is centered on the first line.
          const icon = screen.getByTestId("icon").element().getBoundingClientRect();
          const firstLine = box.top + number("input.border-width") + padding + lineHeight;
          expect(icon.top + icon.height / 2).toBeCloseTo(firstLine, 1);
        });
      });
    });

    describe("layout", () => {
      test("a long label, description, and error wrap and are never cut off", async () => {
        const screen = await render(
          <Stage width={280}>
            <Input label={LONG_TEXT} description={LONG_TEXT} invalid error={LONG_TEXT} />
          </Stage>,
        );
        const control = screen.getByRole("textbox").element();
        const stage = screen.getByTestId("stage").element().getBoundingClientRect();
        for (const part of ["label", "description", "error"] as const) {
          const element = parts(control)[part];
          const lineHeight = pixels(computed(element).lineHeight);
          expect(element.getBoundingClientRect().height, part).toBeGreaterThan(2 * lineHeight);
          expect(element.getBoundingClientRect().right, part).toBeLessThanOrEqual(
            stage.right - STAGE_PADDING,
          );
          expect(element.scrollWidth, part).toBeLessThanOrEqual(element.clientWidth);
          expect(computed(element).textOverflow, part).toBe("clip");
        }
      });

      test("a long value scrolls inside a one-line field, which keeps its height", async () => {
        const screen = await render(
          <Stage width={280}>
            <Input label="Address" defaultValue={LONG_TEXT} />
          </Stage>,
        );
        const control = screen.getByRole("textbox", { name: "Address" }).element();
        expect(control.scrollWidth).toBeGreaterThan(control.clientWidth);
        expect(parts(control).field.getBoundingClientRect().height).toBeCloseTo(
          number("input.height.md"),
          2,
        );
      });

      test("a field fills the width of its container", async () => {
        const screen = await render(
          <Stage width={400}>
            <Input label="Email" />
          </Stage>,
        );
        const field = parts(screen.getByRole("textbox").element()).field;
        expect(field.getBoundingClientRect().width).toBe(400 - 2 * STAGE_PADDING);
      });

      test.each(["ltr", "rtl"] as const)(
        "in %s, the label is at the start and the icon on the side where reading starts",
        async (dir) => {
          const screen = await render(
            <Stage dir={dir}>
              <Input label="Search" leadingIcon={<Dot id="icon" />} />
            </Stage>,
          );
          const control = screen.getByRole("textbox", { name: "Search", exact: true }).element();
          const { field, label } = parts(control);
          const box = field.getBoundingClientRect();
          const icon = screen.getByTestId("icon").element().getBoundingClientRect();
          // The icon is decoration: the name is the label alone.
          expect(parts(control).icon.getAttribute("aria-hidden")).toBe("true");
          if (dir === "ltr") {
            expect(icon.left - box.left).toBeLessThan(box.right - icon.right);
            expect(label.getBoundingClientRect().left).toBeCloseTo(box.left, 0);
            expect(pixels(computed(control).paddingLeft)).toBeGreaterThan(
              pixels(computed(control).paddingRight),
            );
          } else {
            expect(box.right - icon.right).toBeLessThan(icon.left - box.left);
            expect(label.getBoundingClientRect().right).toBeCloseTo(box.right, 0);
            expect(pixels(computed(control).paddingRight)).toBeGreaterThan(
              pixels(computed(control).paddingLeft),
            );
          }
        },
      );

      test("an email field in a right-to-left layout keeps its icon beside where its text starts", async () => {
        const screen = await render(
          <Stage dir="rtl">
            <Input label="البريد الإلكتروني" type="email" leadingIcon={<Dot id="icon" />} />
          </Stage>,
        );
        const control = screen.getByRole("textbox").element();
        const box = parts(control).field.getBoundingClientRect();
        const icon = screen.getByTestId("icon").element().getBoundingClientRect();
        expect(icon.left - box.left).toBeLessThan(box.right - icon.right);
        expect(pixels(computed(control).paddingLeft)).toBeGreaterThan(
          pixels(computed(control).paddingRight),
        );
      });
    });

    describe("pointer and touch", () => {
      test("with a mouse, only the field itself takes a click", async () => {
        const screen = await render(
          <Stage density="compact">
            <Input size="sm" label="Filter" />
          </Stage>,
        );
        const control = screen.getByRole("textbox", { name: "Filter" }).element();
        const box = parts(control).field.getBoundingClientRect();
        expect(matchMedia("(pointer: coarse)").matches).toBe(false);
        const x = box.left + box.width / 2;
        expect(document.elementFromPoint(x, box.top + 2)).toBe(control);
        expect(document.elementFromPoint(x, box.bottom + 2)).not.toBe(control);
        // A click anywhere inside the outline reaches the field, the icon's place included.
        expect(document.elementFromPoint(box.left + 3, box.top + box.height / 2)).toBe(control);
      });

      test("on a touch screen, a small field takes touches across the minimum target, and takes only the room it shows", async (context) => {
        // Chromium alone can turn a touch screen on in a page that is already open.
        context.skip(server.browser !== "chromium", "touch emulation needs Chromium");
        await cdp().send("Emulation.setTouchEmulationEnabled", {
          enabled: true,
          maxTouchPoints: 1,
        });
        try {
          expect(matchMedia("(pointer: coarse)").matches).toBe(true);
          const screen = await render(
            <Stage density="compact">
              {INPUT_SIZES.map((size) => (
                <Input
                  key={size}
                  size={size}
                  label={`Size ${size}`}
                  leadingIcon={<Dot />}
                  invalid
                  error="Enter a value"
                />
              ))}
              <Input label="One row" multiline rows={1} size="sm" />
            </Stage>,
          );
          const minimum = number("input.target-minimum");
          for (const name of [...INPUT_SIZES.map((size) => `Size ${size}`), "One row"]) {
            const control = screen.getByRole("textbox", { name }).element();
            const { field, error, label } = parts(control);
            const box = field.getBoundingClientRect();
            const x = box.left + box.width / 2;
            // The field takes the room it shows: the gap to the error is unchanged.
            expect(
              error ? error.getBoundingClientRect().top - box.bottom : number("input.gap"),
            ).toBeCloseTo(number("input.gap"), 2);
            expect(box.top - label.getBoundingClientRect().bottom, name).toBeCloseTo(
              number("input.gap"),
              2,
            );
            const reach = Math.max(0, (minimum - box.height) / 2);
            expect(document.elementFromPoint(x, box.top - reach + 1), name).toBe(control);
            expect(document.elementFromPoint(x, box.bottom + reach - 1), name).toBe(control);
            expect(document.elementFromPoint(x, box.top - reach - 1), name).not.toBe(control);
            expect(document.elementFromPoint(x, box.bottom + reach + 1), name).not.toBe(control);
          }
          // The small field is shorter than the target, so its touch area reaches past it.
          const small = parts(screen.getByRole("textbox", { name: "Size sm" }).element()).field;
          expect(small.getBoundingClientRect().height).toBeLessThan(minimum);
        } finally {
          await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
        }
      });
    });

    describe("server-rendered", () => {
      afterEach(() => {
        for (const undo of serverRendered.splice(0).reverse()) undo();
      });

      test("the HTML from a server names and describes the field, and React hydrates it as it is", async () => {
        const ui = (
          <Stage>
            <Input
              label="Email"
              type="email"
              name="email"
              description="We send the receipt here."
              invalid
              error="Enter an email address, like name@example.com"
              defaultValue="ana"
            />
          </Stage>
        );
        const { screen, hydrate } = serverRender(ui);
        const field = screen.getByRole("textbox", { name: "Email" });
        await expect.element(field).toHaveAttribute("aria-invalid", "true");
        await expect
          .element(field)
          .toHaveAccessibleDescription(
            "We send the receipt here. Enter an email address, like name@example.com",
          );
        // It takes typing before any script runs.
        await field.click();
        await userEvent.keyboard("@example.com");
        await expect.element(field).toHaveValue("ana@example.com");

        const errors = hydrate();
        await settle(100);
        expect(errors).toEqual([]);
        await expect.element(field).toHaveValue("ana@example.com");
      });
    });

    describe("system preferences", () => {
      test("without a data-theme, the field follows the system's color scheme", async () => {
        await withMedia({ colorScheme: "dark" }, async () => {
          const screen = await render(<Input label="Email" />);
          const field = parts(screen.getByRole("textbox").element()).field;
          expect(computed(field).backgroundColor).toBe(color("input.bg.default", "dark"));
          expect(computed(field).borderTopColor).toBe(color("input.border.default", "dark"));
        });
      });
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = (): ReactElement[] => [
  <Input key="plain" label="Email" />,
  <Input key="invalid" label="Email" invalid error="Enter an email address" />,
  <Input key="checked" label="Email" invalid={Math.random() > 0.5} error="Enter an email" />,
  // @ts-expect-error A field that can be invalid must be given its error message.
  <Input key="unchecked" label="Email" invalid={Math.random() > 0.5} />,
  <Input key="lines" label="Message" multiline rows={4} />,
  // @ts-expect-error A field needs a label.
  <Input key="unnamed" />,
  // @ts-expect-error An invalid field must have an error message.
  <Input key="silent" label="Email" invalid />,
  // @ts-expect-error "number" is not a type in the spec.
  <Input key="type" label="Age" type="number" />,
  // @ts-expect-error A multi-line field holds text: it takes no type.
  <Input key="lines-type" label="Message" multiline type="email" />,
  // @ts-expect-error "xl" is not a size in the spec.
  <Input key="size" label="Email" size="xl" />,
];

/** The props type is exported for apps that wrap the Input. */
export type { InputProps };
