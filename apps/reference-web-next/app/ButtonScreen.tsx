"use client";

import { Button } from "@raincoat-ui/react";
import { useState } from "react";
import { Column, Row, Section } from "./ui";

const LONG_LABEL = "Save all of these changes and send the updated version to every reviewer";

/** A trash can, drawn for this app. It is decoration: the button carries the name. */
function TrashIcon() {
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
      <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

/**
 * The Button in the states of its spec (specs/components/button/spec.yaml), in a Client
 * Component: the server renders it, then React hydrates it. Activating a button writes its name
 * in the line at the top, which is how the tests see that an action ran.
 */
export function ButtonScreen() {
  const [lastAction, setLastAction] = useState("Nothing yet");
  const act = (name: string) => () => setLastAction(name);

  return (
    <>
      <p className="m-0" aria-live="polite" data-testid="last-action">
        Last action: {lastAction}
      </p>

      <Section title="Variants">
        <Column>
          <Button variant="primary" onClick={act("Save changes")}>
            Save changes
          </Button>
          <Button variant="secondary" onClick={act("Cancel")}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={act("Show details")}>
            Show details
          </Button>
          <Button variant="danger" onClick={act("Delete project")}>
            Delete project
          </Button>
        </Column>
      </Section>

      <Section title="Sizes">
        <Row>
          <Button variant="primary" size="sm" onClick={act("Small")}>
            Small
          </Button>
          <Button variant="primary" size="md" onClick={act("Medium")}>
            Medium
          </Button>
          <Button variant="primary" size="lg" onClick={act("Large")}>
            Large
          </Button>
        </Row>
      </Section>

      <Section title="Disabled and loading">
        <Column>
          <Row>
            <Button variant="primary" disabled onClick={act("Publish")}>
              Publish
            </Button>
            <Button variant="primary" loading onClick={act("Send invite")}>
              Send invite
            </Button>
          </Row>
          {/* Disabled wins: this button is not also busy. */}
          <Button variant="secondary" disabled loading onClick={act("Archive")}>
            Archive
          </Button>
        </Column>
      </Section>

      {/* The lines directly above and below the small button show how much room it takes: the
          tests measure the distance between them. */}
      <Section title="Icon only">
        <div className="flex flex-col items-start">
          <p className="m-0" data-testid="small-above">
            Above the small button
          </p>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Delete page"
            leadingIcon={<TrashIcon />}
            onClick={act("Delete page")}
          />
          <p className="m-0" data-testid="small-below">
            Below the small button
          </p>
        </div>
      </Section>

      <Section title="Full width and a long label">
        <Column>
          <Button variant="primary" fullWidth onClick={act("Continue")}>
            Continue
          </Button>
          <Button variant="secondary" onClick={act("Save all")}>
            {LONG_LABEL}
          </Button>
        </Column>
      </Section>

      <Section title="A link that looks like a button">
        <Button asChild variant="ghost">
          <a href="#guide">Read the guide</a>
        </Button>
      </Section>
      <p className="m-0" id="guide">
        The guide would start here.
      </p>
    </>
  );
}
