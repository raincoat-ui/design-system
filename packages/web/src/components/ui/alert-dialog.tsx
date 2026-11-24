"use client";
// The Raincoat AlertDialog. It follows the alert-dialog part of specs/components/dialog/spec.yaml.
//
// Adapted from the shadcn/ui AlertDialog (see shadcn.lock.json and .shadcn-upstream/), on Radix
// AlertDialog: it is an alert dialog to assistive technology, its focus starts on Cancel, Escape
// cancels it, and a press on the scrim does nothing. It shares its container, sections, and
// tokens with the Dialog (dialog.tsx) and always has the small width.
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils.js";
import { Button, type ButtonProps } from "./button.js";
import {
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
} from "./dialog.js";
import { Heading } from "./typography.js";

type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>;

/**
 * Asks people to confirm something consequential or irreversible, such as a deletion. It is
 * modal, its focus starts on Cancel, and Escape cancels it; a press on the scrim does nothing,
 * so that a stray tap never counts as an answer.
 *
 * Give it an `AlertDialogTrigger` and an `AlertDialogContent`. It opens and closes by itself, or
 * is controlled with `open` and `onOpenChange`.
 */
function AlertDialog(props: AlertDialogProps) {
  return <AlertDialogPrimitive.Root {...props} />;
}

type AlertDialogTriggerProps = React.ComponentProps<typeof AlertDialogPrimitive.Trigger>;

/** The control that opens the alert dialog. Render a Button inside it with `asChild`. */
function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

type AlertDialogContentProps = Omit<
  React.ComponentProps<typeof AlertDialogPrimitive.Content>,
  "asChild" | "forceMount" | "onOpenAutoFocus" | "onCloseAutoFocus"
> &
  Omit<ModalContentProps, "initialFocus">;

/**
 * The alert dialog itself, over a scrim: an `AlertDialogHeader`, then an `AlertDialogFooter`
 * with an `AlertDialogCancel` and an `AlertDialogAction`. It has no close button: Cancel is the
 * way out.
 *
 * Focus starts on Cancel, the least destructive action, and returns to the control that opened
 * the alert dialog when it closes.
 */
function AlertDialogContent({
  container,
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onKeyDown,
  onPointerDown,
  className,
  children,
  ref,
  ...props
}: AlertDialogContentProps) {
  const focus = useModalFocus({
    returnFocus,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onKeyDown,
    onPointerDown,
    // Radix puts the first focus on Cancel.
    focusTitle: false,
  });
  const layout = useModalLayout(focus.element);
  const contentRef = useBothRefs(ref, focus.attach);
  return (
    <AlertDialogPrimitive.Portal container={container}>
      <AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" className={overlayClasses} />
      <AlertDialogPrimitive.Content
        ref={contentRef}
        data-slot="alert-dialog-content"
        aria-modal="true"
        className={cn(containerClasses, centeredClasses, "max-w-(--rc-dialog-width-sm)", className)}
        {...focus.props}
        data-scroll={layout.scroll}
        {...props}
      >
        <ModalContext value={{ layout, keyboard: focus.keyboard }}>{children}</ModalContext>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

type AlertDialogHeaderProps = React.ComponentProps<"div">;

/** The header: an `AlertDialogTitle`, then an `AlertDialogDescription`. */
function AlertDialogHeader(props: AlertDialogHeaderProps) {
  return <ModalHeader slot="alert-dialog-header" {...props} />;
}

type AlertDialogTitleProps = TitleProps;

/**
 * The title, which says what will happen, as a question: "Delete this address?". Give it the
 * `level` of a heading in the outline of the page.
 */
function AlertDialogTitle({ level, className, ...props }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <Heading
        level={level}
        variant="heading-md"
        tabIndex={-1}
        data-slot="alert-dialog-title"
        className={cn(titleClasses, className)}
        {...props}
      />
    </AlertDialogPrimitive.Title>
  );
}

type AlertDialogDescriptionProps = React.ComponentProps<typeof AlertDialogPrimitive.Description>;

/** One sentence under the title, such as what confirming does. */
function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(descriptionClasses, className)}
      {...props}
    />
  );
}

type AlertDialogBodyProps = React.ComponentProps<"div">;

/** Content beyond the description, if the question needs it. It scrolls when it does not fit. */
function AlertDialogBody(props: AlertDialogBodyProps) {
  return <ModalBody slot="alert-dialog-body" {...props} />;
}

type AlertDialogFooterProps = React.ComponentProps<"div">;

/** The buttons: `AlertDialogCancel`, then `AlertDialogAction`. They stack when they do not fit. */
function AlertDialogFooter(props: AlertDialogFooterProps) {
  return <ModalFooter slot="alert-dialog-footer" {...props} />;
}

/** The props of a footer button: a Button's, with a label, and with the look the role gives. */
type FooterButtonProps = Omit<React.ComponentProps<"button">, "children"> &
  Pick<ButtonProps, "size" | "loading" | "leadingIcon" | "trailingIcon" | "fullWidth"> & {
    /** The label. */
    children: React.ReactNode;
  };

type AlertDialogCancelProps = FooterButtonProps;

/** Closes the alert dialog without doing anything. Focus starts here. */
function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
  const keyboard = useKeyboardAttribute();
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button
        variant="secondary"
        data-slot="alert-dialog-cancel"
        className={cn(keyboardFocusRing, className)}
        {...keyboard}
        {...props}
      />
    </AlertDialogPrimitive.Cancel>
  );
}

type AlertDialogActionProps = FooterButtonProps & {
  /**
   * The action destroys something, such as deleting: it is a danger button. Otherwise it is a
   * primary button.
   */
  destructive?: boolean;
};

/**
 * The confirming action, which closes the alert dialog. Its label repeats the verb of the title:
 * "Delete address", not "Yes".
 */
function AlertDialogAction({ destructive = false, className, ...props }: AlertDialogActionProps) {
  const keyboard = useKeyboardAttribute();
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button
        variant={destructive ? "danger" : "primary"}
        data-slot="alert-dialog-action"
        className={cn(keyboardFocusRing, className)}
        {...keyboard}
        {...props}
      />
    </AlertDialogPrimitive.Action>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  type AlertDialogActionProps,
  AlertDialogBody,
  type AlertDialogBodyProps,
  AlertDialogCancel,
  type AlertDialogCancelProps,
  AlertDialogContent,
  type AlertDialogContentProps,
  AlertDialogDescription,
  type AlertDialogDescriptionProps,
  AlertDialogFooter,
  type AlertDialogFooterProps,
  AlertDialogHeader,
  type AlertDialogHeaderProps,
  type AlertDialogProps,
  AlertDialogTitle,
  type AlertDialogTitleProps,
  AlertDialogTrigger,
  type AlertDialogTriggerProps,
};
