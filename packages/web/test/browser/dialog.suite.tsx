// The tests of the Dialog, the AlertDialog, and the Sheet, written against
// specs/components/dialog/spec.yaml and the Accessibility table of
// rfcs/0006-dialog-and-sheet.md. They run once for each way an app can load the styles: see the
// two files that call describeDialog.
//
// Expected sizes, colors, and durations come from the token source (expected-tokens.js), not
// from the stylesheet, so each comparison covers the whole path from a token to what the browser
// draws. A dialog is rendered at the end of the page's body, so the tests set the color mode,
// density, and direction on the root element, as an app does.
import axe from "axe-core";
import { type ReactNode, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  DIALOG_SIZES,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type SHEET_EDGES,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type ToastOptions,
  ToastProvider,
  useToast,
} from "../../src/index.js";

const MODES = ["light", "dark", "light-hc", "dark-hc"] as const;
const DENSITIES = ["comfortable", "compact"] as const;
type Mode = (typeof MODES)[number];
type Density = (typeof DENSITIES)[number];

const VIEWPORT = { width: 1024, height: 768 };
const PARAGRAPH =
  "Everyone the file is shared with sees the new name. Links to the file keep working, and so do shortcuts to it in other folders.";

const expected = inject("tokens");

function token(id: string, mode: Mode = "light", density: Density = "comfortable") {
  const value = expected[`${mode}/${density}`]?.[id];
  if (value === undefined) throw new Error(`no expected value for ${id} in ${mode}/${density}`);
  return value;
}
/** A color token as the browser reports it: "rgb(247, 210, 42)". */
const color = (id: string, mode?: Mode) => String(token(id, mode));
/** A dimension token in CSS pixels, or a duration token in seconds. */
const number = (id: string, density?: Density) => Number(token(id, "light", density));

const computed = (element: Element) => getComputedStyle(element);
const pixels = (value: string) => Number.parseFloat(value);
const rect = (element: Element) => element.getBoundingClientRect();

/** Waits until an element's animations, such as a sheet sliding in, have ended. */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((animation) => animation.finished));
}

/**
 * Sets the color mode, density, direction, and language on the root element, as an app does,
 * because a dialog is rendered at the end of the page's body. Undone after each test.
 */
function onRoot({ mode, density, dir }: { mode?: Mode; density?: Density; dir?: "ltr" | "rtl" }) {
  const root = document.documentElement;
  if (mode) root.dataset.theme = mode;
  if (density) root.dataset.density = density;
  if (dir) root.dir = dir;
}

type Media = Parameters<typeof commands.emulateMedia>[0];
/** Runs with a system setting emulated, such as `{ reducedMotion: "reduce" }`. */
async function withMedia(media: Media, run: () => Promise<void>) {
  await commands.emulateMedia(media);
  try {
    await run();
  } finally {
    await commands.emulateMedia(Object.fromEntries(Object.keys(media).map((name) => [name, null])));
  }
}

/** The page behind a dialog, with a control of its own. */
function Page({ children }: { children: ReactNode }) {
  return (
    <main data-testid="page" style={{ background: "var(--rc-color-bg-canvas)", padding: 24 }}>
      <Button>Behind the dialog</Button>
      {children}
    </main>
  );
}

/** A dialog with a short form and a footer of Cancel and Rename, opened by its trigger. */
function RenameDialog({
  closeLabel,
  footer = true,
  description = true,
  onOpenChange,
  onEscapeKeyDown,
  open,
  focusField = false,
  size,
}: {
  closeLabel?: string;
  footer?: boolean;
  description?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  open?: boolean;
  focusField?: boolean;
  size?: (typeof DIALOG_SIZES)[number];
}) {
  const field = useRef<HTMLInputElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Rename</Button>
      </DialogTrigger>
      <DialogContent
        size={size}
        closeLabel={closeLabel}
        initialFocus={focusField ? field : undefined}
        onEscapeKeyDown={onEscapeKeyDown}
      >
        <DialogHeader>
          <DialogTitle level={2}>Rename file</DialogTitle>
          {description && <DialogDescription>{PARAGRAPH}</DialogDescription>}
        </DialogHeader>
        <DialogBody>
          <label htmlFor="name">
            Name
            <input id="name" ref={field} defaultValue="Quarterly report" />
          </label>
        </DialogBody>
        {footer && (
          <DialogFooter>
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button variant="primary">Rename file</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** An alert dialog that confirms a deletion, opened by its trigger. */
function DeleteAlert({
  onAction,
  onOpenChange,
  onEscapeKeyDown,
  labels = ["Cancel", "Delete address"],
}: {
  onAction?: () => void;
  onOpenChange?: (open: boolean) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  labels?: [string, string];
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent onEscapeKeyDown={onEscapeKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle level={2}>Delete this address?</AlertDialogTitle>
          <AlertDialogDescription>It is removed from your account.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labels[0]}</AlertDialogCancel>
          <AlertDialogAction destructive onClick={onAction}>
            {labels[1]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** A sheet with a close button and one action, opened by its trigger. */
function FilterSheet({
  edge,
  onOpenChange,
  onEscapeKeyDown,
}: {
  edge?: (typeof SHEET_EDGES)[number];
  onOpenChange?: (open: boolean) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button>Filters</Button>
      </SheetTrigger>
      <SheetContent edge={edge} closeLabel="Close" onEscapeKeyDown={onEscapeKeyDown}>
        <SheetHeader>
          <SheetTitle level={2}>Filters</SheetTitle>
        </SheetHeader>
        <SheetBody>Show files shared with you in the last 30 days.</SheetBody>
        <SheetFooter>
          <Button variant="primary">Show results</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** A toast with an action, which stays until it is used or closed. */
const toastWithUndo = (message: string): ToastOptions => ({
  message,
  action: { label: "Undo", onClick: () => {} },
  closeLabel: "Dismiss",
});

/** The open toast on the screen, or null. */
const openToast = () =>
  document.querySelector<HTMLElement>('[data-slot="toast"][data-state="open"]');

/** A button on the page that shows a toast. */
function MarkAllRead() {
  const toast = useToast();
  return (
    <Button onClick={() => toast.show(toastWithUndo("All messages marked read"))}>
      Mark all read
    </Button>
  );
}

/** The page behind a dialog in an app that shows toasts, with a button that shows one. */
function ToastPage({ children }: { children: ReactNode }) {
  return (
    <ToastProvider label="Notifications">
      <Page>
        <MarkAllRead />
        {children}
      </Page>
    </ToastProvider>
  );
}

/**
 * A dialog, or a sheet, whose Archive button shows a toast and leaves it open, as an action in a
 * dialog can. Opened by its trigger, "Open the report".
 */
function ReportDialog({
  sheet = false,
  onOpenChange,
  onEscapeKeyDown,
}: {
  sheet?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}) {
  const toast = useToast();
  const archive = () => toast.show(toastWithUndo("Report archived"));
  const trigger = <Button>Open the report</Button>;
  const archiveButton = <Button onClick={archive}>Archive</Button>;
  if (sheet) {
    return (
      <Sheet onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent closeLabel="Close" onEscapeKeyDown={onEscapeKeyDown}>
          <SheetHeader>
            <SheetTitle level={2}>Weekly report</SheetTitle>
          </SheetHeader>
          <SheetFooter>{archiveButton}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel="Close" onEscapeKeyDown={onEscapeKeyDown}>
        <DialogHeader>
          <DialogTitle level={2}>Weekly report</DialogTitle>
        </DialogHeader>
        <DialogFooter>{archiveButton}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A dialog that a Button opens by setting its state, without a DialogTrigger. */
function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Show shortcuts</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel="Close">
          <DialogHeader>
            <DialogTitle level={2}>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A row whose delete button is gone once its alert dialog confirms the deletion. */
function Row() {
  const [deleted, setDeleted] = useState(false);
  const list = useRef<HTMLHeadingElement>(null);
  return (
    <>
      <h2 ref={list} tabIndex={-1}>
        Addresses
      </h2>
      {!deleted && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="danger">Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent returnFocus={list}>
            <AlertDialogHeader>
              <AlertDialogTitle level={2}>Delete this address?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction destructive onClick={() => setDeleted(true)}>
                Delete address
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

/** A dialog whose body is much taller than the window. */
function LongDialog() {
  return (
    <Dialog defaultOpen>
      <DialogContent closeLabel="Close">
        <DialogHeader>
          <DialogTitle level={2}>Terms of use</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {Array.from({ length: 30 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs never change.
            <p key={index}>{PARAGRAPH}</p>
          ))}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Decline</Button>
          </DialogClose>
          <Button variant="primary">Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Renders the page with a dialog and opens it with a click on its trigger. */
async function open(ui: ReactNode, trigger = "Rename", role = "dialog") {
  const screen = await render(<Page>{ui}</Page>);
  await screen.getByRole("button", { name: trigger }).click();
  const dialog = page.getByRole(role as "dialog");
  await expect.element(dialog).toBeVisible();
  await settled(dialog.element());
  return { screen, dialog, element: dialog.element() as HTMLElement };
}

const section = (dialog: Element, name: string) =>
  dialog.querySelector<HTMLElement>(`[data-section="${name}"]`) as HTMLElement;

export function describeDialog(environment: string) {
  describe(`Dialog, ${environment}`, () => {
    beforeEach(() => commands.movePointerAway());
    afterEach(async () => {
      const root = document.documentElement;
      delete root.dataset.theme;
      delete root.dataset.density;
      root.removeAttribute("dir");
      root.style.fontSize = "";
      await page.viewport(VIEWPORT.width, VIEWPORT.height);
    });

    describe("role and name", () => {
      test("a dialog is a modal dialog named by its title and described by its description", async () => {
        const { dialog, element } = await open(<RenameDialog />);
        await expect.element(page.getByRole("dialog", { name: "Rename file" })).toBeVisible();
        await expect.element(dialog).toHaveAttribute("aria-modal", "true");
        await expect.element(dialog).toHaveAccessibleDescription(PARAGRAPH);
        await expect.element(dialog).toHaveAttribute("data-size", "md");
        const title = page.getByRole("heading", { name: "Rename file", level: 2 }).element();
        expect(element.contains(title)).toBe(true);
        expect(title.getAttribute("data-variant")).toBe("heading-md");
      });

      test("without a description, a dialog is described by nothing", async () => {
        const { element } = await open(<RenameDialog description={false} />);
        expect(element.hasAttribute("aria-describedby")).toBe(false);
      });

      test("an alert dialog is an alert dialog named by its title", async () => {
        await open(<DeleteAlert />, "Delete", "alertdialog");
        const alert = page.getByRole("alertdialog", { name: "Delete this address?" });
        await expect.element(alert).toHaveAttribute("aria-modal", "true");
        await expect.element(alert).toHaveAccessibleDescription("It is removed from your account.");
      });

      test("a sheet is a modal dialog named by its title, at the bottom unless told otherwise", async () => {
        const { dialog } = await open(<FilterSheet />, "Filters");
        await expect.element(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
        await expect.element(dialog).toHaveAttribute("aria-modal", "true");
        await expect.element(dialog).toHaveAttribute("data-edge", "bottom");
      });

      test("the page behind is hidden from assistive technology", async () => {
        const { screen } = await open(<RenameDialog />);
        const behind = screen.getByText("Behind the dialog").element();
        expect(behind.closest('[aria-hidden="true"]')).not.toBeNull();
        await expect
          .element(page.getByRole("button", { name: "Behind the dialog" }))
          .not.toBeInTheDocument();
        // Only the dialog's own controls are left.
        const names = page
          .getByRole("button")
          .elements()
          .map((button) => button.textContent || button.getAttribute("aria-label"));
        expect(names).toEqual(["Cancel", "Rename file"]);
      });

      test("the close button is shown only with a close label, which names it", async () => {
        const { element } = await open(<RenameDialog footer={false} closeLabel="Close" />);
        const close = page.getByRole("button", { name: "Close" });
        await expect.element(close).toBeVisible();
        // It is a ghost Button with only an icon, at the end of the header.
        expect(close.element().getAttribute("data-variant")).toBe("ghost");
        expect(section(element, "header").contains(close.element())).toBe(true);
        await close.click();
        await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
      });

      test("there is no close button without a close label", async () => {
        const { element } = await open(<RenameDialog />);
        expect(element.querySelector('[data-slot="dialog-close-button"]')).toBeNull();
      });
    });

    describe("focus", () => {
      test("moves to the title on open, and back to the opener on close", async () => {
        const { screen } = await open(<RenameDialog />);
        const title = page.getByRole("heading", { name: "Rename file" });
        await expect.element(title).toHaveFocus();
        // The title is not a control: it shows no ring.
        expect(computed(title.element()).outlineStyle).toBe("none");
        await userEvent.keyboard("{Escape}");
        await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
        await expect.element(screen.getByRole("button", { name: "Rename" })).toHaveFocus();
      });

      test("moves to the target the app names, such as the first field", async () => {
        await open(<RenameDialog focusField />);
        await expect.element(page.getByRole("textbox", { name: "Name" })).toHaveFocus();
      });

      test("stays inside while Tab and Shift+Tab move it", async () => {
        const { element } = await open(<RenameDialog closeLabel="Close" footer={false} />);
        const reached = new Set<string>();
        for (let step = 0; step < 6; step++) {
          await userEvent.tab();
          expect(element.contains(document.activeElement)).toBe(true);
          reached.add(
            document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.id ?? "",
          );
        }
        // From the title, Tab reaches the close button and the field, and wraps between them.
        expect([...reached].sort()).toEqual(["Close", "name"]);
        for (let step = 0; step < 4; step++) {
          await userEvent.tab({ shift: true });
          expect(element.contains(document.activeElement)).toBe(true);
        }
      });

      test("returns to the control that opened a dialog without a trigger", async () => {
        const screen = await render(<Page>{<Opener />}</Page>);
        const opener = screen.getByRole("button", { name: "Show shortcuts" });
        await opener.click();
        await expect
          .element(page.getByRole("heading", { name: "Keyboard shortcuts" }))
          .toHaveFocus();
        await userEvent.keyboard("{Escape}");
        await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
        await expect.element(opener).toHaveFocus();
      });

      test("goes where the app says when the opener is gone", async () => {
        const screen = await render(<Page>{<Row />}</Page>);
        await screen.getByRole("button", { name: "Delete" }).click();
        await page.getByRole("button", { name: "Delete address" }).click();
        await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
        await expect.element(screen.getByRole("heading", { name: "Addresses" })).toHaveFocus();
      });

      test("an alert dialog starts on Cancel, the least destructive action", async () => {
        await open(<DeleteAlert />, "Delete", "alertdialog");
        await expect.element(page.getByRole("button", { name: "Cancel" })).toHaveFocus();
      });

      test("opened from the keyboard, the button focus starts on shows its focus ring", async () => {
        const screen = await render(
          <Page>
            <DeleteAlert />
          </Page>,
        );
        await userEvent.tab();
        await userEvent.tab();
        await expect.element(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        const cancel = page.getByRole("button", { name: "Cancel" });
        await expect.element(cancel).toHaveFocus();
        const style = computed(cancel.element());
        expect(style.outlineStyle).toBe("solid");
        expect(pixels(style.outlineWidth)).toBe(number("button.focus-ring.width"));
        expect(pixels(style.outlineOffset)).toBe(number("button.focus-ring.offset"));
        expect(style.outlineColor).toBe(color("button.focus-ring.color"));
      });

      test("opened with a pointer, the button focus starts on shows no ring", async () => {
        const screen = await render(
          <Page>
            <DeleteAlert />
          </Page>,
        );
        await screen.getByRole("button", { name: "Delete" }).click();
        const cancel = page.getByRole("button", { name: "Cancel" });
        await expect.element(cancel).toHaveFocus();
        expect(computed(cancel.element()).outlineStyle).toBe("none");
      });
    });

    describe("dismissal", () => {
      test("Escape, the scrim, Cancel, and the close button each close a dialog", async () => {
        const onOpenChange = vi.fn();
        const closes: [string, () => Promise<void>][] = [
          ["Escape", () => userEvent.keyboard("{Escape}")],
          ["the scrim", () => userEvent.click(document.body, { position: { x: 4, y: 4 } })],
          ["Cancel", () => page.getByRole("button", { name: "Cancel" }).click()],
          ["the close button", () => page.getByRole("button", { name: "Close" }).click()],
        ];
        for (const [way, close] of closes) {
          const screen = await render(
            <Page>
              <RenameDialog
                closeLabel={way === "the close button" ? "Close" : undefined}
                onOpenChange={onOpenChange}
              />
            </Page>,
          );
          await screen.getByRole("button", { name: "Rename" }).click();
          await expect.element(page.getByRole("dialog")).toBeVisible();
          await close();
          await expect.element(page.getByRole("dialog"), { timeout: 2000 }).not.toBeInTheDocument();
          expect(onOpenChange, way).toHaveBeenLastCalledWith(false);
          await screen.unmount();
        }
      });

      test("an alert dialog cancels on Escape and on Cancel, and ignores the scrim", async () => {
        const onAction = vi.fn();
        const onOpenChange = vi.fn();
        await open(
          <DeleteAlert onAction={onAction} onOpenChange={onOpenChange} />,
          "Delete",
          "alertdialog",
        );
        await userEvent.click(document.body, { position: { x: 4, y: 4 } });
        await expect.element(page.getByRole("alertdialog")).toBeVisible();
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
        await userEvent.keyboard("{Escape}");
        await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
        expect(onAction).not.toHaveBeenCalled();

        await page.getByRole("button", { name: "Delete" }).click();
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
        expect(onAction).not.toHaveBeenCalled();
      });

      test("one Escape asks the app to close once, for each kind", async () => {
        type Handlers = {
          onOpenChange: (open: boolean) => void;
          onEscapeKeyDown: (event: KeyboardEvent) => void;
        };
        const kinds: [string, (handlers: Handlers) => ReactNode, string][] = [
          ["Rename", (handlers) => <RenameDialog {...handlers} />, "dialog"],
          ["Delete", (handlers) => <DeleteAlert {...handlers} />, "alertdialog"],
          ["Filters", (handlers) => <FilterSheet {...handlers} />, "dialog"],
        ];
        for (const [trigger, ui, role] of kinds) {
          const onOpenChange = vi.fn();
          const onEscapeKeyDown = vi.fn();
          const { screen, dialog } = await open(
            ui({ onOpenChange, onEscapeKeyDown }),
            trigger,
            role,
          );
          await userEvent.keyboard("{Escape}");
          await expect.element(dialog).not.toBeInTheDocument();
          expect(onOpenChange.mock.calls, trigger).toEqual([[true], [false]]);
          expect(onEscapeKeyDown, trigger).toHaveBeenCalledTimes(1);
          await screen.unmount();
        }
      });

      test("the app can refuse to close, as while there are unsaved changes", async () => {
        const onOpenChange = vi.fn();
        // A dialog that the app keeps open: it does not set `open` to false when asked to.
        await render(
          <Page>
            <RenameDialog open onOpenChange={onOpenChange} />
          </Page>,
        );
        await expect.element(page.getByRole("dialog")).toBeVisible();
        await userEvent.keyboard("{Escape}");
        expect(onOpenChange).toHaveBeenCalledWith(false);
        await expect.element(page.getByRole("dialog")).toBeVisible();
      });
    });

    describe("Escape with a toast on the screen", () => {
      test("a toast shown before the dialog opened stays when Escape closes the dialog", async () => {
        const onOpenChange = vi.fn();
        const screen = await render(
          <ToastPage>
            <ReportDialog onOpenChange={onOpenChange} />
          </ToastPage>,
        );
        await screen.getByRole("button", { name: "Mark all read" }).click();
        await expect.poll(openToast).not.toBeNull();
        await screen.getByRole("button", { name: "Open the report" }).click();
        const dialog = page.getByRole("dialog");
        await expect.element(page.getByRole("heading", { name: "Weekly report" })).toHaveFocus();
        await userEvent.keyboard("{Escape}");
        await expect.element(dialog).not.toBeInTheDocument();
        expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
        expect(openToast()?.textContent).toContain("All messages marked read");
        await expect.element(screen.getByRole("button", { name: "Open the report" })).toHaveFocus();
      });

      test.each([
        ["dialog", false],
        ["sheet", true],
      ])("a toast shown from a %s stays when Escape closes it", async (_kind, sheet) => {
        const onOpenChange = vi.fn();
        const screen = await render(
          <ToastPage>
            <ReportDialog sheet={sheet} onOpenChange={onOpenChange} />
          </ToastPage>,
        );
        await screen.getByRole("button", { name: "Open the report" }).click();
        const dialog = page.getByRole("dialog");
        await expect.element(dialog).toBeVisible();
        await page.getByRole("button", { name: "Archive" }).click();
        await expect.poll(openToast).not.toBeNull();
        // Focus is still in the dialog, on the button that showed the toast.
        await expect.element(page.getByRole("button", { name: "Archive" })).toHaveFocus();
        await userEvent.keyboard("{Escape}");
        await expect.element(dialog).not.toBeInTheDocument();
        expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
        expect(openToast()?.textContent).toContain("Report archived");
        await expect.element(screen.getByRole("button", { name: "Open the report" })).toHaveFocus();
      });

      test("with a toast shown from the dialog, onEscapeKeyDown can still keep the dialog open", async () => {
        const onOpenChange = vi.fn();
        const onEscapeKeyDown = vi.fn((event: KeyboardEvent) => event.preventDefault());
        const screen = await render(
          <ToastPage>
            <ReportDialog onOpenChange={onOpenChange} onEscapeKeyDown={onEscapeKeyDown} />
          </ToastPage>,
        );
        await screen.getByRole("button", { name: "Open the report" }).click();
        await page.getByRole("button", { name: "Archive" }).click();
        await expect.poll(openToast).not.toBeNull();
        await userEvent.keyboard("{Escape}");
        expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
        expect(onOpenChange.mock.calls).toEqual([[true]]);
        await expect.element(page.getByRole("dialog")).toBeVisible();
        expect(openToast()).not.toBeNull();
      });
    });

    describe("scrolling", () => {
      test("the body scrolls between the header and the footer, with a hairline while content is beneath them", async () => {
        await render(<LongDialog />);
        const dialog = page.getByRole("dialog").element() as HTMLElement;
        await settled(dialog);
        const header = section(dialog, "header");
        const body = section(dialog, "body");
        const footer = section(dialog, "footer");
        const margin = number("dialog.margin");
        expect(rect(dialog).height).toBeCloseTo(VIEWPORT.height - 2 * margin, 0);
        expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
        const divider = color("dialog.divider");
        const width = number("dialog.border.width");

        await expect.poll(() => computed(footer).borderTopColor).toBe(divider);
        expect(pixels(computed(footer).borderTopWidth)).toBe(width);
        expect(computed(header).borderBottomColor).toBe("rgba(0, 0, 0, 0)");

        body.scrollTop = 200;
        await expect.poll(() => computed(header).borderBottomColor).toBe(divider);
        expect(computed(footer).borderTopColor).toBe(divider);
        const headerTop = rect(header).top;

        body.scrollTop = body.scrollHeight;
        await expect.poll(() => computed(footer).borderTopColor).toBe("rgba(0, 0, 0, 0)");
        expect(computed(header).borderBottomColor).toBe(divider);
        // The header and the footer stayed in place.
        expect(rect(header).top).toBe(headerTop);
        expect(rect(footer).bottom).toBeCloseTo(rect(dialog).bottom - width, 0);
      });

      test("a body that scrolls and holds no control takes focus, so that the keyboard can scroll it", async () => {
        await render(<LongDialog />);
        const dialog = page.getByRole("dialog").element() as HTMLElement;
        const body = section(dialog, "body");
        await expect.poll(() => body.getAttribute("tabindex")).toBe("0");
        await userEvent.tab();
        await userEvent.tab();
        await expect.element(body).toHaveFocus();
        await userEvent.keyboard("{PageDown}");
        await expect.poll(() => body.scrollTop).toBeGreaterThan(0);
      });

      test("in a window too short for the header, the footer, and three lines of body, the whole dialog scrolls", async () => {
        // 1280 by 1024 at 400% zoom.
        await page.viewport(320, 256);
        await render(<LongDialog />);
        const dialog = page.getByRole("dialog").element() as HTMLElement;
        const body = section(dialog, "body");
        await expect.poll(() => dialog.getAttribute("data-scroll")).toBe("whole");
        expect(computed(body).overflowY).toBe("visible");
        expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight);
        // The footer is reached by scrolling the dialog.
        dialog.scrollTop = dialog.scrollHeight;
        const footer = section(dialog, "footer");
        await expect.poll(() => rect(footer).bottom).toBeLessThanOrEqual(rect(dialog).bottom);

        // With room again, only the body scrolls.
        await page.viewport(VIEWPORT.width, VIEWPORT.height);
        await expect.poll(() => dialog.getAttribute("data-scroll")).toBe("body");
        expect(computed(body).overflowY).toBe("auto");
      });
    });

    describe("layout", () => {
      test.each(DIALOG_SIZES)(
        "the %s dialog is as wide as its token and centered",
        async (size) => {
          const { element } = await open(<RenameDialog size={size} />);
          const box = rect(element);
          expect(box.width).toBeCloseTo(number(`dialog.width.${size}`), 0);
          expect(box.left).toBeCloseTo((VIEWPORT.width - box.width) / 2, 0);
          expect(box.top).toBeCloseTo((VIEWPORT.height - box.height) / 2, 0);
        },
      );

      test("on a window 320 pixels wide, a dialog spans the width less a margin, and nothing overflows", async () => {
        await page.viewport(320, 640);
        const { element } = await open(<RenameDialog />);
        const margin = number("dialog.margin");
        expect(rect(element).width).toBeCloseTo(320 - 2 * margin, 0);
        expect(rect(element).left).toBeCloseTo(margin, 0);
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
      });

      test("the footer's buttons sit at the end edge in a row, the primary last, and at the left in right-to-left", async () => {
        for (const dir of ["ltr", "rtl"] as const) {
          onRoot({ dir });
          const { element, screen } = await open(<RenameDialog />);
          const footer = section(element, "footer");
          const cancel = rect(page.getByRole("button", { name: "Cancel" }).element());
          const primary = rect(page.getByRole("button", { name: "Rename file" }).element());
          const inner = rect(footer);
          const padding = number("dialog.padding");
          expect(footer.hasAttribute("data-stacked")).toBe(false);
          expect(cancel.top).toBe(primary.top);
          if (dir === "ltr") {
            expect(primary.right).toBeCloseTo(inner.right - padding, 0);
            expect(cancel.right).toBeCloseTo(primary.left - number("dialog.footer.gap"), 0);
          } else {
            expect(primary.left).toBeCloseTo(inner.left + padding, 0);
            expect(cancel.left).toBeCloseTo(primary.right + number("dialog.footer.gap"), 0);
          }
          await userEvent.keyboard("{Escape}");
          await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
          await screen.unmount();
        }
      });

      test("the footer's buttons stack, the primary first and as wide as the dialog, when they do not fit", async () => {
        const { element } = await open(
          <DeleteAlert
            labels={[
              "Keep this address on my account for now",
              "Delete this address from my account and every order",
            ]}
          />,
          "Delete",
          "alertdialog",
        );
        const footer = section(element, "footer");
        await expect.poll(() => footer.hasAttribute("data-stacked")).toBe(true);
        const cancel = rect(page.getByRole("button", { name: /^Keep/ }).element());
        const action = rect(page.getByRole("button", { name: /^Delete this/ }).element());
        expect(action.bottom).toBeLessThanOrEqual(cancel.top);
        const padding = number("dialog.padding");
        expect(action.width).toBeCloseTo(rect(footer).width - 2 * padding, 0);
        expect(cancel.width).toBeCloseTo(action.width, 0);
      });

      test("at twice the text size, the title wraps, the buttons stack, and nothing is cut off", async () => {
        document.documentElement.style.fontSize = "200%";
        const { element } = await open(<DeleteAlert />, "Delete", "alertdialog");
        const footer = section(element, "footer");
        await expect.poll(() => footer.hasAttribute("data-stacked")).toBe(true);
        const title = page.getByRole("heading").element();
        expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
        expect(rect(title).height).toBeGreaterThan(pixels(computed(title).lineHeight) * 1.5);
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
      });

      test("a bottom sheet touches the bottom edge, at most the medium panel wide and centered", async () => {
        const { element } = await open(<FilterSheet />, "Filters");
        const box = rect(element);
        expect(box.bottom).toBeCloseTo(VIEWPORT.height, 0);
        expect(box.width).toBeCloseTo(number("sheet.max-width.bottom"), 0);
        expect(box.left).toBeCloseTo((VIEWPORT.width - box.width) / 2, 0);
        const style = computed(element);
        expect(pixels(style.borderTopLeftRadius)).toBe(number("dialog.radius"));
        expect(pixels(style.borderBottomLeftRadius)).toBe(0);
        expect(pixels(style.borderBottomWidth)).toBe(0);
      });

      test("an end sheet is as tall as the window at its end edge, the left in right-to-left", async () => {
        for (const dir of ["ltr", "rtl"] as const) {
          onRoot({ dir });
          const { element, screen } = await open(<FilterSheet edge="end" />, "Filters");
          expect(element.getAttribute("data-edge")).toBe("end");
          const box = rect(element);
          expect(box.width).toBeCloseTo(number("sheet.width.end"), 0);
          expect(box.height).toBeCloseTo(VIEWPORT.height, 0);
          if (dir === "ltr") expect(box.right).toBeCloseTo(VIEWPORT.width, 0);
          else expect(box.left).toBeCloseTo(0, 0);
          await userEvent.keyboard("{Escape}");
          await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
          await screen.unmount();
        }
      });

      test("on a window less than twice its width, an end sheet comes from the bottom", async () => {
        await page.viewport(2 * number("sheet.width.end") - 1, 640);
        const { element } = await open(<FilterSheet edge="end" />, "Filters");
        await expect.poll(() => element.getAttribute("data-edge")).toBe("bottom");
        expect(rect(element).bottom).toBeCloseTo(640, 0);
      });
    });

    describe.each(MODES)("in the %s mode", (mode) => {
      test("the scrim, the container, and its text take their tokens", async () => {
        onRoot({ mode });
        const { element } = await open(<RenameDialog />);
        const scrim = document.querySelector('[data-slot="dialog-overlay"]') as Element;
        expect(computed(scrim).backgroundColor).toBe(color("dialog.scrim", mode));
        const style = computed(element);
        expect(style.backgroundColor).toBe(color("dialog.bg", mode));
        expect(style.borderTopColor).toBe(color("dialog.border.color", mode));
        expect(pixels(style.borderTopWidth)).toBe(number("dialog.border.width"));
        expect(pixels(style.borderTopLeftRadius)).toBe(number("dialog.radius"));
        expect(style.boxShadow).toBe(token("dialog.shadow", mode));
        const title = computed(page.getByRole("heading").element());
        expect(title.color).toBe(color("dialog.fg", mode));
        expect(title.fontFamily).toContain(String(token("dialog.title.font-family")));
        expect(pixels(title.fontSize)).toBe(number("dialog.title.font-size"));
        expect(title.fontWeight).toBe(token("dialog.title.font-weight"));
        expect(pixels(title.lineHeight)).toBeCloseTo(number("dialog.title.line-height"), 2);
        const description = computed(page.getByText(PARAGRAPH).element());
        expect(description.color).toBe(color("dialog.fg", mode));
        expect(pixels(description.fontSize)).toBe(number("dialog.description.font-size"));
        expect(pixels(description.lineHeight)).toBeCloseTo(
          number("dialog.description.line-height"),
          2,
        );
      });

      test("has no accessibility violations", async () => {
        onRoot({ mode });
        const rules = {
          runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          rules: {
            "target-size": { enabled: true },
            // High-contrast modes promise 7:1 for text, which is the enhanced criterion.
            "color-contrast-enhanced": { enabled: mode.endsWith("-hc") },
          },
        };
        for (const [ui, trigger, role] of [
          [<RenameDialog key="dialog" closeLabel="Close" footer={false} />, "Rename", "dialog"],
          [<RenameDialog key="footer" />, "Rename", "dialog"],
          [<DeleteAlert key="alert" />, "Delete", "alertdialog"],
          [<FilterSheet key="sheet" edge="end" />, "Filters", "dialog"],
        ] as const) {
          const { element, screen } = await open(ui, trigger, role);
          const results = await axe.run(element, rules as axe.RunOptions);
          expect(
            results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html)}`),
          ).toEqual([]);
          expect(results.passes.map(({ id }) => id)).toContain("color-contrast");
          await userEvent.keyboard("{Escape}");
          await expect.element(page.getByRole(role)).not.toBeInTheDocument();
          await screen.unmount();
        }
      });
    });

    describe.each(DENSITIES)("at %s density", (density) => {
      test("the sections are spaced by the tokens", async () => {
        onRoot({ density });
        const { element } = await open(<RenameDialog />);
        const header = computed(section(element, "header"));
        const body = computed(section(element, "body"));
        const footer = computed(section(element, "footer"));
        const padding = number("dialog.padding", density);
        const half = number("dialog.gap", density) / 2;
        expect(pixels(header.paddingTop)).toBe(padding);
        expect(pixels(header.paddingInlineStart)).toBe(padding);
        expect(pixels(header.paddingBottom)).toBe(half);
        expect(pixels(body.paddingTop)).toBe(half);
        expect(pixels(body.paddingBottom)).toBe(half);
        expect(pixels(footer.paddingTop)).toBe(half);
        expect(pixels(footer.paddingBottom)).toBe(padding);
        expect(pixels(footer.columnGap)).toBe(number("dialog.footer.gap", density));
      });
    });

    describe("motion", () => {
      test("the scrim and a dialog fade in with the enter tokens, and out with the exit tokens", async () => {
        const screen = await render(
          <Page>
            <RenameDialog />
          </Page>,
        );
        await screen.getByRole("button", { name: "Rename" }).click();
        const dialog = page.getByRole("dialog").element();
        const scrim = document.querySelector('[data-slot="dialog-overlay"]') as Element;
        for (const element of [dialog, scrim]) {
          const style = computed(element);
          expect(style.animationName).toBe("rc-dialog-in");
          expect(style.animationDuration).toBe(`${number("dialog.enter.duration")}s`);
          expect(style.animationTimingFunction).toBe(token("dialog.enter.easing"));
        }
        await settled(dialog);
        await userEvent.keyboard("{Escape}");
        const style = computed(dialog);
        expect(style.animationName).toBe("rc-dialog-out");
        expect(style.animationDuration).toBe(`${number("dialog.exit.duration")}s`);
        expect(style.animationTimingFunction).toBe(token("dialog.exit.easing"));
      });

      test("a sheet slides in from its edge", async () => {
        for (const [edge, name] of [
          ["bottom", "rc-sheet-in-bottom"],
          ["end", "rc-sheet-in-end"],
        ] as const) {
          const screen = await render(
            <Page>
              <FilterSheet edge={edge} />
            </Page>,
          );
          await screen.getByRole("button", { name: "Filters" }).click();
          const sheet = page.getByRole("dialog").element();
          expect(computed(sheet).animationName).toBe(name);
          await settled(sheet);
          await userEvent.keyboard("{Escape}");
          await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
          await screen.unmount();
        }
      });

      test("with reduced motion, a sheet fades and nothing moves", async () => {
        await withMedia({ reducedMotion: "reduce" }, async () => {
          const screen = await render(
            <Page>
              <FilterSheet edge="end" />
            </Page>,
          );
          await screen.getByRole("button", { name: "Filters" }).click();
          const sheet = page.getByRole("dialog").element();
          expect(computed(sheet).animationName).toBe("rc-dialog-in");
          await settled(sheet);
          await userEvent.keyboard("{Escape}");
          expect(computed(sheet).animationName).toBe("rc-dialog-out");
        });
      });
    });
  });
}

/** Checked by the type checker; never run. */
export const typeChecks = () => [
  // @ts-expect-error A title needs the level of its heading.
  <DialogTitle key="level">Rename file</DialogTitle>,
  // @ts-expect-error "xl" is not a size in the spec.
  <DialogContent key="size" size="xl" />,
  // @ts-expect-error "start" is not an edge in the spec.
  <SheetContent key="edge" edge="start" />,
  // @ts-expect-error An alert dialog starts on Cancel: it takes no other first focus.
  <AlertDialogContent key="focus" initialFocus={{ current: null }} />,
  // @ts-expect-error An alert dialog has no close button.
  <AlertDialogContent key="close" closeLabel="Close" />,
];
