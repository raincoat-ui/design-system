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
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Heading,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Text,
} from "@raincoat-ui/react";
import { type FormEvent, useRef, useState } from "react";

export const TERMS =
  "You keep the rights to everything you upload. We store it so that you can reach it from your devices, and share it only with the people you choose. You can delete your account at any time, and everything in it is deleted within thirty days.";

/**
 * The Dialog, the alert dialog, and the Sheet as an app uses them
 * (specs/components/dialog/spec.yaml): a dialog with a short form, which starts in its field; a
 * dialog with content longer than the window; an alert dialog that confirms a deletion; a bottom
 * sheet; and an end sheet. What each did is written under the buttons that open them.
 */
export function DialogScreen() {
  const [name, setName] = useState("Quarterly report");
  const [renaming, setRenaming] = useState(false);
  const [addresses, setAddresses] = useState(1);
  const [status, setStatus] = useState("Nothing yet.");
  const field = useRef<HTMLInputElement>(null);

  const rename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    setName(String(value));
    setStatus(`Renamed to ${value}.`);
    setRenaming(false);
  };

  return (
    <main>
      <Heading level={1}>Files</Heading>
      <Text>{`${name}, shared with 3 people. ${addresses} saved address.`}</Text>

      <section className="row">
        <Dialog open={renaming} onOpenChange={setRenaming}>
          <DialogTrigger asChild>
            <Button>Rename</Button>
          </DialogTrigger>
          <DialogContent initialFocus={field}>
            <DialogHeader>
              <DialogTitle level={2}>Rename file</DialogTitle>
              <DialogDescription>
                Everyone the file is shared with sees the new name.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {/* The form is in the body, and the footer's submit button names it. */}
              <form id="rename-form" onSubmit={rename}>
                <label htmlFor="file-name" className="column">
                  Name
                  <input id="file-name" name="name" ref={field} defaultValue={name} />
                </label>
              </form>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button variant="primary" type="submit" form="rename-form">
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Terms of use</Button>
          </DialogTrigger>
          <DialogContent size="lg" closeLabel="Close">
            <DialogHeader>
              <DialogTitle level={2}>Terms of use</DialogTitle>
            </DialogHeader>
            <DialogBody data-testid="terms">
              {Array.from({ length: 12 }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: the paragraphs never change.
                <Text key={index}>{TERMS}</Text>
              ))}
            </DialogBody>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="danger">Delete address</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle level={2}>Delete this address?</AlertDialogTitle>
              <AlertDialogDescription>
                It is removed from your account. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStatus("Kept the address.")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                destructive
                onClick={() => {
                  setAddresses((count) => Math.max(0, count - 1));
                  setStatus("Deleted the address.");
                }}
              >
                Delete address
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet>
          <SheetTrigger asChild>
            <Button>Share</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle level={2}>Share file</SheetTitle>
              <SheetDescription>People with the link can view the file.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Cancel</Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="primary" onClick={() => setStatus("Copied the link.")}>
                  Copy link
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button>Filters</Button>
          </SheetTrigger>
          <SheetContent edge="end" closeLabel="Close">
            <SheetHeader>
              <SheetTitle level={2}>Filters</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <label className="row">
                <input type="checkbox" defaultChecked /> Shared with me
              </label>
              <label className="row">
                <input type="checkbox" /> Changed in the last 30 days
              </label>
            </SheetBody>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="primary" onClick={() => setStatus("Showed the results.")}>
                  Show results
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </section>

      <Text role="status" data-testid="status">
        {status}
      </Text>
    </main>
  );
}
