"use client";
// The Raincoat Toast. It follows specs/components/toast/spec.yaml.
//
// Written on Radix's Toast primitive, which gives the region landmark, the order of the toasts
// for Tab, Escape, and the swipe. shadcn/ui offers a toast only through the sonner library, so
// there is no shadcn/ui source to adapt (see shadcn.lock.json). Raincoat adds what the spec asks
// for and Radix does not do: one toast at a time with a queue, its own timer that pauses, its own
// announcement, F8 to reach the toast and to go back, and room for the on-screen keyboard. Every
// color, size, and duration comes from a Raincoat token.
import { Toast as RadixToast, VisuallyHidden } from "radix-ui";
import * as React from "react";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";

/** How long a toast without an action stays, in milliseconds (RFC 0008). */
const TOAST_DURATION = 6000;

/** The one action a toast can offer. */
type ToastAction = {
  /** One or two words, such as "Undo" or "View". */
  label: string;
  /** What the action does. The toast closes after it. */
  onClick: () => void;
};

/**
 * What a toast says. A toast with an action stays until it is used or closed, so it must have a
 * close button, and the close button must have a name.
 */
type ToastOptions =
  | {
      /** What happened, in one short sentence, such as "Address deleted". */
      message: string;
      action?: never;
      /** The name of a close button, such as "Close". Without it, there is no close button. */
      closeLabel?: string;
    }
  | {
      message: string;
      /** One action, such as Undo. */
      action: ToastAction;
      /** The name of the close button, such as "Close". The button shows only a cross. */
      closeLabel: string;
    };

const toastClasses = [
  // Container: a raised surface with an ink outline, as wide as its content up to the panel
  // width. The action and close button follow the message on its first line.
  "pointer-events-auto relative box-border m-0 flex max-w-(--rc-toast-max-width) items-start gap-(--rc-toast-gap)",
  "rounded-(--rc-toast-radius) border-(length:--rc-toast-border-width) border-solid border-(--rc-toast-border-color)",
  "bg-(--rc-toast-bg) px-(--rc-toast-padding-inline) py-(--rc-toast-padding-block) text-(--rc-toast-fg)",
  "[box-shadow:var(--rc-toast-shadow)]",
  // The same focus ring as a Button, for keyboard focus only. F8 brings focus here.
  "focus-visible:outline-(length:--rc-button-focus-ring-width) focus-visible:outline-offset-(--rc-button-focus-ring-offset) focus-visible:outline-(--rc-button-focus-ring-color) focus-visible:outline-solid",
  // Entering, it slides up a short way while it fades in; leaving, the reverse. With reduced
  // motion it only fades.
  "data-[state=open]:animate-rc-toast-enter data-[state=closed]:animate-rc-toast-exit",
  "motion-reduce:data-[state=open]:animate-rc-toast-fade-in motion-reduce:data-[state=closed]:animate-rc-toast-fade-out",
];

/** The cross of the close button, drawn here rather than taken from an icon set. */
function Cross() {
  return (
    <svg data-slot="toast-close-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The parts inside a toast. `Closes` wraps each button: in a live toast it makes the button close
 * the toast, and in a static one it leaves the button as it is.
 */
function ToastParts({
  options,
  onClose,
  Closes,
}: {
  options: ToastOptions;
  onClose?: () => void;
  Closes: (props: { children: React.ReactElement }) => React.ReactNode;
}) {
  const { message, action, closeLabel } = options;
  return (
    <>
      {/* The message and the action share a line while they fit. When they do not, the action
          moves below the message, at the end. */}
      <div
        data-slot="toast-content"
        className="flex min-w-0 flex-auto flex-wrap items-start gap-(--rc-toast-gap)"
      >
        <RadixToast.Description
          data-slot="toast-message"
          // The first line is centered on the buttons beside it. Lines break by the rules of the
          // message's language, read from lang, as in Text: strictly for Japanese, and between
          // whole words for Korean. The action's label, a Button's, breaks by the same rules.
          className="m-0 min-w-0 flex-auto py-[calc((var(--rc-button-height-sm)_-_1lh)_/_2)] font-(family-name:--rc-toast-message-font-family) text-(length:--rc-toast-message-font-size) leading-(--rc-toast-message-line-height) font-(--rc-toast-message-font-weight) tracking-(--rc-toast-message-letter-spacing) wrap-break-word whitespace-normal [&:lang(ja)]:[line-break:strict] [&:lang(ko)]:break-keep"
        >
          {message}
        </RadixToast.Description>
        {action && (
          <Closes>
            <Button
              data-slot="toast-action"
              variant="ghost"
              size="sm"
              className="ms-auto"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          </Closes>
        )}
      </div>
      {closeLabel !== undefined && (
        <Closes>
          <Button
            data-slot="toast-close"
            variant="ghost"
            size="sm"
            aria-label={closeLabel}
            leadingIcon={<Cross />}
            onClick={onClose}
          />
        </Closes>
      )}
    </>
  );
}

const Unchanged = ({ children }: { children: React.ReactElement }) => children;
const ClosesTheToast = ({ children }: { children: React.ReactElement }) => (
  <RadixToast.Close asChild>{children}</RadixToast.Close>
);

type ToastProps = Omit<React.ComponentProps<"div">, "children"> &
  ToastOptions & {
    /** Called by the close button. */
    onClose?: () => void;
  };

/**
 * A toast as `ToastProvider` draws it, standing still: for documentation, design reviews, and
 * tests. It is not announced and does not close by itself. To show a toast to people, use
 * `useToast()`.
 */
function Toast({ message, action, closeLabel, onClose, className, ...props }: ToastProps) {
  const options = { message, action, closeLabel } as ToastOptions;
  return (
    <div data-slot="toast" className={cn(toastClasses, className)} {...props}>
      <ToastParts options={options} onClose={onClose} Closes={Unchanged} />
    </div>
  );
}

type ToastContextValue = {
  /** Shows a toast now, or after the toasts already waiting. */
  show: (toast: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Shows toasts from anywhere inside a `ToastProvider`:
 *
 *     const toast = useToast();
 *     toast.show({ message: "Address deleted", action: { label: "Undo", onClick: undo }, closeLabel: "Close" });
 */
function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast() needs a ToastProvider around the component.");
  return context;
}

/**
 * Whether the app is in the background: its page hidden, as when the person switches to another
 * tab or app, or locks the screen.
 */
function useInBackground() {
  const [background, setBackground] = React.useState(false);
  React.useEffect(() => {
    const update = () => setBackground(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return background;
}

/**
 * How far the on-screen keyboard reaches up into the window, in pixels: the distance from the
 * bottom of the visible part of the page to the bottom of the window.
 */
function useKeyboardInset() {
  const [inset, setInset] = React.useState(0);
  React.useEffect(() => {
    const shown = window.visualViewport;
    if (!shown) return;
    const update = () => setInset(Math.max(0, window.innerHeight - shown.height - shown.offsetTop));
    update();
    shown.addEventListener("resize", update);
    shown.addEventListener("scroll", update);
    return () => {
      shown.removeEventListener("resize", update);
      shown.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

type QueuedToast = { id: number; options: ToastOptions };

/** One toast on the screen, with its timer. It reports when it has left the screen. */
function LiveToast({
  toast,
  inBackground,
  onClose,
  onGone,
}: {
  toast: QueuedToast;
  inBackground: boolean;
  onClose: () => void;
  onGone: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const remaining = React.useRef(TOAST_DURATION);
  const timed = toast.options.action === undefined;
  const paused = hovered || focused || inBackground;

  // The provider's handler changes with every render; the timer should not restart with it.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const close = React.useCallback(() => {
    setOpen(false);
    onCloseRef.current();
  }, []);

  // The timer runs only while the toast is open and not paused, and goes on from where it
  // stopped. A toast with an action has none.
  React.useEffect(() => {
    if (!timed || !open || paused) return;
    const started = Date.now();
    const timer = setTimeout(close, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [timed, open, paused, close]);

  return (
    <RadixToast.Root
      data-slot="toast"
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      className={cn(toastClasses)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      // The toast follows a swipe down, and goes back if the swipe stops short.
      onSwipeMove={(event) => {
        event.currentTarget.style.translate = `0 ${event.detail.delta.y}px`;
      }}
      onSwipeCancel={(event) => {
        event.currentTarget.style.translate = "";
      }}
    >
      <ToastParts options={toast.options} Closes={ClosesTheToast} />
      <WhenGone open={open} onGone={onGone} />
    </RadixToast.Root>
  );
}

/**
 * Calls `onGone` once the toast has left the screen. Radix unmounts a closed toast when its exit
 * animation ends, and this with it. An unmount while open, as React's strict mode does, is not
 * the toast leaving.
 */
function WhenGone({ open, onGone }: { open: boolean; onGone: () => void }) {
  const state = React.useRef({ open, onGone });
  state.current = { open, onGone };
  React.useEffect(
    () => () => {
      if (!state.current.open) state.current.onGone();
    },
    [],
  );
  return null;
}

type ToastProviderProps = {
  /**
   * The name of the region that holds the toasts, in the app's language, such as
   * "Notifications". Assistive technology lists it with the page's landmarks. Mention F8 in it,
   * if you like: "Notifications (F8)".
   */
  label: string;
  /**
   * Room to leave below the toasts for a bar the app keeps at the bottom of the window: a
   * number of pixels, or any CSS length.
   */
  bottomInset?: number | string;
  children?: React.ReactNode;
};

/**
 * Shows toasts, one at a time, at the bottom center of the window. Put it around the app once;
 * `useToast()` shows a toast from anywhere inside it.
 *
 * A toast never takes focus. F8 moves focus to the toast, and F8 again moves it back.
 */
function ToastProvider({ label, bottomInset = 0, children }: ToastProviderProps) {
  const [queue, setQueue] = React.useState<QueuedToast[]>([]);
  const [announcement, setAnnouncement] = React.useState("");
  const nextId = React.useRef(0);
  const viewport = React.useRef<HTMLOListElement>(null);
  const returnFocusTo = React.useRef<HTMLElement | null>(null);
  const inBackground = useInBackground();
  const keyboard = useKeyboardInset();
  // Radix announces each toast itself, with the provider's label before the message. Raincoat
  // announces the message alone, from the status region below, so Radix's goes nowhere.
  const [nowhere] = React.useState(() =>
    typeof document === "undefined" ? undefined : document.createElement("div"),
  );

  const show = React.useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;
    setQueue((waiting) => [...waiting, { id, options }]);
  }, []);
  const context = React.useMemo(() => ({ show }), [show]);

  const current = queue[0];
  // The message is announced when its toast appears, and cleared when the toast closes, so the
  // same message twice in a row is announced twice.
  React.useEffect(() => {
    setAnnouncement(current ? current.options.message : "");
  }, [current]);

  /** Returns focus to where it was before F8, if focus is among the toasts. */
  const returnFocus = React.useCallback(() => {
    const region = viewport.current;
    if (!region?.contains(document.activeElement)) return;
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (target?.isConnected) target.focus();
    else (document.activeElement as HTMLElement | null)?.blur();
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F8" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const region = viewport.current;
      if (!region) return;
      if (region.contains(document.activeElement)) {
        event.preventDefault();
        returnFocus();
        return;
      }
      const toast = region.querySelector<HTMLElement>('[data-slot="toast"][data-state="open"]');
      if (!toast) return;
      event.preventDefault();
      returnFocusTo.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      toast.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [returnFocus]);

  const clearance = typeof bottomInset === "number" ? `${bottomInset}px` : bottomInset;

  return (
    <ToastContext.Provider value={context}>
      <RadixToast.Provider
        label={label}
        duration={Number.POSITIVE_INFINITY}
        swipeDirection="down"
        announcerContainer={nowhere}
      >
        {children}
        {current && (
          <LiveToast
            key={current.id}
            toast={current}
            inBackground={inBackground}
            onClose={() => {
              setAnnouncement("");
              // Radix has moved focus from the closing toast to the region. Send it back.
              returnFocus();
            }}
            onGone={() => setQueue((waiting) => waiting.filter(({ id }) => id !== current.id))}
          />
        )}
        <RadixToast.Viewport
          ref={viewport}
          data-slot="toast-viewport"
          label={label}
          // F8 is handled above, so that it also goes back.
          hotkey={[]}
          className="pointer-events-none fixed inset-x-0 bottom-0 m-0 box-border flex list-none flex-col items-center p-(--rc-toast-margin) outline-none"
          // Above the on-screen keyboard, or above the app's bottom bar and the device's own
          // bottom edge, whichever is higher.
          style={{
            bottom: `max(${keyboard}px, calc(${clearance} + env(safe-area-inset-bottom, 0px)))`,
          }}
        />
      </RadixToast.Provider>
      {/* Read by assistive technology after whatever it is saying. */}
      <VisuallyHidden.Root data-slot="toast-announcer" role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden.Root>
    </ToastContext.Provider>
  );
}

export {
  Toast,
  type ToastAction,
  type ToastOptions,
  type ToastProps,
  ToastProvider,
  type ToastProviderProps,
  useToast,
};
