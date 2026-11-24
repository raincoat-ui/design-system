// The Toast's page is a Server Component. It renders the ToastProvider, a Client Component, around
// the rest of the page, as an app's layout does: the server sends the region that holds the
// toasts and the status region that announces them, both empty, and React hydrates them.
import { ToastProvider } from "@raincoat-ui/react";
import { ToastScreen } from "../ToastScreen";

export default function ToastPage() {
  return (
    <ToastProvider label="Notifications">
      <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
        <h1 className="m-0 text-(length:--rc-font-size-24) font-(--rc-font-weight-semibold)">
          Toast
        </h1>
        <ToastScreen />
      </main>
    </ToastProvider>
  );
}
