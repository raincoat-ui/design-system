"use client";
// The Raincoat Tabs. They follow specs/components/tabs/spec.yaml.
//
// Adapted from the shadcn/ui Tabs (see shadcn.lock.json and .shadcn-upstream/), on Radix Tabs,
// which gives the roles, the arrow keys, and selection. Every color, size, and duration comes
// from a Raincoat token. There is one look and one size: no list variants, no vertical tabs,
// and no disabled tabs.
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";
import { TABS_ACTIVATION_MODE_DEFAULT, type TabsActivationMode } from "../../generated/specs.js";
import { cn } from "../../lib/utils.js";

type Direction = "ltr" | "rtl";

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

const directionOf = (element: Element): Direction =>
  getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";

type TabsProps = Omit<
  React.ComponentProps<typeof TabsPrimitive.Root>,
  "orientation" | "activationMode" | "asChild"
> & {
  /**
   * Whether the arrow keys select the tab they move to (`"automatic"`), or only move focus,
   * so that Enter or Space selects (`"manual"`). Use manual for panels that are slow to show.
   */
  activationMode?: TabsActivationMode;
};

/**
 * Switches between panels of related content in one view.
 *
 * Give it a `TabsList` of `TabsTrigger`s and a `TabsContent` for each. Selection is left to the
 * component with `defaultValue`, or controlled with `value` and `onValueChange`.
 *
 * It follows the direction of the page. Pass `dir` only to set a direction of its own.
 */
function Tabs({
  className,
  dir,
  activationMode = TABS_ACTIVATION_MODE_DEFAULT,
  children,
  ...props
}: TabsProps) {
  // Radix reads the direction for the arrow keys from its `dir` prop and writes it on its
  // element, as "ltr" when it is not given, which would turn a right-to-left page's tabs
  // around. So the element carries only the app's own `dir`, and Radix is told the direction
  // the element inherits, read when focus first enters it, before any key is pressed.
  const [inherited, setInherited] = React.useState<Direction>();
  const readDirection = (event: React.FocusEvent<HTMLDivElement>) =>
    setInherited(directionOf(event.currentTarget));

  return (
    <TabsPrimitive.Root
      asChild
      dir={dir ?? inherited}
      orientation="horizontal"
      activationMode={activationMode}
      {...props}
    >
      <div
        data-slot="tabs"
        dir={dir}
        className={cn("flex flex-col", className)}
        onFocusCapture={readDirection}
      >
        {children}
      </div>
    </TabsPrimitive.Root>
  );
}

/**
 * Scrolls the list just enough to show the whole tab, and nothing else on the page. The
 * distance is rounded away from zero: some browsers scroll in whole pixels only.
 */
function reveal(list: HTMLElement, tab: Element) {
  const outer = list.getBoundingClientRect();
  const inner = tab.getBoundingClientRect();
  if (inner.left < outer.left) list.scrollBy({ left: Math.floor(inner.left - outer.left) });
  else if (inner.right > outer.right) list.scrollBy({ left: Math.ceil(inner.right - outer.right) });
}

/**
 * Scrolls the list by about a page toward one of its ends: the first tab cut off at that end
 * moves to the other edge of the list.
 */
function page(list: HTMLElement, toward: "start" | "end") {
  const outer = list.getBoundingClientRect();
  const tabs = [...list.children].map((tab) => tab.getBoundingClientRect());
  const towardRight = (toward === "end") !== (directionOf(list) === "rtl");
  if (towardRight) {
    const cut = tabs.filter((tab) => tab.right > outer.right + 1).sort((a, b) => a.left - b.left);
    if (cut[0]) list.scrollBy({ left: cut[0].left - outer.left });
  } else {
    const cut = tabs.filter((tab) => tab.left < outer.left - 1).sort((a, b) => b.right - a.right);
    if (cut[0]) list.scrollBy({ left: cut[0].right - outer.right });
  }
}

type Overflow = { atStart: boolean; atEnd: boolean; rtl: boolean };

/** How far the list is scrolled, or null when every tab fits without scrolling. */
function measure(frame: HTMLElement, list: HTMLElement): Overflow | null {
  // Compared with the whole width the list has without the scroll buttons, so that showing
  // them never decides whether they are needed.
  if (list.scrollWidth <= frame.clientWidth) return null;
  const scrolled = Math.abs(list.scrollLeft);
  return {
    atStart: scrolled <= 1,
    atEnd: scrolled >= list.scrollWidth - list.clientWidth - 1,
    rtl: directionOf(list) === "rtl",
  };
}

const sameOverflow = (a: Overflow | null, b: Overflow | null) =>
  a === b || (!!a && !!b && a.atStart === b.atStart && a.atEnd === b.atEnd && a.rtl === b.rtl);

function Chevron({ pointing }: { pointing: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={pointing === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * A previous or next button at an end of a list that overflows. It is there for a mouse, which
 * cannot scroll sideways: it is hidden from assistive technology and is not in the Tab order,
 * because the arrow keys reach every tab, and it is not shown on a touch screen, where a swipe
 * scrolls. At the end the list cannot scroll toward, it keeps its room but is not shown.
 */
function ScrollButton({
  toward,
  overflow,
  onPage,
}: {
  toward: "start" | "end";
  overflow: Overflow;
  onPage: (toward: "start" | "end") => void;
}) {
  const left = (toward === "start") !== overflow.rtl;
  const done = toward === "start" ? overflow.atStart : overflow.atEnd;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-slot="tabs-scroll-button"
      data-toward={toward}
      className={cn(
        "m-0 box-border inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent",
        "min-h-(--rc-tabs-height) px-(--rc-tabs-gap) py-0 text-(--rc-tabs-fg-default)",
        "[&_svg]:pointer-events-none [&_svg]:size-(--rc-tabs-icon-size) [&_svg]:shrink-0",
        "transition-[background-color,color] duration-(--rc-tabs-transition-duration) ease-(--rc-tabs-transition-easing) motion-reduce:transition-none",
        "hover:bg-(--rc-tabs-bg-hover) hover:text-(--rc-tabs-fg-hover) active:bg-(--rc-tabs-bg-pressed) active:text-(--rc-tabs-fg-hover)",
        "pointer-coarse:hidden",
        done && "invisible",
      )}
      // A click must not move focus onto a button that assistive technology does not see.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPage(toward)}
    >
      <Chevron pointing={left ? "left" : "right"} />
    </button>
  );
}

type TabsListProps = Omit<React.ComponentProps<typeof TabsPrimitive.List>, "loop" | "asChild">;

/** Whether a key was pressed in the tab list since a pointer last was. See TabsList. */
const KeyboardInList = React.createContext(false);

/**
 * The row of tabs, over a hairline across the full width. When the tabs do not fit, it scrolls
 * sideways, and a mouse gets previous and next buttons at its ends.
 *
 * Name it with `aria-label` when a screen has more than one set of tabs.
 */
function TabsList({ className, ref, onKeyDown, onPointerDown, ...props }: TabsListProps) {
  const frame = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const listRef = useBothRefs(ref, list);
  const [overflow, setOverflow] = React.useState<Overflow | null>(null);
  // Whether a key was pressed in the list since a pointer last was. The arrow keys move focus
  // by script, and after a click Firefox does not count that as keyboard focus, so the tabs
  // show their focus ring for it themselves.
  const [keyboard, setKeyboard] = React.useState(false);

  React.useEffect(() => {
    const outer = frame.current;
    const inner = list.current;
    if (!outer || !inner) return;
    const update = () =>
      setOverflow((before) => {
        const after = measure(outer, inner);
        return sameOverflow(before, after) ? before : after;
      });
    // Sizes are read in the next frame, so that what the update changes is not measured while
    // the browser is still reporting the change that caused it.
    let frameRequest = 0;
    const later = () => {
      cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(update);
    };
    const sizes = new ResizeObserver(later);
    const observe = () => {
      sizes.disconnect();
      sizes.observe(outer);
      for (const tab of inner.children) sizes.observe(tab);
    };
    // A tab added or removed changes what is measured; a tab newly selected by the app, not by
    // focus, is scrolled into view.
    const changes = new MutationObserver((records) => {
      observe();
      later();
      for (const { type, target } of records) {
        if (type !== "attributes" || !(target instanceof Element)) continue;
        if (target.getAttribute("aria-selected") === "true") reveal(inner, target);
      }
    });
    changes.observe(inner, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });
    inner.addEventListener("scroll", update, { passive: true });
    observe();
    update();
    return () => {
      cancelAnimationFrame(frameRequest);
      sizes.disconnect();
      changes.disconnect();
      inner.removeEventListener("scroll", update);
    };
  }, []);

  // The selected tab is scrolled into view when the list first shows, and again when the
  // scroll buttons come or go, which narrows or widens the list.
  const overflowing = overflow !== null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: it runs when overflowing changes.
  React.useEffect(() => {
    const inner = list.current;
    const selected = inner?.querySelector('[role="tab"][aria-selected="true"]');
    if (inner && selected) reveal(inner, selected);
  }, [overflowing]);

  const onPage = (toward: "start" | "end") => {
    if (list.current) page(list.current, toward);
  };

  return (
    <div
      ref={frame}
      data-slot="tabs-list-frame"
      className={cn(
        "relative flex",
        // The hairline across the full width. The list is drawn over it, so the indicator
        // covers it under the selected tab.
        "before:absolute before:inset-x-0 before:bottom-0 before:h-(--rc-tabs-divider-width) before:bg-(--rc-tabs-divider-color) before:content-['']",
      )}
    >
      {overflow && <ScrollButton toward="start" overflow={overflow} onPage={onPage} />}
      <KeyboardInList value={keyboard}>
        <TabsPrimitive.List
          ref={listRef}
          data-slot="tabs-list"
          onKeyDown={(event) => {
            setKeyboard(true);
            onKeyDown?.(event);
          }}
          onPointerDown={(event) => {
            setKeyboard(false);
            onPointerDown?.(event);
          }}
          className={cn(
            "relative flex min-w-0 flex-auto overflow-x-auto overflow-y-hidden",
            // The list scrolls without showing a scroll bar: a swipe, the arrow keys, or the
            // scroll buttons move it.
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            // On a touch screen, room above and below tabs shorter than the minimum target, for
            // their touch targets to reach into. The margins take that room back, so the list is
            // as tall as its tabs.
            "pointer-coarse:py-[calc((var(--rc-tabs-target-minimum)_-_min(var(--rc-tabs-target-minimum),var(--rc-tabs-height)))/2)]",
            "pointer-coarse:my-[calc((min(var(--rc-tabs-target-minimum),var(--rc-tabs-height))_-_var(--rc-tabs-target-minimum))/2)]",
            className,
          )}
          {...props}
        />
      </KeyboardInList>
      {overflow && <ScrollButton toward="end" overflow={overflow} onPage={onPage} />}
    </div>
  );
}

/** A tab needs a name: its label, or an accessible name when an icon is all it shows. */
type AccessibleName =
  | { children: React.ReactNode }
  | { children?: never; "aria-label": string }
  | { children?: never; "aria-labelledby": string };

type TabsTriggerProps = Omit<
  React.ComponentProps<typeof TabsPrimitive.Trigger>,
  "children" | "disabled" | "asChild"
> &
  AccessibleName & {
    /** An icon before the label. For a tab that is only an icon, pass it here. */
    leadingIcon?: React.ReactNode;
  };

/**
 * A tab. Its label stays on one line and is never truncated. Give it a label, or an
 * `aria-label` when an icon is all it shows. There is no disabled tab: hide a tab that leads
 * nowhere.
 */
function TabsTrigger({ className, leadingIcon, children, ...props }: TabsTriggerProps) {
  const keyboard = React.useContext(KeyboardInList);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-keyboard={keyboard ? "" : undefined}
      className={cn(
        // Everything a browser styles on a button by default is set here, so the tab looks the
        // same with or without a CSS reset.
        "relative m-0 box-border inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center gap-(--rc-tabs-gap) border-0 bg-transparent text-center no-underline normal-case",
        // One line of text, centered in the token height. The tab grows taller with the text.
        "min-h-(--rc-tabs-height) px-(--rc-tabs-padding-inline) py-[calc((var(--rc-tabs-height)_-_1lh)/2)] whitespace-nowrap",
        "font-(family-name:--rc-tabs-label-font-family) text-(length:--rc-tabs-label-font-size) leading-(--rc-tabs-label-line-height) font-(--rc-tabs-label-font-weight) tracking-(--rc-tabs-label-letter-spacing)",
        "text-(--rc-tabs-fg-default) data-[state=active]:text-(--rc-tabs-fg-selected)",
        "[&_svg]:pointer-events-none [&_svg]:size-(--rc-tabs-icon-size) [&_svg]:shrink-0",
        // Color changes. With reduced motion they are immediate.
        "transition-[background-color,color] duration-(--rc-tabs-transition-duration) ease-(--rc-tabs-transition-easing) motion-reduce:transition-none",
        "hover:bg-(--rc-tabs-bg-hover) hover:text-(--rc-tabs-fg-hover) active:bg-(--rc-tabs-bg-pressed) active:text-(--rc-tabs-fg-hover)",
        // The indicator, under the selected tab. It fades in with the label's color.
        "after:absolute after:inset-x-0 after:bottom-0 after:h-(--rc-tabs-indicator-width) after:bg-transparent after:content-['']",
        "after:transition-[background-color] after:duration-(--rc-tabs-transition-duration) after:ease-(--rc-tabs-transition-easing) motion-reduce:after:transition-none",
        "data-[state=active]:after:bg-(--rc-tabs-indicator-color)",
        // The focus ring, for keyboard focus only, inside the tab's edge, where the scrolling
        // list cannot clip it. Focus that the arrow keys move counts as keyboard focus in every
        // browser.
        "focus-visible:outline-(length:--rc-tabs-focus-ring-width) focus-visible:outline-offset-[calc(0px_-_var(--rc-tabs-focus-ring-width))] focus-visible:outline-(--rc-tabs-focus-ring-color) focus-visible:outline-solid",
        "data-keyboard:focus:outline-(length:--rc-tabs-focus-ring-width) data-keyboard:focus:outline-offset-[calc(0px_-_var(--rc-tabs-focus-ring-width))] data-keyboard:focus:outline-(--rc-tabs-focus-ring-color) data-keyboard:focus:outline-solid",
        // On touch screens the target is at least the minimum size, whatever the visible height.
        "pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:inset-y-[min(0px,calc((100%_-_var(--rc-tabs-target-minimum))/2))] pointer-coarse:before:content-['']",
        className,
      )}
      {...props}
    >
      {leadingIcon && (
        <span data-slot="tabs-icon" aria-hidden="true" className="inline-flex shrink-0">
          {leadingIcon}
        </span>
      )}
      {children}
    </TabsPrimitive.Trigger>
  );
}

/** What Tab can reach inside a panel, so that the panel need not take focus itself. */
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

type TabsContentProps = Omit<
  React.ComponentProps<typeof TabsPrimitive.Content>,
  "forceMount" | "asChild"
> & {
  /**
   * Keeps the panel's content in the page, hidden, while its tab is not selected, so that it
   * keeps its state. Otherwise the content is rendered only while its tab is selected, and the
   * panel is an empty, hidden element that its tab points to.
   */
  keepMounted?: boolean;
};

/**
 * The panel of a tab, named by its tab. A panel with nothing focusable in it takes focus
 * itself, so that Tab reaches its content; one with a link or a control in it does not.
 */
function TabsContent({
  className,
  keepMounted = false,
  tabIndex,
  ref,
  ...props
}: TabsContentProps) {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const panelRef = useBothRefs(ref, setElement);
  const [holdsFocusable, setHoldsFocusable] = React.useState(false);

  React.useEffect(() => {
    if (!element) return;
    const check = () => setHoldsFocusable(element.querySelector(TABBABLE) !== null);
    const changes = new MutationObserver(check);
    changes.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "href", "tabindex", "contenteditable", "type", "controls"],
    });
    check();
    return () => changes.disconnect();
  }, [element]);

  return (
    <TabsPrimitive.Content
      ref={panelRef}
      data-slot="tabs-content"
      forceMount={keepMounted || undefined}
      tabIndex={tabIndex ?? (holdsFocusable ? undefined : 0)}
      className={cn(
        // A kept panel that is not selected is hidden from everyone.
        "data-[state=inactive]:hidden",
        "focus-visible:outline-(length:--rc-tabs-focus-ring-width) focus-visible:outline-offset-[calc(0px_-_var(--rc-tabs-focus-ring-width))] focus-visible:outline-(--rc-tabs-focus-ring-color) focus-visible:outline-solid",
        className,
      )}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsContent,
  type TabsContentProps,
  TabsList,
  type TabsListProps,
  type TabsProps,
  TabsTrigger,
  type TabsTriggerProps,
};
