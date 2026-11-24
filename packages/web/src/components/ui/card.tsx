// The Raincoat Card. It follows specs/components/card/spec.yaml.
//
// Adapted from the shadcn/ui Card (see shadcn.lock.json and .shadcn-upstream/). Its parts are the
// anatomy of the spec: a Card holds an optional CardMedia, a CardTitle, an optional CardBody, and
// an optional CardFooter. shadcn's CardContent is CardBody here; its CardHeader, CardDescription,
// and CardAction have no place in the spec and are left out. Every color, size, shadow, and
// duration comes from a Raincoat token.
//
// A card is interactive when its title holds a CardLink or a CardButton: the real link or button,
// whose pseudo-element stretches over the whole card. A click anywhere on the card reaches it, its
// name is the title alone, and the rest of the card is read after it. The card selects its hover,
// pressed, and focus states on it. Nothing here holds state or uses a hook, so a static card and
// a link card render in a React Server Component. A button card needs a Client Component for its
// click handler, as any button does.
// The Slot alone, not the whole of radix-ui, whose other primitives use client hooks at import.
import { Slot } from "radix-ui/slot";
import type * as React from "react";
import type { HeadingVariant } from "../../generated/specs.js";
import { cn } from "../../lib/utils.js";
import { Heading, type HeadingProps } from "./typography.js";

/** The look of a card's title unless the app chooses another (RFC 0005). */
const TITLE_VARIANT = "heading-sm" satisfies HeadingVariant;

const cardClasses = [
  // The surface. Everything a browser styles on a div by default is set here, so the card looks
  // the same with or without a CSS reset. It fills the width it is given and grows with its
  // content.
  "relative m-0 box-border flex w-full min-w-0 flex-col gap-(--rc-card-gap) p-(--rc-card-padding)",
  "rounded-(--rc-card-radius) border-(length:--rc-card-border-width) border-solid border-(--rc-card-border-default)",
  "bg-(--rc-card-bg-default) [box-shadow:var(--rc-card-shadow)]",
  // Every part aligns to the start edge, and a word longer than the line breaks.
  "text-start text-(--rc-color-fg-default) wrap-break-word",
  // The states of an interactive card: one whose title holds a CardLink or a CardButton. Outline
  // and fill changes ease in, and with reduced motion they are immediate.
  "transition-[background-color,border-color] duration-(--rc-card-transition-duration) ease-(--rc-card-transition-easing) motion-reduce:transition-none",
  // Hover, only where there is a pointer.
  "hover:has-[[data-slot=card-target]]:border-(--rc-card-border-hover)",
  // Pressed: the target is active.
  "has-[[data-slot=card-target]:active]:border-(--rc-card-border-hover) has-[[data-slot=card-target]:active]:bg-(--rc-card-bg-pressed)",
  // The focus ring, around the whole card, for keyboard focus on the target only.
  "has-[[data-slot=card-target]:focus-visible]:outline-(length:--rc-card-focus-ring-width) has-[[data-slot=card-target]:focus-visible]:outline-offset-(--rc-card-focus-ring-offset) has-[[data-slot=card-target]:focus-visible]:outline-(--rc-card-focus-ring-color) has-[[data-slot=card-target]:focus-visible]:outline-solid",
];

const targetClasses = [
  // The link or button looks like the title it is in. Everything a browser styles on either
  // element by default is set here.
  "m-0 appearance-none border-0 bg-transparent p-0 text-start text-inherit no-underline [font:inherit] [letter-spacing:inherit]",
  // The card draws the focus ring, around itself.
  "cursor-pointer outline-none",
  // Stretched over the whole card, its outline and corners included, so that a click anywhere
  // on the card reaches it. The card is the nearest positioned element around it.
  "after:absolute after:inset-[calc(0px_-_var(--rc-card-border-width))] after:rounded-(--rc-card-radius) after:content-['']",
];

type CardProps = React.ComponentProps<"div">;

/**
 * A surface that groups content about one subject, such as an order or a person.
 *
 * Put a CardTitle in it, and optionally a CardMedia, a CardBody, and a CardFooter. A card is
 * static unless its title holds a CardLink or a CardButton, which makes the whole card that link
 * or button. Put a collection of cards in a list, so that a screen reader says how many there are.
 */
function Card({ className, ...props }: CardProps) {
  return <div data-slot="card" className={cn(cardClasses, className)} {...props} />;
}

type CardMediaProps = React.ComponentProps<"div">;

/**
 * An image at the top of the card, edge to edge, with the card's corners. Give the image a text
 * alternative, or an empty one when it only decorates.
 *
 * It is drawn at the top wherever it is among the card's children. Put it after the CardTitle,
 * so that a screen reader reads the title first.
 */
function CardMedia({ className, ...props }: CardMediaProps) {
  return (
    <div
      data-slot="card-media"
      className={cn(
        "order-first",
        // Out across the padding to the outline, at the top and the sides, with the card's
        // corners.
        "mx-[calc(0px_-_var(--rc-card-padding))] mt-[calc(0px_-_var(--rc-card-padding))] overflow-hidden rounded-t-[max(0px,calc(var(--rc-card-radius)_-_var(--rc-card-border-width)))]",
        // An image, picture, or video fills the width, at its own aspect ratio.
        "[&>*]:block [&>*]:h-auto [&>*]:w-full",
        className,
      )}
      {...props}
    />
  );
}

type CardTitleProps = HeadingProps;

/**
 * The title of the card: a Heading, at the level the card's place in the outline of the page
 * needs, in `heading-sm` unless `variant` says otherwise. It wraps and is never cut short.
 *
 * For an interactive card, put a CardLink or a CardButton in it.
 */
function CardTitle({ variant = TITLE_VARIANT, ...props }: CardTitleProps) {
  return <Heading data-slot="card-title" variant={variant} {...props} />;
}

type CardLinkProps = React.ComponentProps<"a"> & {
  /**
   * Renders the single child element, such as a router's link, as the card's link, with its
   * styles and behavior.
   */
  asChild?: boolean;
};

/**
 * Makes the whole card a link to `href`, named by the title. Put it in the CardTitle, around the
 * title's text. The card then holds no other links or buttons.
 */
function CardLink({ className, asChild = false, ...props }: CardLinkProps) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="card-target"
      data-interaction="link"
      className={cn(targetClasses, className)}
      {...props}
    />
  );
}

/** There is no disabled card: a card that cannot be opened is static (RFC 0005). */
type CardButtonProps = Omit<React.ComponentProps<"button">, "disabled">;

/**
 * Makes the whole card a button that does one thing, named by the title. Put it in the
 * CardTitle, around the title's text. The card then holds no other links or buttons.
 *
 * Its type is "button" unless you pass another, so it submits a form only when asked to.
 */
function CardButton({ className, type = "button", ...props }: CardButtonProps) {
  return (
    <button
      type={type}
      data-slot="card-target"
      data-interaction="button"
      className={cn(targetClasses, className)}
      {...props}
    />
  );
}

type CardBodyProps = React.ComponentProps<"div">;

/** Content under the title, such as Text, a list of facts, or a status. */
function CardBody(props: CardBodyProps) {
  return <div data-slot="card-body" {...props} />;
}

type CardFooterProps = React.ComponentProps<"div">;

/**
 * Actions, as Buttons, at the end of a static card. They sit at the end edge, and wrap when they
 * do not fit. In a row of cards of different heights, the footer stays at the bottom.
 */
function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex flex-wrap items-center justify-end gap-(--rc-card-gap)",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardBody,
  type CardBodyProps,
  CardButton,
  type CardButtonProps,
  CardFooter,
  type CardFooterProps,
  CardLink,
  type CardLinkProps,
  CardMedia,
  type CardMediaProps,
  type CardProps,
  CardTitle,
  type CardTitleProps,
};
