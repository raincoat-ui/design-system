"use client";

import { Button, useToast } from "@raincoat-ui/react";
import { useState } from "react";
import { Column, Section } from "./ui";

/**
 * The Toast in the states of its spec (specs/components/toast/spec.yaml), in a Client Component
 * inside the ToastProvider that the page, a Server Component, renders. Each button shows one kind
 * of toast: without an action, with an action, and two in a row, the second waiting in the
 * queue. An action writes its name in the line at the top.
 */
export function ToastScreen() {
  const toast = useToast();
  const [lastAction, setLastAction] = useState("Nothing yet");

  return (
    <>
      <p className="m-0" data-testid="last-action">
        Last action: {lastAction}
      </p>
      <Section title="Toasts">
        <Column>
          <Button variant="secondary" onClick={() => toast.show({ message: "Message archived" })}>
            Archive message
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.show({
                message: "Address deleted",
                action: { label: "Undo", onClick: () => setLastAction("Undo") },
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
        </Column>
      </Section>
    </>
  );
}
