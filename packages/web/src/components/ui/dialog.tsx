"use client";
// The Raincoat Dialog. It follows the dialog part of specs/components/dialog/spec.yaml.
//
// Adapted from the shadcn/ui Dialog (see shadcn.lock.json and .shadcn-upstream/), on Radix
// Dialog, which traps focus, hides the page behind from assistive technology, locks scrolling,
// and closes on Escape and on the scrim. Every color, size, and duration comes from a Raincoat
// token.
//
// This file also holds what the three modal surfaces share: the scrim, the container, the
// header, body, and footer, and the behaviour of focus and scrolling. The AlertDialog
// (alert-dialog.tsx) and the Sheet (sheet.tsx) are built from these parts.
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { DIALOG_SIZE_DEFAULT, type DialogSize, type HeadingLevel } from "../../generated/specs.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";
import { Heading } from "./typography.js";

// ---------------------------------------------------------------------------------------------
// What the Dialog, the AlertDialog, and the Sheet share.

/** One ref callback that sets both refs. It keeps its identity while they do. */
function useBothRefs<T>(first: React.Ref<T> | undefined, second: React.Ref<T> | undefined) {
  return React.useCallback(
    (node: T | null) => {
      for (const ref of [first, second]) {
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }
    },
    [first, second],
  );
}

/**
 * The scrim. It covers the page and fades in and out with the container. Radix makes the page
 * behind it inert, and closes a dialog, though not an alert dialog, when it is pressed.
 */
const overlayClasses = cn(
  "fixed inset-0 z-50 bg-(--rc-dialog-scrim)",
  "data-[state=open]:animate-rc-dialog-in data-[state=closed]:animate-rc-dialog-out",
);

/**
 * The container of every kind: a raised surface with a hairline outline, which holds the header,
 * the body, and the footer in a column. Text in it that sets no style of its own, such as the
 * body's, is set like the description. When everything does not fit, the body scrolls, or, in a
 * window too short for that, the whole container (see useModalLayout).
 */
const containerClasses = cn(
  "fixed z-50 m-0 box-border flex flex-col overflow-y-auto outline-none",
  "border-(length:--rc-dialog-border-width) border-solid border-(--rc-dialog-border-color)",
  "bg-(--rc-dialog-bg) [box-shadow:var(--rc-dialog-shadow)]",
  "font-(family-name:--rc-dialog-description-font-family) text-(length:--rc-dialog-description-font-size) leading-(--rc-dialog-description-line-height) font-(--rc-dialog-description-font-weight) tracking-(--rc-dialog-description-letter-spacing)",
  "text-start wrap-break-word text-(--rc-dialog-fg)",
);

/**
 * A dialog and an alert dialog: centered, at least the margin away from every edge of the
 * window, and as tall as their content up to that. They fade in and out.
 */
const centeredClasses = cn(
  "inset-0 m-auto h-fit max-h-[calc(100%_-_2*var(--rc-dialog-margin))] w-[calc(100%_-_2*var(--rc-dialog-margin))]",
  "rounded-(--rc-dialog-radius)",
  "data-[state=open]:animate-rc-dialog-in data-[state=closed]:animate-rc-dialog-out",
);

/** The width of each size of dialog. On a narrower window, it spans the window less a margin. */
const DIALOG_WIDTHS = {
  sm: "max-w-(--rc-dialog-width-sm)",
  md: "max-w-(--rc-dialog-width-md)",
  lg: "max-w-(--rc-dialog-width-lg)",
} as const satisfies Record<DialogSize, string>;

type ModalLayout = {
  /** "whole" when the window is too short for the header, the footer, and three lines of body. */
  scroll: "body" | "whole";
  /** Whether the body has content scrolled beneath the header, or beneath the footer. */
  underHeader: boolean;
  underFooter: boolean;
  /** Whether the footer's buttons do not fit in a row, and so stack. */
  stacked: boolean;
  /** Whether the body scrolls and holds nothing that Tab reaches, so that it takes focus. */
  bodyFocusable: boolean;
};

const SETTLED: ModalLayout = {
  scroll: "body",
  underHeader: false,
  underFooter: false,
  stacked: false,
  bodyFocusable: false,
};

const sameLayout = (a: ModalLayout, b: ModalLayout) =>
  a.scroll === b.scroll &&
  a.underHeader === b.underHeader &&
  a.underFooter === b.underFooter &&
  a.stacked === b.stacked &&
  a.bodyFocusable === b.bodyFocusable;

/** What Tab can reach, so that a body with any of it need not take focus itself. */
const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "summary",
  '[contenteditable]:not([contenteditable="false"])',
  "[tabindex]",
]
  .map((selector) => `${selector}:not([tabindex^="-"])`)
  .join(", ");

const px = (value: string) => Number.parseFloat(value) || 0;

/** The height of one line of an element's text, in pixels. */
function lineHeight(style: CSSStyleDeclaration) {
  return style.lineHeight.endsWith("px")
    ? px(style.lineHeight)
    : (px(style.lineHeight) || 1.2) * px(style.fontSize);
}

/**
 * A section of a container. It may be inside an element of the app's that lays out as if it were
 * not there (display: contents), such as a form around the sections.
 */
const section = (content: HTMLElement, name: "header" | "body" | "footer") =>
  content.querySelector<HTMLElement>(`[data-section="${name}"]`);

/** Whether the footer's buttons, each as wide as its label, are wider together than the footer. */
function footerOverflows(footer: HTMLElement) {
  const buttons = [...footer.children];
  if (buttons.length < 2) return false;
  // Each button is laid out as wide as its content for a moment, and measured; nothing is drawn
  // in between.
  footer.setAttribute("data-measuring", "");
  const widths = buttons.map((button) => button.getBoundingClientRect().width);
  footer.removeAttribute("data-measuring");
  const style = getComputedStyle(footer);
  const room = footer.clientWidth - px(style.paddingInlineStart) - px(style.paddingInlineEnd);
  const needed =
    widths.reduce((sum, width) => sum + width, 0) + px(style.columnGap) * (buttons.length - 1);
  return needed > room + 0.5;
}

/** The layout a container needs now: see ModalLayout. */
function measure(content: HTMLElement): ModalLayout {
  const header = section(content, "header");
  const body = section(content, "body");
  const footer = section(content, "footer");
  const stacked = footer ? footerOverflows(footer) : false;
  if (!body) return { ...SETTLED, scroll: "whole", stacked };

  // Whether the container is as tall as the window lets it be: then either the body scrolls, or
  // the whole container does. Either way, the room the body would have is the same.
  const atLimit =
    content.scrollHeight > content.clientHeight + 0.5 ||
    body.scrollHeight > body.clientHeight + 0.5;
  let scroll: ModalLayout["scroll"] = "body";
  if (atLimit) {
    const style = getComputedStyle(body);
    const room = content.clientHeight - (header?.offsetHeight ?? 0) - (footer?.offsetHeight ?? 0);
    const needed = 3 * lineHeight(style) + px(style.paddingTop) + px(style.paddingBottom);
    if (room < needed - 0.5) scroll = "whole";
  }
  if (scroll === "whole") return { ...SETTLED, scroll, stacked };

  const scrolls = body.scrollHeight > body.clientHeight + 0.5;
  return {
    scroll,
    stacked,
    underHeader: scrolls && body.scrollTop > 0.5,
    underFooter: scrolls && body.scrollTop + body.clientHeight < body.scrollHeight - 0.5,
    bodyFocusable: scrolls && body.querySelector(TABBABLE) === null,
  };
}

/**
 * Keeps a container's layout up to date while it is open: whether the body or the whole
 * container scrolls, the hairlines under the header and above the footer, whether the footer
 * stacks, and whether the body takes focus. It measures again whenever the container, a
 * section, or what is in them changes size or content, and when the body scrolls. A window
 * that changes size changes the container's size wherever that matters: the container is as
 * wide as the window less a margin, or as tall as the window lets it be.
 */
function useModalLayout(content: HTMLElement | null) {
  const [layout, setLayout] = React.useState<ModalLayout>(SETTLED);

  React.useLayoutEffect(() => {
    if (!content) return;
    const update = () =>
      setLayout((before) => {
        const after = measure(content);
        return sameLayout(before, after) ? before : after;
      });
    // Sizes are read in the next frame, so that what an update changes is not measured while
    // the browser is still reporting the change that caused it.
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const sizes = new ResizeObserver(later);
    const observe = () => {
      sizes.disconnect();
      sizes.observe(content);
      for (const name of ["header", "body", "footer"] as const) {
        const element = section(content, name);
        if (!element) continue;
        sizes.observe(element);
        for (const child of element.children) sizes.observe(child);
      }
    };
    const changes = new MutationObserver(() => {
      observe();
      later();
    });
    changes.observe(content, { childList: true, subtree: true, characterData: true });
    // Scroll events do not bubble, so the body's are caught on their way down.
    content.addEventListener("scroll", update, { capture: true, passive: true });
    observe();
    update();
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      changes.disconnect();
      content.removeEventListener("scroll", update, { capture: true });
    };
  }, [content]);

  return layout;
}

/**
 * What the parts of an open container read from it. Each section shows the container's layout
 * in attributes of its own, and styles itself by them.
 */
type ModalContextValue = {
  /** The name of the close button. The header shows the button only when there is a name. */
  closeLabel?: string;
  layout: ModalLayout;
  /** Whether focus in the container came from the keyboard. See useModalFocus. */
  keyboard: boolean;
};
const ModalContext = React.createContext<ModalContextValue>({
  layout: SETTLED,
  keyboard: false,
});

type ModalFocus = {
  /** Where focus goes when the container opens, in place of the title. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Where focus goes when the container closes and the control that opened it is gone. */
  returnFocus?: React.RefObject<HTMLElement | null>;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  /**
   * Whether focus starts on the title or on `initialFocus`. An alert dialog leaves the first
   * focus to Radix, which puts it on Cancel.
   */
  focusTitle: boolean;
};

/**
 * Where focus goes as a container opens and closes, and whether focus in it came from the
 * keyboard. Returns the props of the container element and the element itself.
 */
function useModalFocus({
  initialFocus,
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onKeyDown,
  onPointerDown,
  focusTitle,
}: ModalFocus) {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  // The element that had focus when the container opened. Read as the container's element is
  // attached, before Radix moves focus into it.
  const opener = React.useRef<HTMLElement | null>(null);
  // Whether a key was pressed since a pointer last was. Radix moves focus into the container by
  // script, which some browsers do not count as keyboard focus, so the container's own buttons
  // draw their focus ring for it themselves.
  const [keyboard, setKeyboard] = React.useState(false);

  const attach = React.useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const active = node.ownerDocument.activeElement;
      opener.current =
        active instanceof HTMLElement && active !== node.ownerDocument.body ? active : null;
      // A control that a key moved focus to shows it, in every browser.
      setKeyboard(opener.current?.matches(":focus-visible") ?? false);
    }
    setElement(node);
  }, []);

  const props = {
    onOpenAutoFocus: (event: Event) => {
      onOpenAutoFocus?.(event);
      if (event.defaultPrevented || !focusTitle) return;
      event.preventDefault();
      const target =
        initialFocus?.current ??
        element?.querySelector<HTMLElement>('[data-section="header"] [data-slot$="-title"]');
      target?.focus();
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      // Back to the control that opened the container, or, when it is gone or cannot take
      // focus, to the app's choice.
      for (const target of [opener.current, returnFocus?.current]) {
        if (!target?.isConnected) continue;
        target.focus();
        if (target.ownerDocument.activeElement === target) return;
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      setKeyboard(true);
      onKeyDown?.(event);
    },
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      setKeyboard(false);
      onPointerDown?.(event);
    },
  };
  return { element, attach, keyboard, props };
}

/**
 * The focus ring of a button in a container, drawn when focus came from the keyboard, also where
 * the browser does not count focus moved by script as keyboard focus. The button carries
 * `data-keyboard` then: see useKeyboardAttribute.
 */
const keyboardFocusRing =
  "data-keyboard:focus:outline-(length:--rc-button-focus-ring-width) data-keyboard:focus:outline-offset-(--rc-button-focus-ring-offset) data-keyboard:focus:outline-(--rc-button-focus-ring-color) data-keyboard:focus:outline-solid";

/** The attribute that gives a container's button its keyboard focus ring. */
function useKeyboardAttribute() {
  const { keyboard } = React.useContext(ModalContext);
  return { "data-keyboard": keyboard ? "" : undefined };
}

/** The attribute a section shows a state of the container's layout with. */
const flag = (on: boolean) => (on ? "" : undefined);

// The space around the sections: the padding at the container's edges, and the gap between
// sections split in two, so that a hairline under the header or above the footer sits halfway
// between them, and a focus ring at the edge of the body is not cut off.
const sectionClasses = cn(
  "m-0 box-border px-(--rc-dialog-padding)",
  "pt-[calc(var(--rc-dialog-gap)/2)] pb-[calc(var(--rc-dialog-gap)/2)] first:pt-(--rc-dialog-padding) last:pb-(--rc-dialog-padding)",
);

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

type SectionProps = React.ComponentProps<"div">;

/**
 * The header of a container: the title, an optional description, and, when the container has a
 * close label, the close button at the end.
 */
function ModalHeader({ slot, className, children, ...props }: SectionProps & { slot: string }) {
  const { closeLabel, layout } = React.useContext(ModalContext);
  const keyboard = useKeyboardAttribute();
  return (
    <div
      data-slot={slot}
      data-section="header"
      data-divider={flag(layout.underHeader)}
      className={cn(
        sectionClasses,
        "flex shrink-0 items-start gap-(--rc-dialog-gap)",
        // The hairline under the header, there while the body has content beneath it.
        "border-0 border-b-(length:--rc-dialog-border-width) border-solid border-b-transparent data-divider:border-b-(--rc-dialog-divider)",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-auto flex-col gap-(--rc-space-2)">{children}</div>
      {closeLabel !== undefined && (
        <DialogPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={closeLabel}
            leadingIcon={<CloseIcon />}
            data-slot="dialog-close-button"
            className={cn("shrink-0", keyboardFocusRing)}
            {...keyboard}
          />
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

/**
 * The body of a container: any content. It scrolls between the header and the footer when it
 * does not fit; when it scrolls and holds nothing that Tab reaches, it takes focus, so that the
 * keyboard can scroll it.
 */
function ModalBody({ slot, className, tabIndex, ...props }: SectionProps & { slot: string }) {
  const { layout } = React.useContext(ModalContext);
  return (
    <div
      data-slot={slot}
      data-section="body"
      data-scroll={layout.scroll}
      tabIndex={tabIndex ?? (layout.bodyFocusable ? 0 : undefined)}
      className={cn(
        sectionClasses,
        "min-h-0 overflow-y-auto",
        // In a window too short for it, the whole container scrolls, and the body with it.
        "data-[scroll=whole]:shrink-0 data-[scroll=whole]:overflow-visible",
        "focus-visible:outline-(length:--rc-border-width-focus) focus-visible:outline-offset-[calc(0px_-_var(--rc-border-width-focus))] focus-visible:outline-(--rc-color-border-focus) focus-visible:outline-solid",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The footer of a container: buttons at the end edge, the primary action last. When they do not
 * fit in a row, they stack, the primary action first, each as wide as the container.
 */
function ModalFooter({ slot, className, ...props }: SectionProps & { slot: string }) {
  const { layout } = React.useContext(ModalContext);
  return (
    <div
      data-slot={slot}
      data-section="footer"
      data-divider={flag(layout.underFooter)}
      data-stacked={flag(layout.stacked)}
      className={cn(
        sectionClasses,
        "mt-auto flex shrink-0 flex-row items-center justify-end gap-(--rc-dialog-footer-gap)",
        "data-stacked:flex-col-reverse data-stacked:items-stretch",
        // How each button is measured: see footerOverflows.
        "[&[data-measuring]>*]:w-max [&[data-measuring]>*]:shrink-0",
        // The hairline above the footer, there while the body has content beneath it.
        "border-0 border-t-(length:--rc-dialog-border-width) border-solid border-t-transparent data-divider:border-t-(--rc-dialog-divider)",
        className,
      )}
      {...props}
    />
  );
}

const titleClasses = cn(
  "font-(family-name:--rc-dialog-title-font-family) text-(length:--rc-dialog-title-font-size) leading-(--rc-dialog-title-line-height) font-(--rc-dialog-title-font-weight) tracking-(--rc-dialog-title-letter-spacing)",
  "text-(--rc-dialog-fg)",
  // The title takes focus when the container opens, but it is not a control: no ring.
  "outline-none",
);

const descriptionClasses = cn(
  "m-0 text-start wrap-break-word",
  "font-(family-name:--rc-dialog-description-font-family) text-(length:--rc-dialog-description-font-size) leading-(--rc-dialog-description-line-height) font-(--rc-dialog-description-font-weight) tracking-(--rc-dialog-description-letter-spacing)",
  "text-(--rc-dialog-fg)",
);

type TitleProps = Omit<React.ComponentProps<"h2">, "color"> & {
  /**
   * The title's place in the outline of the page, from 1 to 6, as a Heading's. It looks the same
   * at every level.
   */
  level: HeadingLevel;
};

/** The props every container takes, besides those of its kind. */
type ModalContentProps = Pick<
  ModalFocus,
  "initialFocus" | "returnFocus" | "onOpenAutoFocus" | "onCloseAutoFocus"
> & {
  /**
   * Where the container is rendered: the end of the page's body unless you name another
   * element. It takes its theme, density, and direction from there, so set `data-theme` and
   * `dir` on the root element, or render it inside the element that sets them.
   */
  container?: HTMLElement | null;
};

export {
  CloseIcon,
  centeredClasses,
  containerClasses,
  descriptionClasses,
  keyboardFocusRing,
  ModalBody,
  type ModalContentProps,
  ModalContext,
  ModalFooter,
  ModalHeader,
  overlayClasses,
  type TitleProps,
  titleClasses,
  useBothRefs,
  useKeyboardAttribute,
  useModalFocus,
  useModalLayout,
};

// ---------------------------------------------------------------------------------------------
// The Dialog.

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

/**
 * A panel centered over the screen, for a short task that must be finished or abandoned before
 * going on. It is modal: the page behind it is covered by a scrim and cannot be used.
 *
 * Give it a `DialogTrigger` and a `DialogContent`. It opens and closes by itself, or is
 * controlled with `open` and `onOpenChange`: to keep it open while it holds unsaved changes,
 * control it and ask before you set `open` to false.
 */
function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;

/** The control that opens the dialog. Render a Button inside it with `asChild`. */
function DialogTrigger(props: DialogTriggerProps) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;

/** Closes the dialog. Render the footer's Cancel button inside it with `asChild`. */
function DialogClose(props: DialogCloseProps) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  "asChild" | "forceMount" | "onOpenAutoFocus" | "onCloseAutoFocus"
> &
  ModalContentProps & {
    /** The width of the dialog. On a narrower window, it spans the window less a margin. */
    size?: DialogSize;
    /**
     * The name of the close button, such as "Close". The button is shown only when you give
     * it, at the end of the header: give it when the footer has no Cancel, and not otherwise.
     */
    closeLabel?: string;
  };

/**
 * The dialog itself, over a scrim: a `DialogHeader`, then a `DialogBody` and a `DialogFooter` if
 * it has them.
 *
 * Focus moves to the title when it opens, or to `initialFocus`, such as the first field of a
 * short form, and back to the control that opened it when it closes. Escape, the scrim, and the
 * close button or a `DialogClose` close it.
 */
function DialogContent({
  size = DIALOG_SIZE_DEFAULT,
  closeLabel,
  container,
  initialFocus,
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onKeyDown,
  onPointerDown,
  className,
  children,
  ref,
  ...props
}: DialogContentProps) {
  const focus = useModalFocus({
    initialFocus,
    returnFocus,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onKeyDown,
    onPointerDown,
    focusTitle: true,
  });
  const layout = useModalLayout(focus.element);
  const contentRef = useBothRefs(ref, focus.attach);
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className={overlayClasses} />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        data-size={size}
        aria-modal="true"
        className={cn(containerClasses, centeredClasses, DIALOG_WIDTHS[size], className)}
        {...focus.props}
        data-scroll={layout.scroll}
        {...props}
      >
        <ModalContext value={{ closeLabel, layout, keyboard: focus.keyboard }}>
          {children}
        </ModalContext>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

type DialogHeaderProps = SectionProps;
type DialogBodyProps = SectionProps;
type DialogFooterProps = SectionProps;
type DialogTitleProps = TitleProps;

/** The header: a `DialogTitle`, then a `DialogDescription` if the dialog has one. */
function DialogHeader(props: DialogHeaderProps) {
  return <ModalHeader slot="dialog-header" {...props} />;
}

/**
 * The dialog's title, which names it. It wraps and is never cut short. Give it the `level` of a
 * heading in the outline of the page.
 */
function DialogTitle({ level, className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title asChild>
      <Heading
        level={level}
        variant="heading-md"
        tabIndex={-1}
        data-slot="dialog-title"
        className={cn(titleClasses, className)}
        {...props}
      />
    </DialogPrimitive.Title>
  );
}

type DialogDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>;

/** One sentence under the title. Assistive technology reads it after the title. */
function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(descriptionClasses, className)}
      {...props}
    />
  );
}

/** The dialog's content. It scrolls between the header and the footer when it does not fit. */
function DialogBody(props: DialogBodyProps) {
  return <ModalBody slot="dialog-body" {...props} />;
}

/** The buttons, Cancel first and the primary action last. They stack when they do not fit. */
function DialogFooter(props: DialogFooterProps) {
  return <ModalFooter slot="dialog-footer" {...props} />;
}

export {
  Dialog,
  DialogBody,
  type DialogBodyProps,
  DialogClose,
  type DialogCloseProps,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  type DialogDescriptionProps,
  DialogFooter,
  type DialogFooterProps,
  DialogHeader,
  type DialogHeaderProps,
  type DialogProps,
  DialogTitle,
  type DialogTitleProps,
  DialogTrigger,
  type DialogTriggerProps,
};
