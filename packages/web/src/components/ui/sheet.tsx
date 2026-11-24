"use client";
// The Raincoat Sheet. It follows the sheet part of specs/components/dialog/spec.yaml.
//
// Adapted from the shadcn/ui Sheet (see shadcn.lock.json and .shadcn-upstream/), on Radix Dialog.
// It shares its container, sections, tokens, and behaviour with the Dialog (dialog.tsx); only
// where it sits and how it moves differ. It comes from the bottom edge or the end edge, and an
// end sheet comes from the bottom on a window less than twice its width. There is no swipe to
// close on the web: Radix does not offer one, and a gesture that is never the only way out is
// not worth a dependency. So there is no drag handle either.
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";
import { SHEET_EDGE_DEFAULT, type SheetEdge } from "../../generated/specs.js";
import { cn } from "../../lib/utils.js";
import {
  containerClasses,
  descriptionClasses,
  ModalBody,
  type ModalContentProps,
  ModalContext,
  ModalFooter,
  ModalHeader,
  ModalOpenContext,
  overlayClasses,
  type TitleProps,
  titleClasses,
  useBothRefs,
  useModalFocus,
  useModalLayout,
  useModalOpen,
} from "./dialog.js";
import { Heading } from "./typography.js";

/** Where each edge's sheet sits, its outline and corners, and how it moves. */
const EDGES = {
  // As wide as the window up to the medium panel width, centered, and at most the margin short
  // of the top. Its top corners are round, and it slides up from below the window.
  bottom: cn(
    "inset-x-0 bottom-0 mx-auto w-full max-w-(--rc-sheet-max-width-bottom) max-h-[calc(100%_-_var(--rc-dialog-margin))]",
    "border-b-0 rounded-t-(--rc-dialog-radius)",
    "data-[state=open]:animate-rc-sheet-in-bottom data-[state=closed]:animate-rc-sheet-out-bottom",
  ),
  // As tall as the window, at its end edge. The corners that face the screen are round, and it
  // slides in from beyond the end edge: the right, or the left in right-to-left layouts.
  end: cn(
    "inset-y-0 inset-e-0 ms-auto h-full w-(--rc-sheet-width-end) max-w-full",
    "border-y-0 border-e-0 rounded-s-(--rc-dialog-radius)",
    "data-[state=open]:animate-rc-sheet-in-end data-[state=closed]:animate-rc-sheet-out-end",
    "rtl:data-[state=open]:animate-rc-sheet-in-end-rtl rtl:data-[state=closed]:animate-rc-sheet-out-end-rtl",
  ),
} as const satisfies Record<SheetEdge, string>;

/** With reduced motion a sheet fades, as a dialog does, and nothing moves. */
const reducedMotion =
  "motion-reduce:data-[state=open]:animate-rc-dialog-in motion-reduce:data-[state=closed]:animate-rc-dialog-out";

/**
 * Whether the window is less than twice as wide as an end sheet, so that an end sheet would
 * cover more than half of it: then it comes from the bottom. The sheet's width is read from its
 * token where the sheet is rendered.
 */
function useNarrowWindow(element: HTMLElement | null, wanted: boolean) {
  const [narrow, setNarrow] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!element || !wanted) return;
    const document = element.ownerDocument;
    const view = document.defaultView;
    if (!view) return;
    const check = () => {
      const probe = document.createElement("div");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.width = "var(--rc-sheet-width-end)";
      (element.parentElement ?? document.body).append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      setNarrow(view.innerWidth < 2 * width);
    };
    // The root element is as wide as the window, so its size changes when the window's width does.
    const sizes = new ResizeObserver(check);
    sizes.observe(document.documentElement);
    check();
    return () => sizes.disconnect();
  }, [element, wanted]);
  return narrow;
}

type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>;

/**
 * A panel that rises from the bottom edge or slides in from the end edge, for a longer task or
 * one that keeps the screen behind in view. It is modal: the page behind it is covered by a scrim
 * and cannot be used.
 *
 * Give it a `SheetTrigger` and a `SheetContent`. It opens and closes by itself, or is controlled
 * with `open` and `onOpenChange`: to keep it open while it holds unsaved changes, control it and
 * ask before you set `open` to false.
 */
function Sheet({ open, defaultOpen, onOpenChange, ...props }: SheetProps) {
  const state = useModalOpen({ open, defaultOpen, onOpenChange });
  return (
    <ModalOpenContext value={state.setOpen}>
      <SheetPrimitive.Root {...props} open={state.open} onOpenChange={state.setOpen} />
    </ModalOpenContext>
  );
}

type SheetTriggerProps = React.ComponentProps<typeof SheetPrimitive.Trigger>;

/** The control that opens the sheet. Render a Button inside it with `asChild`. */
function SheetTrigger(props: SheetTriggerProps) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

type SheetCloseProps = React.ComponentProps<typeof SheetPrimitive.Close>;

/** Closes the sheet. Render the footer's Cancel button inside it with `asChild`. */
function SheetClose(props: SheetCloseProps) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

type SheetContentProps = Omit<
  React.ComponentProps<typeof SheetPrimitive.Content>,
  "asChild" | "forceMount" | "onOpenAutoFocus" | "onCloseAutoFocus"
> &
  ModalContentProps & {
    /**
     * The edge the sheet comes from. An end sheet comes from the bottom on a window less than
     * twice its width.
     */
    edge?: SheetEdge;
    /**
     * The name of the close button, such as "Close". The button is shown only when you give
     * it, at the end of the header: give it when the footer has no Cancel, and not otherwise.
     */
    closeLabel?: string;
  };

/**
 * The sheet itself, over a scrim: a `SheetHeader`, then a `SheetBody` and a `SheetFooter` if it
 * has them.
 *
 * Focus moves to the title when it opens, or to `initialFocus`, and back to the control that
 * opened it when it closes. Escape, the scrim, and the close button or a `SheetClose` close it.
 */
function SheetContent({
  edge = SHEET_EDGE_DEFAULT,
  closeLabel,
  container,
  initialFocus,
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onKeyDown,
  onPointerDown,
  className,
  style,
  children,
  ref,
  ...props
}: SheetContentProps) {
  const focus = useModalFocus({
    initialFocus,
    returnFocus,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onEscapeKeyDown,
    onKeyDown,
    onPointerDown,
    focusTitle: true,
  });
  const layout = useModalLayout(focus.element);
  const narrow = useNarrowWindow(focus.element, edge === "end");
  const placed: SheetEdge = edge === "end" && narrow ? "bottom" : edge;
  const contentRef = useBothRefs(ref, focus.attach);
  return (
    <SheetPrimitive.Portal container={container}>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className={overlayClasses} />
      <SheetPrimitive.Content
        ref={contentRef}
        data-slot="sheet-content"
        data-edge={placed}
        aria-modal="true"
        className={cn(containerClasses, EDGES[placed], reducedMotion, className)}
        // A bottom sheet keeps its content above the system's home indicator, where there is one.
        style={
          placed === "bottom" ? { paddingBottom: "env(safe-area-inset-bottom)", ...style } : style
        }
        {...focus.props}
        data-scroll={layout.scroll}
        {...props}
      >
        <ModalContext value={{ closeLabel, layout, keyboard: focus.keyboard }}>
          {children}
        </ModalContext>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

type SheetHeaderProps = React.ComponentProps<"div">;

/** The header: a `SheetTitle`, then a `SheetDescription` if the sheet has one. */
function SheetHeader(props: SheetHeaderProps) {
  return <ModalHeader slot="sheet-header" {...props} />;
}

type SheetTitleProps = TitleProps;

/**
 * The sheet's title, which names it. It wraps and is never cut short. Give it the `level` of a
 * heading in the outline of the page.
 */
function SheetTitle({ level, className, ...props }: SheetTitleProps) {
  return (
    <SheetPrimitive.Title asChild>
      <Heading
        level={level}
        variant="heading-md"
        tabIndex={-1}
        data-slot="sheet-title"
        className={cn(titleClasses, className)}
        {...props}
      />
    </SheetPrimitive.Title>
  );
}

type SheetDescriptionProps = React.ComponentProps<typeof SheetPrimitive.Description>;

/** One sentence under the title. Assistive technology reads it after the title. */
function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(descriptionClasses, className)}
      {...props}
    />
  );
}

type SheetBodyProps = React.ComponentProps<"div">;

/** The sheet's content. It scrolls between the header and the footer when it does not fit. */
function SheetBody(props: SheetBodyProps) {
  return <ModalBody slot="sheet-body" {...props} />;
}

type SheetFooterProps = React.ComponentProps<"div">;

/**
 * The buttons, Cancel first and the primary action last, at the bottom of the sheet. They stack
 * when they do not fit.
 */
function SheetFooter(props: SheetFooterProps) {
  return <ModalFooter slot="sheet-footer" {...props} />;
}

export {
  Sheet,
  SheetBody,
  type SheetBodyProps,
  SheetClose,
  type SheetCloseProps,
  SheetContent,
  type SheetContentProps,
  SheetDescription,
  type SheetDescriptionProps,
  SheetFooter,
  type SheetFooterProps,
  SheetHeader,
  type SheetHeaderProps,
  type SheetProps,
  SheetTitle,
  type SheetTitleProps,
  SheetTrigger,
  type SheetTriggerProps,
};
