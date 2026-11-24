"use client";

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
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Text,
} from "@raincoat-ui/react";
import { useRef, useState } from "react";
import { Field, Row } from "../ui";

/**
 * The Dialog, the alert dialog, and the Sheet in a Client Component
 * (specs/components/dialog/spec.yaml). The server renders the buttons that open them; a dialog
 * renders only in the browser, once it opens. What each did is written in the line below.
 */
export function DialogScreen() {
  const [status, setStatus] = useState("Nothing yet.");
  const field = useRef<HTMLInputElement>(null);
  return (
    <>
      <Row>
        <Dialog>
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
              <Field label="Name" ref={field} defaultValue="Quarterly report" />
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="primary" onClick={() => setStatus("Renamed the file.")}>
                  Rename
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="danger">Delete address</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle level={2}>Delete this address?</AlertDialogTitle>
              <AlertDialogDescription>It is removed from your account.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction destructive onClick={() => setStatus("Deleted the address.")}>
                Delete address
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet>
          <SheetTrigger asChild>
            <Button>Filters</Button>
          </SheetTrigger>
          <SheetContent edge="end" closeLabel="Close">
            <SheetHeader>
              <SheetTitle level={2}>Filters</SheetTitle>
            </SheetHeader>
            <SheetBody>Show files shared with you in the last 30 days.</SheetBody>
          </SheetContent>
        </Sheet>
      </Row>
      <Text role="status" data-testid="status">
        {status}
      </Text>
    </>
  );
}
