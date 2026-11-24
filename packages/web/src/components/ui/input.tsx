"use client";

// The Raincoat Input. It follows specs/components/input/spec.yaml.
//
// Adapted from the shadcn/ui Input, Textarea, and Label (see shadcn.lock.json and
// .shadcn-upstream/). RFC 0004 makes one component of them: a label, an optional description,
// the field, and an error message, in one line or several. Every color and size comes from a
// Raincoat token; the sizes and types are the ones the spec defines.
//
// The field's box (fill, outline, focus ring) is drawn by a wrapper, and the native <input> or
// <textarea> inside it is transparent and covers it. That lets the control itself reach past a
// small field on a touch screen, as a small Button's touch target does, so that a touch there
// places the caret without any script.
import { Label } from "radix-ui";
import * as React from "react";
import {
  INPUT_SIZE_DEFAULT,
  INPUT_TYPE_DEFAULT,
  type InputSize,
  type InputType,
} from "../../generated/specs.js";
import { cn } from "../../lib/utils.js";

/** Classes that differ by size, for each part. Every value is a token. */
const SIZES = {
  sm: {
    label:
      "font-(family-name:--rc-input-label-sm-font-family) text-(length:--rc-input-label-sm-font-size) leading-(--rc-input-label-sm-line-height) font-(--rc-input-label-sm-font-weight) tracking-(--rc-input-label-sm-letter-spacing)",
    value:
      "font-(family-name:--rc-input-value-sm-font-family) text-(length:--rc-input-value-sm-font-size) leading-(--rc-input-value-sm-line-height) font-(--rc-input-value-sm-font-weight) tracking-(--rc-input-value-sm-letter-spacing)",
    field: "min-h-(--rc-input-height-sm)",
    control: "px-(--rc-input-padding-inline-sm)",
    withIcon:
      "ps-[calc(var(--rc-input-padding-inline-sm)_+_var(--rc-input-icon-size-sm)_+_var(--rc-input-gap))]",
    icon: "start-(--rc-input-padding-inline-sm) top-[calc((var(--rc-input-height-sm)_-_var(--rc-input-icon-size-sm))_/_2_-_var(--rc-input-border-width))] size-(--rc-input-icon-size-sm) [&_svg]:size-(--rc-input-icon-size-sm)",
    // The space above the first line of a multi-line field, and below the last: the first line
    // sits where the text of a one-line field does.
    lines: "py-[calc((var(--rc-input-height-sm)_-_1lh)_/_2_-_var(--rc-input-border-width))]",
    // On a touch screen, how far the control reaches past the field's outline, above and
    // below, so that it is at least the minimum target tall.
    reach:
      "pointer-coarse:my-[min(0px,calc((var(--rc-input-height-sm)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width)))]",
    // The same for a field of one row of text, whose first line stays in place.
    reachLines:
      "pointer-coarse:my-[min(0px,calc((var(--rc-input-height-sm)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width)))] pointer-coarse:py-[calc((var(--rc-input-height-sm)_-_1lh)_/_2_-_var(--rc-input-border-width)_-_min(0px,calc((var(--rc-input-height-sm)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width))))]",
  },
  md: {
    label:
      "font-(family-name:--rc-input-label-md-font-family) text-(length:--rc-input-label-md-font-size) leading-(--rc-input-label-md-line-height) font-(--rc-input-label-md-font-weight) tracking-(--rc-input-label-md-letter-spacing)",
    value:
      "font-(family-name:--rc-input-value-md-font-family) text-(length:--rc-input-value-md-font-size) leading-(--rc-input-value-md-line-height) font-(--rc-input-value-md-font-weight) tracking-(--rc-input-value-md-letter-spacing)",
    field: "min-h-(--rc-input-height-md)",
    control: "px-(--rc-input-padding-inline-md)",
    withIcon:
      "ps-[calc(var(--rc-input-padding-inline-md)_+_var(--rc-input-icon-size-md)_+_var(--rc-input-gap))]",
    icon: "start-(--rc-input-padding-inline-md) top-[calc((var(--rc-input-height-md)_-_var(--rc-input-icon-size-md))_/_2_-_var(--rc-input-border-width))] size-(--rc-input-icon-size-md) [&_svg]:size-(--rc-input-icon-size-md)",
    lines: "py-[calc((var(--rc-input-height-md)_-_1lh)_/_2_-_var(--rc-input-border-width))]",
    reach:
      "pointer-coarse:my-[min(0px,calc((var(--rc-input-height-md)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width)))]",
    reachLines:
      "pointer-coarse:my-[min(0px,calc((var(--rc-input-height-md)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width)))] pointer-coarse:py-[calc((var(--rc-input-height-md)_-_1lh)_/_2_-_var(--rc-input-border-width)_-_min(0px,calc((var(--rc-input-height-md)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width))))]",
  },
  lg: {
    label:
      "font-(family-name:--rc-input-label-lg-font-family) text-(length:--rc-input-label-lg-font-size) leading-(--rc-input-label-lg-line-height) font-(--rc-input-label-lg-font-weight) tracking-(--rc-input-label-lg-letter-spacing)",
    value:
      "font-(family-name:--rc-input-value-lg-font-family) text-(length:--rc-input-value-lg-font-size) leading-(--rc-input-value-lg-line-height) font-(--rc-input-value-lg-font-weight) tracking-(--rc-input-value-lg-letter-spacing)",
    field: "min-h-(--rc-input-height-lg)",
    control: "px-(--rc-input-padding-inline-lg)",
    withIcon:
      "ps-[calc(var(--rc-input-padding-inline-lg)_+_var(--rc-input-icon-size-lg)_+_var(--rc-input-gap))]",
    icon: "start-(--rc-input-padding-inline-lg) top-[calc((var(--rc-input-height-lg)_-_var(--rc-input-icon-size-lg))_/_2_-_var(--rc-input-border-width))] size-(--rc-input-icon-size-lg) [&_svg]:size-(--rc-input-icon-size-lg)",
    lines: "py-[calc((var(--rc-input-height-lg)_-_1lh)_/_2_-_var(--rc-input-border-width))]",
    reach:
      "pointer-coarse:my-[min(0px,calc((var(--rc-input-height-lg)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width)))]",
    reachLines:
      "pointer-coarse:my-[min(0px,calc((var(--rc-input-height-lg)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width)))] pointer-coarse:py-[calc((var(--rc-input-height-lg)_-_1lh)_/_2_-_var(--rc-input-border-width)_-_min(0px,calc((var(--rc-input-height-lg)_-_var(--rc-input-target-minimum))_/_2_-_var(--rc-input-border-width))))]",
  },
} satisfies Record<InputSize, Record<string, string>>;

const HEIGHTS = {
  sm: "var(--rc-input-height-sm)",
  md: "var(--rc-input-height-md)",
  lg: "var(--rc-input-height-lg)",
} satisfies Record<InputSize, string>;

/** The height of a multi-line field of `rows` lines, as an inline style of the field. */
const linesHeight = (size: InputSize, rows: number) => `calc(${HEIGHTS[size]} + ${rows - 1} * 1lh)`;

// Content that is left-to-right whatever the language: the field stays left-to-right, its icon
// included, in a right-to-left layout.
const LEFT_TO_RIGHT: ReadonlySet<InputType> = new Set(["email", "tel", "url"]);

const classes = {
  root: "flex min-w-0 flex-col gap-(--rc-input-gap)",
  label: "text-(--rc-input-label-fg) wrap-break-word",
  // The rule for visually hidden text. Its values are fixed, not a design choice.
  hidden: "sr-only",
  description:
    "m-0 font-(family-name:--rc-input-description-type-font-family) text-(length:--rc-input-description-type-font-size) leading-(--rc-input-description-type-line-height) font-(--rc-input-description-type-font-weight) tracking-(--rc-input-description-type-letter-spacing) text-(--rc-input-description-fg) wrap-break-word",
  error:
    "m-0 font-(family-name:--rc-input-error-type-font-family) text-(length:--rc-input-error-type-font-size) leading-(--rc-input-error-type-line-height) font-(--rc-input-error-type-font-weight) tracking-(--rc-input-error-type-letter-spacing) text-(--rc-input-error-fg) wrap-break-word",
  field: [
    // The box. Its states are exclusive, so no rule has to win over another: disabled (by the
    // prop or a disabled fieldset) wins over invalid, and invalid over read-only for the outline.
    "relative box-border flex rounded-(--rc-input-radius) border-(length:--rc-input-border-width) border-solid",
    "border-(--rc-input-border-default) bg-(--rc-input-bg-default) text-(--rc-input-fg-default)",
    "[&[data-invalid]:not(:has(:disabled))]:border-(--rc-input-border-invalid)",
    "[&[data-read-only]:not(:has(:disabled))]:bg-(--rc-input-bg-read-only)",
    "[&[data-read-only]:not([data-invalid],:has(:disabled))]:border-(--rc-input-border-read-only)",
    "[&:has(:disabled)]:border-(--rc-input-border-disabled) [&:has(:disabled)]:bg-(--rc-input-bg-disabled) [&:has(:disabled)]:text-(--rc-input-fg-disabled)",
    // The focus ring, whenever the field has focus: it has focus only to be typed in.
    "focus-within:outline-(length:--rc-input-focus-ring-width) focus-within:outline-offset-(--rc-input-focus-ring-offset) focus-within:outline-(--rc-input-focus-ring-color) focus-within:outline-solid",
  ],
  control: [
    // Everything a browser styles on a field by default is set here, so the field looks the
    // same with or without a CSS reset. The box is the wrapper's.
    "relative m-0 box-border w-full min-w-0 appearance-none rounded-(--rc-input-radius) border-0 bg-transparent outline-none",
    // Firefox draws a placeholder at half opacity unless told otherwise, below its contrast.
    "text-(--rc-input-fg-default) placeholder:text-(--rc-input-placeholder) placeholder:opacity-100",
    "disabled:cursor-not-allowed disabled:text-(--rc-input-fg-disabled) disabled:placeholder:text-(--rc-input-fg-disabled)",
  ],
  // A one-line field. A browser centers its line of text.
  oneLine: "py-0 autofill:my-0",
  // A multi-line field grows with its content where the browser can size it, and otherwise
  // the person can make it taller.
  lines:
    "resize-y wrap-break-word field-sizing-content supports-[field-sizing:content]:resize-none",
  icon: "pointer-events-none absolute inline-flex items-center justify-center [&_svg]:shrink-0",
};

/** A field that can be invalid must be given its error message. */
type Validity =
  | {
      /** The value is not accepted. The error message is shown below the field. */
      invalid: boolean;
      /** What to do to make the value acceptable. Shown only while the field is invalid. */
      error: React.ReactNode;
    }
  | { invalid?: false; error?: React.ReactNode };

type Common = Validity & {
  /**
   * What the field is for. It is the field's name for assistive technology, and is shown above
   * the field unless `labelHidden` is set.
   */
  label: React.ReactNode;
  /** Hides the label visually. It is still the field's name. For a field whose purpose is plain. */
  labelHidden?: boolean;
  /** Help that is read before typing, shown between the label and the field. */
  description?: React.ReactNode;
  /** The height and text size of the field. */
  size?: InputSize;
  /** A decorative icon at the start of the field, such as a magnifying glass. */
  leadingIcon?: React.ReactNode;
  /** Classes for the whole component: label, description, field, and error. */
  className?: string;
};

/** Attributes the component sets on the native field itself. */
type Owned = "size" | "type" | "className" | "children" | "aria-invalid";

type OneLine = Common &
  Omit<React.ComponentProps<"input">, Owned> & {
    /** Takes several lines. */
    multiline?: false;
    /** What the field holds. It chooses the keyboard on touch screens and what autofill offers. */
    type?: InputType;
  };

type MultiLine = Common &
  Omit<React.ComponentProps<"textarea">, Owned> & {
    /** Takes several lines. The field starts `rows` lines tall and grows with its content. */
    multiline: true;
    /** How many lines tall the field starts. */
    rows?: number;
    type?: never;
  };

type InputProps = OneLine | MultiLine;

/** What a field in error shows: kept as it was while an input method composes. */
type Shown = { invalid: boolean; error: React.ReactNode };

/**
 * A text field with its label, an optional description, and an error message, in one line or
 * several.
 *
 * Give it a `label`; set `labelHidden` to hide it from view. An `invalid` field must have an
 * `error`. `className` styles the whole component; every other prop goes to the native
 * `<input>`, or to the `<textarea>` of a `multiline` field, including `ref`, `value`,
 * `onChange`, and `name`.
 */
function Input(props: InputProps) {
  const {
    label,
    labelHidden = false,
    description,
    invalid = false,
    error,
    size = INPUT_SIZE_DEFAULT,
    leadingIcon,
    className,
    multiline = false,
    ...rest
  } = props;
  const generatedId = React.useId();
  const id = rest.id ?? generatedId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const sizes = SIZES[size];
  const type = multiline ? "text" : ((rest as OneLine).type ?? INPUT_TYPE_DEFAULT);

  // An input method composes a character before committing it. Until it does, the field keeps
  // showing the error state it had when composition started, so that an app that checks the
  // value as it changes cannot flash an error over a character that is not finished.
  const [composing, setComposing] = React.useState<Shown | null>(null);
  const shown: Shown = composing ?? { invalid, error };
  const showsError = shown.invalid && shown.error != null && shown.error !== false;

  const describedBy = [
    description != null && description !== false && descriptionId,
    showsError && errorId,
    rest["aria-describedby"],
  ]
    .filter(Boolean)
    .join(" ");

  const onCompositionStart = (
    event: React.CompositionEvent<HTMLInputElement & HTMLTextAreaElement>,
  ) => {
    setComposing({ invalid, error });
    rest.onCompositionStart?.(event);
  };
  const onCompositionEnd = (
    event: React.CompositionEvent<HTMLInputElement & HTMLTextAreaElement>,
  ) => {
    setComposing(null);
    rest.onCompositionEnd?.(event);
  };
  // Enter that commits a composition does not submit the form. While an input method composes,
  // a key press says so, and Safari sends the Enter that commits it after composition has
  // ended, as a key whose code is 229.
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    if (
      !multiline &&
      event.key === "Enter" &&
      (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
    ) {
      event.preventDefault();
    }
    rest.onKeyDown?.(event);
  };

  const common = {
    id,
    "data-slot": "input-control",
    "aria-describedby": describedBy || undefined,
    "aria-invalid": shown.invalid || undefined,
    onCompositionStart,
    onCompositionEnd,
    onKeyDown,
  };

  let control: React.ReactNode;
  let rows = 1;
  if (multiline) {
    const { rows: given = 3, type: _type, ...textarea } = rest as Omit<MultiLine, keyof Common>;
    rows = Math.max(1, given);
    control = (
      <textarea
        {...textarea}
        {...common}
        rows={rows}
        className={cn(
          classes.control,
          sizes.value,
          sizes.control,
          leadingIcon != null && sizes.withIcon,
          sizes.lines,
          classes.lines,
          // A field of one row is shorter than the touch target.
          rows === 1 && sizes.reachLines,
        )}
      />
    );
  } else {
    const { type: _type, ...input } = rest as Omit<OneLine, keyof Common>;
    control = (
      <input
        {...input}
        {...common}
        type={type}
        className={cn(
          classes.control,
          sizes.value,
          sizes.control,
          leadingIcon != null && sizes.withIcon,
          classes.oneLine,
          sizes.reach,
        )}
      />
    );
  }
  return (
    <div data-slot="input" data-size={size} className={cn(classes.root, className)}>
      <Label.Root
        htmlFor={id}
        data-slot="input-label"
        className={cn(classes.label, sizes.label, labelHidden && classes.hidden)}
      >
        {label}
      </Label.Root>
      {description != null && description !== false && (
        <p id={descriptionId} data-slot="input-description" className={classes.description}>
          {description}
        </p>
      )}
      <div
        data-slot="input-field"
        className={cn(classes.field, sizes.value, sizes.field)}
        // A multi-line field starts as many lines tall as its rows.
        style={multiline ? { minHeight: linesHeight(size, rows) } : undefined}
        dir={LEFT_TO_RIGHT.has(type) ? "ltr" : undefined}
        {...(shown.invalid && { "data-invalid": "" })}
        {...(rest.readOnly && { "data-read-only": "" })}
      >
        {control}
        {/* After the control, so that it is drawn over a field the browser has autofilled. */}
        {leadingIcon != null && (
          <span data-slot="input-icon" aria-hidden="true" className={cn(classes.icon, sizes.icon)}>
            {leadingIcon}
          </span>
        )}
      </div>
      {showsError && (
        <p id={errorId} data-slot="input-error" className={classes.error}>
          {shown.error}
        </p>
      )}
    </div>
  );
}

export { Input, type InputProps };
