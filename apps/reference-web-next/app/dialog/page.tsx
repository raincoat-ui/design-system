// The Dialog, the alert dialog, and the Sheet, from a Server Component page. The buttons that
// open them reach the browser as HTML; the dialogs need React in the browser, since they open on
// the person's action.
import { Heading } from "@raincoat-ui/react";
import { DialogScreen } from "./DialogScreen";

export default function DialogPage() {
  return (
    <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
      <Heading level={1}>Files</Heading>
      <DialogScreen />
    </main>
  );
}
