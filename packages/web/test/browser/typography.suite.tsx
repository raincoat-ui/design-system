// The tests of Text and Heading, written against specs/components/typography/spec.yaml. They
// run once for each way an app can load the styles: see the two files that call
// describeTypography.
//
// Expected sizes and colors come from the token source (expected-tokens.js), not from the
// stylesheet, so each comparison covers the whole path from a token to what the browser draws.
import axe from "axe-core";
import { createRef, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, inject, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import {
  HEADING_COLORS,
  HEADING_LEVELS,
  HEADING_VARIANT_DEFAULT_BY_LEVEL,
  HEADING_VARIANTS,
  Heading,
  type HeadingLevel,
  type HeadingVariant,
  TEXT_COLORS,
  TEXT_VARIANTS,
  Text,
  type TextVariant,
} from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];

const STAGE_PADDING = 24;
const PARAGRAPH =
  "Your files are kept on this device and in the cloud. Changes made on one device reach the others the next time they connect, usually within a minute.";
const LONG_HEADING = "Notifications for comments, mentions, and changes to shared documents";
// An Arabic name, as a person would write it.
const NAME = "مريم الحسيني";

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

/** The text style token of a variant: body-lg is type.body.lg, caption is type.caption. */
const styleToken = (variant: TextVariant | HeadingVariant) => `type.${variant.replace("-", ".")}`;

/** A themed surface for the component under test, as an app would provide. */
function Stage({
  mode = "light",
  density,
  dir,
  lang,
  width,
  children,
}: {
  mode?: Mode;
  density?: Density;
  dir?: "ltr" | "rtl";
  lang?: string;
  width?: number;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="stage"
      data-theme={mode}
      data-density={density}
      dir={dir}
      lang={lang}
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

const computed = (element: Element) => getComputedStyle(element);
const pixels = (value: string) => Number.parseFloat(value);
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Expects an element to be set in a text style's tokens. */
function expectStyle(element: Element, variant: TextVariant | HeadingVariant, density?: Density) {
  const id = styleToken(variant);
  const style = computed(element);
  expect(style.fontFamily).toContain(String(token(`${id}.font-family`)));
  expect(pixels(style.fontSize)).toBe(number(`${id}.font-size`, density));
  expect(style.fontWeight).toBe(token(`${id}.font-weight`));
  expect(pixels(style.lineHeight)).toBeCloseTo(number(`${id}.line-height`, density), 2);
  expect(pixels(style.letterSpacing) || 0).toBe(number(`${id}.letter-spacing`, density));
}

/** Whether any of an element's content is cut off by its own box. */
const clipped = (element: Element) =>
  element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;

export function describeTypography(environment: string) {
  describe(`Typography, ${environment}`, () => {
    describe("Text", () => {
      test("is a paragraph in body-md and the default color, as the spec says", async () => {
        const screen = await render(
          <Stage>
            <Text>{PARAGRAPH}</Text>
          </Stage>,
        );
        const text = screen.getByText(PARAGRAPH).element();
        expect(text.tagName).toBe("P");
        expect(text.getAttribute("data-variant")).toBe("body-md");
        expect(text.getAttribute("data-color")).toBe("default");
        expectStyle(text, "body-md");
        expect(computed(text).color).toBe(color("color.fg.default"));
        // No margin of the browser's own: spacing is the app's.
        expect(computed(text).marginTop).toBe("0px");
        expect(computed(text).marginBottom).toBe("0px");
      });

      test("renders a span, a div, or a label when asked, and a label names its field", async () => {
        const screen = await render(
          <Stage>
            <Text as="span">In a line</Text>
            <Text as="div">A block</Text>
            <Text as="label" htmlFor="email" variant="label-md">
              Email
            </Text>
            <input id="email" />
          </Stage>,
        );
        expect(screen.getByText("In a line").element().tagName).toBe("SPAN");
        expect(screen.getByText("A block").element().tagName).toBe("DIV");
        expect(screen.getByText("Email").element().tagName).toBe("LABEL");
        await expect.element(screen.getByLabelText("Email")).toHaveAttribute("id", "email");
      });

      test("passes a ref, a class name, and other attributes to the element", async () => {
        const ref = createRef<HTMLParagraphElement>();
        const screen = await render(
          <Stage>
            <Text ref={ref} className="from-the-app" id="intro" title="Introduction">
              Hello
            </Text>
          </Stage>,
        );
        const text = screen.getByText("Hello");
        expect(ref.current).toBe(text.element());
        await expect.element(text).toHaveClass("from-the-app");
        await expect.element(text).toHaveAttribute("id", "intro");
        await expect.element(text).toHaveAttribute("title", "Introduction");
      });

      test("a class from the app replaces the component's class for the same property", async () => {
        const screen = await render(
          <Stage>
            <Text className="text-(--rc-color-fg-accent)">Hello</Text>
          </Stage>,
        );
        const text = screen.getByText("Hello").element();
        const classes = text.className.split(" ");
        expect(classes).toContain("text-(--rc-color-fg-accent)");
        expect(classes).not.toContain("text-(--rc-color-fg-default)");
        // The text style is still there.
        expectStyle(text, "body-md");
      });
    });

    describe("Heading", () => {
      test.each(HEADING_LEVELS)(
        "level %i is a heading of that level, in the look the level gives",
        async (level) => {
          const screen = await render(
            <Stage>
              <Heading level={level}>Notifications</Heading>
            </Stage>,
          );
          const heading = screen.getByRole("heading", { name: "Notifications", level });
          await expect.element(heading).toBeVisible();
          expect(heading.element().tagName).toBe(`H${level}`);
          const look = HEADING_VARIANT_DEFAULT_BY_LEVEL[level];
          expect(heading.element().getAttribute("data-variant")).toBe(look);
          expectStyle(heading.element(), look);
          expect(computed(heading.element()).color).toBe(color("color.fg.default"));
        },
      );

      test("a variant changes the look and keeps the level", async () => {
        const screen = await render(
          <Stage>
            <Heading level={2} variant="heading-sm">
              Recent files
            </Heading>
          </Stage>,
        );
        const heading = screen.getByRole("heading", { name: "Recent files", level: 2 });
        expect(heading.element().tagName).toBe("H2");
        expectStyle(heading.element(), "heading-sm");
      });

      test("passes a ref, a class name, and other attributes to the element", async () => {
        const ref = createRef<HTMLHeadingElement>();
        const screen = await render(
          <Stage>
            <Heading ref={ref} level={3} id="billing" className="from-the-app">
              Billing
            </Heading>
          </Stage>,
        );
        const heading = screen.getByRole("heading", { name: "Billing" });
        expect(ref.current).toBe(heading.element());
        await expect.element(heading).toHaveAttribute("id", "billing");
        await expect.element(heading).toHaveClass("from-the-app");
      });

      test("a level outside 1 to 6 is refused", () => {
        for (const level of [0, 7, 2.5]) {
          expect(() => Heading({ level: level as HeadingLevel, children: "Title" })).toThrow(
            RangeError,
          );
        }
      });

      test("lines are balanced where the browser can, and the heading is never cut short", async () => {
        const screen = await render(
          <Stage width={320}>
            <Heading level={1}>{LONG_HEADING}</Heading>
          </Stage>,
        );
        const heading = screen.getByRole("heading", { name: LONG_HEADING }).element();
        const style = computed(heading);
        // The longhand where the browser has it, or else the shorthand.
        expect(
          style.getPropertyValue("text-wrap-style") || style.getPropertyValue("text-wrap"),
        ).toContain("balance");
        // More than one line, inside the stage, with nothing clipped or elided.
        expect(heading.getBoundingClientRect().height).toBeGreaterThan(
          1.5 * number("type.heading.xl.line-height"),
        );
        expect(clipped(heading)).toBe(false);
        expect(style.overflow).toBe("visible");
        expect(style.textOverflow).toBe("clip");
      });
    });

    describe.each(MODES)("colors in %s mode", (mode) => {
      test("each color of Text and Heading is its text role", async () => {
        const screen = await render(
          <Stage mode={mode}>
            {TEXT_COLORS.map((name) => (
              <Text key={name} color={name}>{`Text in ${name}`}</Text>
            ))}
            {HEADING_COLORS.map((name) => (
              <Heading key={name} level={2} color={name}>{`Heading in ${name}`}</Heading>
            ))}
          </Stage>,
        );
        for (const name of TEXT_COLORS) {
          const text = screen.getByText(`Text in ${name}`).element();
          expect(computed(text).color).toBe(color(`color.fg.${name}`, mode));
        }
        for (const name of HEADING_COLORS) {
          const heading = screen.getByRole("heading", { name: `Heading in ${name}` }).element();
          expect(computed(heading).color).toBe(color(`color.fg.${name}`, mode));
        }
      });

      test("has no accessibility violations", async () => {
        const screen = await render(
          <Stage mode={mode}>
            {HEADING_LEVELS.map((level) => (
              <Heading key={level} level={level}>{`Level ${level}`}</Heading>
            ))}
            <Heading level={2} color="muted">
              A muted heading
            </Heading>
            {TEXT_VARIANTS.flatMap((variant) =>
              TEXT_COLORS.map((name) => (
                <Text key={`${variant} ${name}`} variant={variant} color={name}>
                  {`${variant} in ${name}`}
                </Text>
              )),
            )}
            <Text maxLines={2}>{PARAGRAPH}</Text>
          </Stage>,
        );
        const results = await axe.run(screen.container, {
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
          rules: {
            // High-contrast modes promise 7:1 for text, which is the enhanced criterion.
            "color-contrast-enhanced": { enabled: mode.endsWith("-hc") },
            // The stage is a fragment of a page, not a page: it has no main landmark.
            region: { enabled: false },
          },
        });
        expect(
          results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html)}`),
        ).toEqual([]);
        // Guard against a run that checked nothing.
        expect(results.passes.map(({ id }) => id)).toContain("color-contrast");
        expect(results.passes.map(({ id }) => id)).toContain("heading-order");
      });
    });

    describe.each(DENSITIES)("text styles at %s density", (density) => {
      test.each(TEXT_VARIANTS)("Text in %s is set in its text style", async (variant) => {
        const screen = await render(
          <Stage density={density}>
            <Text variant={variant}>Synced 2 minutes ago</Text>
          </Stage>,
        );
        const text = screen.getByText("Synced 2 minutes ago").element();
        expect(text.getAttribute("data-variant")).toBe(variant);
        expectStyle(text, variant, density);
      });

      test.each(HEADING_VARIANTS)("a Heading in %s is set in its text style", async (variant) => {
        const screen = await render(
          <Stage density={density}>
            <Heading level={2} variant={variant}>
              Notifications
            </Heading>
          </Stage>,
        );
        expectStyle(screen.getByRole("heading").element(), variant, density);
      });
    });

    describe("max-lines", () => {
      test("cuts the text short after that many lines, with an ellipsis", async () => {
        const screen = await render(
          <Stage width={280}>
            <Text maxLines={2}>{PARAGRAPH}</Text>
            <Text>{PARAGRAPH}</Text>
          </Stage>,
        );
        const [short, whole] = screen.getByText(PARAGRAPH).elements();
        if (!short || !whole) throw new Error("expected two paragraphs");
        const lineHeight = number("type.body.md.line-height");
        expect(short.getBoundingClientRect().height).toBeCloseTo(2 * lineHeight, 0);
        expect(whole.getBoundingClientRect().height).toBeGreaterThan(3 * lineHeight);
        const style = computed(short);
        expect(style.overflow).toBe("hidden");
        expect(style.getPropertyValue("-webkit-line-clamp")).toBe("2");
        // Without max-lines nothing is cut short.
        expect(computed(whole).getPropertyValue("-webkit-line-clamp")).toBe("none");
        expect(clipped(whole)).toBe(false);
      });

      test("text cut short is read in full", async () => {
        const screen = await render(
          <Stage width={280}>
            <Text maxLines={1}>{PARAGRAPH}</Text>
          </Stage>,
        );
        const text = screen.getByText(PARAGRAPH).element();
        expect(text.getBoundingClientRect().height).toBeCloseTo(
          number("type.body.md.line-height"),
          0,
        );
        expect(text.textContent).toBe(PARAGRAPH);
      });

      test("text cut short is read in full: a link named by it has the whole text as its name", async () => {
        // A message in a list, as a link whose preview is cut short.
        const screen = await render(
          <Stage width={280}>
            <a href="#message">
              <Text maxLines={1}>{PARAGRAPH}</Text>
            </a>
          </Stage>,
        );
        const link = screen.getByRole("link");
        await expect.element(link).toHaveAccessibleName(PARAGRAPH);
      });
    });

    describe("text size", () => {
      test("at the default and at twice the root font size, a heading is never smaller than the heading one level below it", async () => {
        const screen = await render(
          <Stage>
            {HEADING_LEVELS.map((level) => (
              <Heading key={level} level={level}>{`Level ${level}`}</Heading>
            ))}
          </Stage>,
        );
        const sizes = () =>
          HEADING_LEVELS.map((level) =>
            pixels(computed(screen.getByRole("heading", { level }).element()).fontSize),
          );
        const checkOrder = (where: string) => {
          const measured = sizes();
          for (const [index, size] of measured.slice(1).entries()) {
            expect(
              measured[index],
              `${where}: level ${index + 1} of ${measured}`,
            ).toBeGreaterThanOrEqual(size);
          }
        };
        checkOrder("at the default size");
        document.documentElement.style.fontSize = "200%";
        try {
          await nextFrame();
          checkOrder("at twice the size");
        } finally {
          document.documentElement.style.fontSize = "";
        }
      });

      test("at twice the root font size, text and headings are twice as large and nothing is clipped", async () => {
        const screen = await render(
          <Stage width={360}>
            <Heading level={1}>{LONG_HEADING}</Heading>
            <Text variant="body-lg">{PARAGRAPH}</Text>
            <Text variant="caption">Synced 2 minutes ago</Text>
          </Stage>,
        );
        const elements = [
          screen.getByRole("heading").element(),
          screen.getByText(PARAGRAPH).element(),
          screen.getByText("Synced 2 minutes ago").element(),
        ];
        const sizes = () => elements.map((element) => pixels(computed(element).fontSize));
        const before = sizes();

        // Twice the root font size, as the browser's font size setting at twice its default of
        // 16px gives it, and as the snapshots draw the largest text size.
        document.documentElement.style.fontSize = "200%";
        try {
          await nextFrame();
          const after = sizes();
          for (const [index, size] of after.entries()) {
            expect(size).toBeCloseTo(2 * (before[index] ?? 0), 2);
          }
          const stage = screen.getByTestId("stage").element().getBoundingClientRect();
          for (const element of elements) {
            expect(clipped(element)).toBe(false);
            expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(
              stage.right - STAGE_PADDING + 0.5,
            );
          }
          // The heading wraps onto more lines rather than overflowing.
          expect(elements[0]?.getBoundingClientRect().height).toBeGreaterThan(
            2 * 2 * number("type.heading.xl.line-height"),
          );
        } finally {
          document.documentElement.style.fontSize = "";
        }
      });
    });

    describe("internationalization", () => {
      test.each(["ltr", "rtl"] as const)(
        "in %s, text aligns to the side where reading starts",
        async (dir) => {
          const screen = await render(
            <Stage dir={dir} width={400}>
              <Text>Short</Text>
              <Heading level={2}>Title</Heading>
            </Stage>,
          );
          const stage = screen.getByTestId("stage").element().getBoundingClientRect();
          for (const element of [
            screen.getByText("Short").element(),
            screen.getByRole("heading").element(),
          ]) {
            expect(computed(element).textAlign).toBe("start");
            const range = document.createRange();
            range.selectNodeContents(element);
            const drawn = range.getBoundingClientRect();
            if (dir === "ltr") expect(drawn.left).toBeCloseTo(stage.left + STAGE_PADDING, 0);
            else expect(drawn.right).toBeCloseTo(stage.right - STAGE_PADDING, 0);
          }
        },
      );

      test('with dir="auto", text from a person takes its direction from its first strong character', async () => {
        const screen = await render(
          <Stage dir="ltr">
            <Text dir="auto">{NAME}</Text>
            <Text>
              Message from{" "}
              <Text as="span" dir="auto">
                {NAME}
              </Text>
              , 2 minutes ago
            </Text>
          </Stage>,
        );
        const [alone, inSentence] = screen.getByText(NAME).elements();
        if (!alone || !inSentence) throw new Error("expected the name twice");
        expect(computed(alone).direction).toBe("rtl");
        expect(computed(inSentence).direction).toBe("rtl");
        // The sentence around it stays left to right.
        expect(computed(inSentence.parentElement as Element).direction).toBe("ltr");
      });

      test("lines break strictly in Japanese and between words in Korean, by lang", async () => {
        const screen = await render(
          <>
            <Stage lang="ja">
              <Text>日本語の文章</Text>
            </Stage>
            <Stage>
              <Heading level={2} lang="ko">
                알림 설정
              </Heading>
              <Text lang="en">English</Text>
            </Stage>
          </>,
        );
        const japanese = computed(screen.getByText("日本語の文章").element());
        expect(japanese.lineBreak).toBe("strict");
        expect(japanese.wordBreak).toBe("normal");
        const korean = computed(screen.getByRole("heading").element());
        expect(korean.wordBreak).toBe("keep-all");
        expect(korean.lineBreak).toBe("auto");
        const english = computed(screen.getByText("English").element());
        expect([english.lineBreak, english.wordBreak]).toEqual(["auto", "normal"]);
      });

      test("a word longer than the line breaks instead of overflowing", async () => {
        const word = "Donaudampfschifffahrtsgesellschaftskapitänsmütze";
        const screen = await render(
          <Stage width={200}>
            <Heading level={2}>{word}</Heading>
            <Text>{word}</Text>
          </Stage>,
        );
        expect(clipped(screen.getByRole("heading").element())).toBe(false);
        expect(clipped(screen.getByText(word, { exact: true }).last().element())).toBe(false);
      });
    });

    describe("server-rendered", () => {
      test("the server's HTML is what React renders, so hydration changes nothing", async () => {
        const ui = (
          <Stage>
            <Heading level={1}>Settings</Heading>
            <Text variant="caption" color="muted">
              Synced 2 minutes ago
            </Text>
            <Text maxLines={2}>{PARAGRAPH}</Text>
          </Stage>
        );
        const container = document.createElement("div");
        container.innerHTML = renderToString(ui);
        document.body.append(container);
        const heading = container.querySelector("h1");
        expect(heading?.textContent).toBe("Settings");
        expect(container.querySelector('p[data-variant="caption"]')).not.toBeNull();

        const errors: unknown[] = [];
        const logged = vi
          .spyOn(console, "error")
          .mockImplementation((...args) => errors.push(args));
        const root = hydrateRoot(container, ui, {
          onRecoverableError: (error) => errors.push(error),
        });
        try {
          await nextFrame();
          expect(errors).toEqual([]);
          // The same elements: React took over the server's HTML instead of replacing it.
          expect(container.querySelector("h1")).toBe(heading);
        } finally {
          root.unmount();
          logged.mockRestore();
          container.remove();
        }
      });
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = () => [
  <Text key="paragraph">Hello</Text>,
  <Text key="label" as="label" htmlFor="email">
    Email
  </Text>,
  <Heading key="heading" level={2} variant="heading-sm" color="muted">
    Recent files
  </Heading>,
  // @ts-expect-error A heading needs a level.
  <Heading key="no-level">Title</Heading>,
  // @ts-expect-error There is no level 7.
  <Heading key="level" level={7}>
    Title
  </Heading>,
  // @ts-expect-error A heading has no body look.
  <Heading key="look" level={2} variant="body-md">
    Title
  </Heading>,
  // @ts-expect-error A heading has no danger color.
  <Heading key="danger" level={2} color="danger">
    Title
  </Heading>,
  // @ts-expect-error A heading is never cut short.
  <Heading key="lines" level={2} maxLines={2}>
    Title
  </Heading>,
  // @ts-expect-error Text has no heading look: use a Heading.
  <Text key="text-look" variant="heading-xl">
    Title
  </Text>,
  // @ts-expect-error Text is not a heading element.
  <Text key="element" as="h2">
    Title
  </Text>,
  // @ts-expect-error Only a label has htmlFor.
  <Text key="for" htmlFor="email">
    Email
  </Text>,
];
