import { Button, ToastProvider, useToast } from "@raincoat-ui/react";
import { useState } from "react";

/**
 * The buttons that show toasts. Each kind of toast in the spec has one: without an action, with
 * an action, and two in a row, the second waiting in the queue.
 */
function Actions({ act }: { act: (name: string) => void }) {
  const toast = useToast();
  return (
    <div className="column">
      <Button variant="secondary" onClick={() => toast.show({ message: "Message archived" })}>
        Archive message
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.show({
            message: "Address deleted",
            action: { label: "Undo", onClick: () => act("Undo") },
            closeLabel: "Close",
          })
        }
      >
        Delete address
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          toast.show({ message: "First link copied", closeLabel: "Close" });
          toast.show({ message: "Second link copied", closeLabel: "Close" });
        }}
      >
        Copy two links
      </Button>
    </div>
  );
}

/**
 * The Toast in the states of its spec (specs/components/toast/spec.yaml), shown the way an app
 * shows them: from buttons, inside a ToastProvider. The app keeps a bar at the bottom of the
 * window and tells the provider about it, so the toasts sit above it. An action writes its name
 * in the line at the top, which is how the tests see that it ran.
 */
export function ToastScreen() {
  const [lastAction, setLastAction] = useState("Nothing yet");

  return (
    <ToastProvider label="Notifications" bottomInset="var(--app-bar-height)">
      <main className="with-bar">
        <h1>Toast</h1>
        <p data-testid="last-action">Last action: {lastAction}</p>
        <Actions act={setLastAction} />
        <label className="field">
          Search
          <input type="search" name="search" />
        </label>
      </main>
      <nav className="bottom-bar" aria-label="Sections" data-testid="bottom-bar">
        <a href="/">Button</a>
        <a href="/toast" aria-current="page">
          Toast
        </a>
      </nav>
    </ToastProvider>
  );
}
