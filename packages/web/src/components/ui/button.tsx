// The Raincoat Button. It follows specs/components/button/spec.yaml.
//
// Adapted from the shadcn/ui Button (see shadcn.lock.json and .shadcn-upstream/). Every color,
// size, and duration comes from a Raincoat token; the variants and sizes are the ones the spec
// defines.
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import {
  BUTTON_SIZE_DEFAULT,
  BUTTON_VARIANT_DEFAULT,
  type ButtonSize,
  type ButtonVariant,
} from "../../generated/specs.js";
import { useHydrated } from "../../lib/hydration.js";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  [
    // Container. Everything a browser styles on a button by default is set here, so the
    // component looks the same with or without a CSS reset, and as a link.
    "relative m-0 box-border appearance-none items-center justify-center gap-(--rc-button-gap)",
    "rounded-(--rc-button-radius) border-(length:--rc-button-border-width) border-solid",
    "cursor-pointer text-center no-underline normal-case",
    // Label. It wraps instead of being cut off, and a word longer than the button breaks.
    // Lines break by the strict rules, so that no Japanese line starts with a small kana or a
    // prolonged sound mark, and Korean, which puts spaces between words, breaks only at them.
    "wrap-break-word whitespace-normal [line-break:strict] [&:lang(ko)]:break-keep",
    // Icons and the spinner.
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Color changes. With reduced motion they are immediate.
    "transition-[background-color,border-color,color] duration-(--rc-button-transition-duration) ease-(--rc-button-transition-easing) motion-reduce:transition-none",
    // Focus ring, for keyboard focus only.
    "focus-visible:outline-(length:--rc-button-focus-ring-width) focus-visible:outline-offset-(--rc-button-focus-ring-offset) focus-visible:outline-(--rc-button-focus-ring-color) focus-visible:outline-solid",
    // Disabled. Every variant looks the same.
    "rc-disabled:cursor-not-allowed rc-disabled:border-(--rc-button-disabled-border) rc-disabled:bg-(--rc-button-disabled-bg) rc-disabled:text-(--rc-button-disabled-fg)",
    "data-loading:cursor-default",
    // Before hydration the browser refuses activation itself. See the Button below.
    "data-unhydrated:pointer-events-none",
    // On touch screens the target is at least the minimum size, whatever the visible height.
    "pointer-coarse:after:absolute pointer-coarse:after:inset-[min(0px,calc((100%_-_var(--rc-button-target-minimum))_/_2))] pointer-coarse:after:content-['']",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-(--rc-button-primary-bg-default) text-(--rc-button-primary-fg) rc-interactive:hover:bg-(--rc-button-primary-bg-hover) rc-interactive:active:bg-(--rc-button-primary-bg-pressed)",
        secondary:
          "border-(--rc-button-secondary-border) bg-(--rc-button-secondary-bg-default) text-(--rc-button-secondary-fg) rc-interactive:hover:bg-(--rc-button-secondary-bg-hover) rc-interactive:active:bg-(--rc-button-secondary-bg-pressed)",
        ghost:
          "border-transparent bg-transparent text-(--rc-button-ghost-fg) rc-interactive:hover:bg-(--rc-button-ghost-bg-hover) rc-interactive:active:bg-(--rc-button-ghost-bg-pressed)",
        danger:
          "border-transparent bg-(--rc-button-danger-bg-default) text-(--rc-button-danger-fg) rc-interactive:hover:bg-(--rc-button-danger-bg-hover) rc-interactive:active:bg-(--rc-button-danger-bg-pressed)",
      } satisfies Record<ButtonVariant, string>,
      // The label grows with the person's text size, and the icons and the spinner grow with
      // it: their token size times the text scale, which is 1 at the default size. The text
      // scale is font.size.16 (1rem, which the setting enlarges) over dimension.16 (16px, which
      // it does not). tan(atan2(a, b)) is a / b as a number: calc() cannot yet divide one
      // length by another in every browser. The padding is set in compoundVariants below.
      size: {
        sm: "min-h-(--rc-button-height-sm) min-w-(--rc-button-height-sm) font-(family-name:--rc-button-label-sm-font-family) text-(length:--rc-button-label-sm-font-size) leading-(--rc-button-label-sm-line-height) font-(--rc-button-label-sm-font-weight) tracking-(--rc-button-label-sm-letter-spacing) [&_svg]:size-[calc(var(--rc-button-icon-size-sm)_*_tan(atan2(var(--rc-font-size-16),var(--rc-dimension-16))))]",
        md: "min-h-(--rc-button-height-md) min-w-(--rc-button-height-md) font-(family-name:--rc-button-label-md-font-family) text-(length:--rc-button-label-md-font-size) leading-(--rc-button-label-md-line-height) font-(--rc-button-label-md-font-weight) tracking-(--rc-button-label-md-letter-spacing) [&_svg]:size-[calc(var(--rc-button-icon-size-md)_*_tan(atan2(var(--rc-font-size-16),var(--rc-dimension-16))))]",
        lg: "min-h-(--rc-button-height-lg) min-w-(--rc-button-height-lg) font-(family-name:--rc-button-label-lg-font-family) text-(length:--rc-button-label-lg-font-size) leading-(--rc-button-label-lg-line-height) font-(--rc-button-label-lg-font-weight) tracking-(--rc-button-label-lg-letter-spacing) [&_svg]:size-[calc(var(--rc-button-icon-size-lg)_*_tan(atan2(var(--rc-font-size-16),var(--rc-dimension-16))))]",
      } satisfies Record<ButtonSize, string>,
      fullWidth: {
        true: "flex w-full",
        false: "inline-flex",
      },
      iconOnly: {
        true: "",
        false: "",
      },
    },
    // The padding is what it is at the default text size, whatever the text size, so that
    // larger text makes the button grow. Around a label, the block padding centers one line of
    // text in the token height, and keeps the same space above and below when the label wraps
    // onto more lines: one line at the default size is one line now, divided by the text
    // scale. Around an icon alone, the padding centers the icon in the token height on every
    // side, so the button stays square.
    compoundVariants: [
      {
        iconOnly: false,
        size: "sm",
        class:
          "px-(--rc-button-padding-inline-sm) py-[calc((var(--rc-button-height-sm)_-_1lh_/_tan(atan2(var(--rc-font-size-16),var(--rc-dimension-16))))_/_2_-_var(--rc-button-border-width))]",
      },
      {
        iconOnly: false,
        size: "md",
        class:
          "px-(--rc-button-padding-inline-md) py-[calc((var(--rc-button-height-md)_-_1lh_/_tan(atan2(var(--rc-font-size-16),var(--rc-dimension-16))))_/_2_-_var(--rc-button-border-width))]",
      },
      {
        iconOnly: false,
        size: "lg",
        class:
          "px-(--rc-button-padding-inline-lg) py-[calc((var(--rc-button-height-lg)_-_1lh_/_tan(atan2(var(--rc-font-size-16),var(--rc-dimension-16))))_/_2_-_var(--rc-button-border-width))]",
      },
      {
        iconOnly: true,
        size: "sm",
        class:
          "p-[calc((var(--rc-button-height-sm)_-_var(--rc-button-icon-size-sm))_/_2_-_var(--rc-button-border-width))]",
      },
      {
        iconOnly: true,
        size: "md",
        class:
          "p-[calc((var(--rc-button-height-md)_-_var(--rc-button-icon-size-md))_/_2_-_var(--rc-button-border-width))]",
      },
      {
        iconOnly: true,
        size: "lg",
        class:
          "p-[calc((var(--rc-button-height-lg)_-_var(--rc-button-icon-size-lg))_/_2_-_var(--rc-button-border-width))]",
      },
    ],
    defaultVariants: {
      variant: BUTTON_VARIANT_DEFAULT,
      size: BUTTON_SIZE_DEFAULT,
      fullWidth: false,
      iconOnly: false,
    },
  },
);

/** A button needs a name: its label, or an accessible name when an icon is all it shows. */
type AccessibleName =
  | { children: React.ReactNode }
  | { children?: never; "aria-label": string }
  | { children?: never; "aria-labelledby": string };

type ButtonProps = Omit<React.ComponentProps<"button">, "children"> &
  AccessibleName & {
    /** How much emphasis the action gets. */
    variant?: ButtonVariant;
    /** The height and text size of the button. */
    size?: ButtonSize;
    /** Stretches the button to the width of its container. */
    fullWidth?: boolean;
    /**
     * Shows that the action is in progress. The button keeps its label and focus, ignores
     * activation, and reports itself as busy. Needs a Client Component. In server-rendered
     * HTML, until React hydrates it, it is disabled instead.
     */
    loading?: boolean;
    /** An icon before the label. For a button that is only an icon, pass it here. */
    leadingIcon?: React.ReactNode;
    /** An icon after the label. */
    trailingIcon?: React.ReactNode;
    /**
     * Renders the single child element with the button's styles and behavior instead of a
     * button element. Use it for a link that should look like a button.
     */
    asChild?: boolean;
  };

/** Stops a click before any handler sees it, as the browser does for a disabled button. */
function ignoreActivation(event: React.MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span data-slot="button-icon" aria-hidden="true" className="inline-flex shrink-0">
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      data-slot="button-spinner"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-rc-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Triggers an action or submits a form.
 *
 * Its type is "button" unless you pass another, so it submits a form only when asked to. Give
 * it a label, or an `aria-label` when an icon is all it shows.
 */
function Button({
  className,
  variant = BUTTON_VARIANT_DEFAULT,
  size = BUTTON_SIZE_DEFAULT,
  fullWidth = false,
  loading = false,
  disabled = false,
  asChild = false,
  leadingIcon,
  trailingIcon,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  // A disabled button is not also busy.
  const busy = loading && !disabled;
  // Only a button element can be disabled by the browser. Anything else, and a busy button,
  // has to refuse activation itself.
  const refuses = busy || (asChild && disabled);
  // Refusing takes the click handler below, which runs only once React has hydrated the
  // server's HTML. Until then the browser refuses activation: a button is disabled, which also
  // stops Enter in a field from submitting its form, and anything else, such as a link, leaves
  // the Tab order and ignores the pointer. With JavaScript off, that lasts.
  const hydrated = useHydrated(refuses);
  const waiting = refuses && !hydrated;
  // So the handler is given only once hydrated. A Server Component renders the Button without
  // ever hydrating it, and may not pass a function to an element at all.
  const refusesItself = refuses && hydrated;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant, size, fullWidth, iconOnly: children == null }),
        className,
      )}
      {...props}
      {...(!asChild && { type, disabled })}
      {...(disabled && { "data-disabled": "" })}
      {...(asChild && disabled && { "aria-disabled": true, tabIndex: -1 })}
      {...(busy && { "data-loading": "", "aria-busy": true, "aria-disabled": true })}
      {...(refusesItself && { onClickCapture: ignoreActivation })}
      {...(waiting && {
        "data-unhydrated": "",
        ...(asChild ? { tabIndex: -1 } : { disabled: true }),
      })}
    >
      {busy ? (
        <Icon>
          <Spinner />
        </Icon>
      ) : (
        leadingIcon && <Icon>{leadingIcon}</Icon>
      )}
      <Slot.Slottable>{children}</Slot.Slottable>
      {trailingIcon && <Icon>{trailingIcon}</Icon>}
    </Comp>
  );
}

export { Button, type ButtonProps, buttonVariants };
