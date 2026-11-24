// Each dialog, alert dialog, and sheet is drawn in the specimen, not over the page: it is rendered
// into a box of its own, which stands for the window, with its scrim filling the box. The box is
// the containing block of what the dialog positions against the window, and the dialog is laid
// out in the box's flow, so that the box is as tall as the dialog and the specimen shows all of
// it. Nothing takes focus, so no focus ring is drawn.
import { type ReactNode, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../src/index.js";
import { DIALOG_EXAMPLES, type DialogPartExampleProperties } from "./generated/snapshots.js";
import { describeSnapshots, type Text } from "./specimen.js";

/** No focus moves into a dialog that is only drawn. */
const stayPut = (event: Event) => event.preventDefault();

/**
 * A box that stands for the window: the dialog is rendered into it, and laid out in its flow.
 * A centered dialog keeps the margin above and below it; a sheet touches the box's edges.
 */
function Window({
  sheet = false,
  children,
}: {
  sheet?: boolean;
  children: (box: HTMLElement) => ReactNode;
}) {
  const [box, setBox] = useState<HTMLElement | null>(null);
  return (
    <div
      ref={setBox}
      style={{
        boxSizing: "border-box",
        contain: "layout",
        paddingBlock: sheet ? "var(--rc-dialog-margin) 0" : "var(--rc-dialog-margin)",
        width: "100%",
      }}
    >
      {box && children(box)}
    </div>
  );
}

/** The footer's buttons, from the text of the example. */
function Footer({ text, kind }: { text: Text; kind: "dialog" | "sheet" }) {
  const Section = kind === "sheet" ? SheetFooter : DialogFooter;
  return (
    <Section>
      {kind === "dialog" && <Button>{text("cancel-label")}</Button>}
      <Button variant="primary">{text("action-label")}</Button>
    </Section>
  );
}

function draw(instance: DialogPartExampleProperties, text: Text, example: string) {
  if (instance.part === "alert-dialog") {
    return (
      <Window>
        {(box) => (
          <AlertDialog open>
            <AlertDialogContent container={box} className="relative" onOpenAutoFocus={stayPut}>
              <AlertDialogHeader>
                <AlertDialogTitle level={2}>{text("title")}</AlertDialogTitle>
                <AlertDialogDescription>{text("description")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{text("cancel-label")}</AlertDialogCancel>
                <AlertDialogAction destructive={instance.destructive}>
                  {text("action-label")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Window>
    );
  }
  if (instance.part === "sheet") {
    return (
      <Window sheet>
        {(box) => (
          <Sheet open>
            <SheetContent
              edge={instance.edge}
              container={box}
              className="relative"
              closeLabel={text("close-label")}
              onOpenAutoFocus={stayPut}
            >
              <SheetHeader>
                <SheetTitle level={2}>{text("title")}</SheetTitle>
              </SheetHeader>
              <SheetBody>{text("body")}</SheetBody>
              <Footer text={text} kind="sheet" />
            </SheetContent>
          </Sheet>
        )}
      </Window>
    );
  }
  // The close-button example has a body and a close button and no footer; the others have a
  // footer.
  const informs = example === "close-button";
  return (
    <Window>
      {(box) => (
        <Dialog open>
          <DialogContent
            size={instance.size}
            container={box}
            className="relative"
            closeLabel={informs ? text("close-label") : undefined}
            onOpenAutoFocus={stayPut}
          >
            <DialogHeader>
              <DialogTitle level={2}>{text("title")}</DialogTitle>
              {example === "dialog" && <DialogDescription>{text("description")}</DialogDescription>}
            </DialogHeader>
            {informs && <DialogBody>{text("body")}</DialogBody>}
            {!informs && <Footer text={text} kind="dialog" />}
          </DialogContent>
        </Dialog>
      )}
    </Window>
  );
}

// Each instance is told which example it belongs to, since the examples of a part differ in
// what they show.
type Instance = DialogPartExampleProperties & { example: string };
const examples = DIALOG_EXAMPLES.map((example) => ({
  ...example,
  instances: example.instances.map((instance) => ({ ...instance, example: example.id })),
}));

describeSnapshots<Instance>("dialog", examples, (instance, text) =>
  draw(instance, text, instance.example),
);
