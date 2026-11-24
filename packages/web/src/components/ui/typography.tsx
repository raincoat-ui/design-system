// Raincoat Typography: Text and Heading. They follow specs/components/typography/spec.yaml.
//
// shadcn/ui has no typography component to adapt, so these are written here (see
// shadcn.lock.json). Every size, weight, line height, and color comes from a Raincoat token; the
// variants and colors are the ones the spec defines. Neither holds state or uses a hook, so both
// render in a React Server Component.
import { cva } from "class-variance-authority";
import type * as React from "react";
import {
  HEADING_COLOR_DEFAULT,
  HEADING_VARIANT_DEFAULT_BY_LEVEL,
  type HeadingColor,
  type HeadingLevel,
  type HeadingVariant,
  TEXT_COLOR_DEFAULT,
  TEXT_VARIANT_DEFAULT,
  type TextColor,
  type TextVariant,
} from "../../generated/specs.js";
import { cn } from "../../lib/utils.js";

/** The classes of each text style: one semantic `type.*` token, field by field. */
const STYLES = {
  "body-lg":
    "font-(family-name:--rc-type-body-lg-font-family) text-(length:--rc-type-body-lg-font-size) leading-(--rc-type-body-lg-line-height) font-(--rc-type-body-lg-font-weight) tracking-(--rc-type-body-lg-letter-spacing)",
  "body-md":
    "font-(family-name:--rc-type-body-md-font-family) text-(length:--rc-type-body-md-font-size) leading-(--rc-type-body-md-line-height) font-(--rc-type-body-md-font-weight) tracking-(--rc-type-body-md-letter-spacing)",
  "body-sm":
    "font-(family-name:--rc-type-body-sm-font-family) text-(length:--rc-type-body-sm-font-size) leading-(--rc-type-body-sm-line-height) font-(--rc-type-body-sm-font-weight) tracking-(--rc-type-body-sm-letter-spacing)",
  "label-lg":
    "font-(family-name:--rc-type-label-lg-font-family) text-(length:--rc-type-label-lg-font-size) leading-(--rc-type-label-lg-line-height) font-(--rc-type-label-lg-font-weight) tracking-(--rc-type-label-lg-letter-spacing)",
  "label-md":
    "font-(family-name:--rc-type-label-md-font-family) text-(length:--rc-type-label-md-font-size) leading-(--rc-type-label-md-line-height) font-(--rc-type-label-md-font-weight) tracking-(--rc-type-label-md-letter-spacing)",
  "label-sm":
    "font-(family-name:--rc-type-label-sm-font-family) text-(length:--rc-type-label-sm-font-size) leading-(--rc-type-label-sm-line-height) font-(--rc-type-label-sm-font-weight) tracking-(--rc-type-label-sm-letter-spacing)",
  caption:
    "font-(family-name:--rc-type-caption-font-family) text-(length:--rc-type-caption-font-size) leading-(--rc-type-caption-line-height) font-(--rc-type-caption-font-weight) tracking-(--rc-type-caption-letter-spacing)",
  "heading-xl":
    "font-(family-name:--rc-type-heading-xl-font-family) text-(length:--rc-type-heading-xl-font-size) leading-(--rc-type-heading-xl-line-height) font-(--rc-type-heading-xl-font-weight) tracking-(--rc-type-heading-xl-letter-spacing)",
  "heading-lg":
    "font-(family-name:--rc-type-heading-lg-font-family) text-(length:--rc-type-heading-lg-font-size) leading-(--rc-type-heading-lg-line-height) font-(--rc-type-heading-lg-font-weight) tracking-(--rc-type-heading-lg-letter-spacing)",
  "heading-md":
    "font-(family-name:--rc-type-heading-md-font-family) text-(length:--rc-type-heading-md-font-size) leading-(--rc-type-heading-md-line-height) font-(--rc-type-heading-md-font-weight) tracking-(--rc-type-heading-md-letter-spacing)",
  "heading-sm":
    "font-(family-name:--rc-type-heading-sm-font-family) text-(length:--rc-type-heading-sm-font-size) leading-(--rc-type-heading-sm-line-height) font-(--rc-type-heading-sm-font-weight) tracking-(--rc-type-heading-sm-letter-spacing)",
} as const satisfies Record<TextVariant | HeadingVariant, string>;

/** The classes of each text color: one of the theme's text roles. */
const COLORS = {
  default: "text-(--rc-color-fg-default)",
  muted: "text-(--rc-color-fg-muted)",
  danger: "text-(--rc-color-fg-danger)",
} as const satisfies Record<TextColor | HeadingColor, string>;

// What Text and Heading share. Everything a browser styles on these elements by default is set
// here, so they look the same with or without a CSS reset.
const BASE = [
  "m-0",
  // Start alignment: the right in right-to-left text. A word longer than the line breaks.
  "text-start wrap-break-word",
  // Lines break by the rules of the text's language, read from lang: strictly for Japanese, and
  // between whole words for Korean, which puts spaces between words.
  "[&:lang(ja)]:[line-break:strict] [&:lang(ko)]:break-keep",
];

const textVariants = cva(BASE, {
  variants: {
    color: COLORS satisfies Record<TextColor, string>,
    variant: STYLES satisfies Record<TextVariant, string>,
    // The ellipsis after max-lines. Only the drawing stops: the text is all still there, so
    // assistive technology, search, and copying get all of it.
    truncated: {
      true: "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]",
      false: "",
    },
  },
  defaultVariants: {
    variant: TEXT_VARIANT_DEFAULT,
    color: TEXT_COLOR_DEFAULT,
    truncated: false,
  },
});

const headingVariants = cva(
  // A heading's lines are balanced where the browser can, so that a heading that wraps does
  // not leave one word on a line of its own.
  [...BASE, "text-balance"],
  {
    variants: {
      color: COLORS satisfies Record<HeadingColor, string>,
      variant: STYLES satisfies Record<HeadingVariant, string>,
    },
    defaultVariants: { color: HEADING_COLOR_DEFAULT },
  },
);

/** The elements Text can render. */
type TextElement = "p" | "span" | "div" | "label";

type TextProps<Element extends TextElement = "p"> = Omit<React.ComponentProps<Element>, "color"> & {
  /** The element to render: a paragraph unless you say otherwise. */
  as?: Element;
  /** The text style. */
  variant?: TextVariant;
  /** The color of the text, from the theme's text roles. */
  color?: TextColor;
  /**
   * The most lines the text shows. Text beyond them ends in an ellipsis, and assistive
   * technology still reads all of it. Only for text that is repeated elsewhere.
   */
  maxLines?: number;
};

/**
 * Running text and labels, in one of the theme's text styles.
 *
 * It renders a paragraph unless `as` names a `span`, a `div`, or a `label`. For text from
 * people, such as a name or a message, set `dir="auto"`, so that its direction comes from its
 * first strong character.
 */
function Text<Element extends TextElement = "p">({
  as,
  variant = TEXT_VARIANT_DEFAULT,
  color = TEXT_COLOR_DEFAULT,
  maxLines,
  className,
  style,
  ...props
}: TextProps<Element>) {
  // TextProps has checked the props against the element `as` names. TypeScript cannot follow
  // that through a choice of four elements, so the element is typed as a paragraph here.
  const Comp = (as ?? "p") as "p";
  const truncated = maxLines !== undefined;
  return (
    <Comp
      data-slot="text"
      data-variant={variant}
      data-color={color}
      className={cn(textVariants({ variant, color, truncated }), className)}
      style={truncated ? { WebkitLineClamp: maxLines, ...style } : style}
      {...(props as React.ComponentProps<"p">)}
    />
  );
}

type HeadingProps = Omit<React.ComponentProps<"h1">, "color"> & {
  /**
   * The heading's place in the outline of the page, from 1 to 6. It renders `h1` to `h6`.
   * Choose it for that place, not for its size.
   */
  level: HeadingLevel;
  /** How the heading looks. It follows the level unless you set it. */
  variant?: HeadingVariant;
  /** The color of the heading, from the theme's text roles. */
  color?: HeadingColor;
};

/**
 * A heading: `h1` to `h6`, from `level`. Its look follows the level unless `variant` says
 * otherwise: 1 is `heading-xl`, 2 `heading-lg`, 3 `heading-md`, and 4 to 6 `heading-sm`. It
 * wraps and is never cut short.
 */
function Heading({
  level,
  variant,
  color = HEADING_COLOR_DEFAULT,
  className,
  ...props
}: HeadingProps) {
  // The level is a type, but a page in JavaScript can pass anything.
  const standard = HEADING_VARIANT_DEFAULT_BY_LEVEL[level];
  if (standard === undefined) {
    throw new RangeError(`A Heading's level is a whole number from 1 to 6, not ${level}.`);
  }
  const look = variant ?? standard;
  const Comp = `h${level}` as const;
  return (
    <Comp
      data-slot="heading"
      data-variant={look}
      data-color={color}
      className={cn(headingVariants({ variant: look, color }), className)}
      {...props}
    />
  );
}

export {
  Heading,
  type HeadingProps,
  headingVariants,
  Text,
  type TextElement,
  type TextProps,
  textVariants,
};
