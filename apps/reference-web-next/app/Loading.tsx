"use client";

import { Button } from "@raincoat-ui/react";
import { useEffect, useState } from "react";

/**
 * The buttons that need a Client Component: a busy button refuses activation with an event
 * handler, which a Server Component cannot pass to the browser. The server still renders them
 * into the page's HTML; React then hydrates them. They submit the page's form like the others,
 * so the tests can see that a busy one does not.
 *
 * `data-hydrated` is set once React runs here, which is how the tests know the page is live.
 */
export function Loading() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <div className="flex flex-col items-start gap-(--rc-space-3)" data-hydrated={hydrated}>
      <Button variant="primary" loading type="submit" name="action" value="Send invite">
        Send invite
      </Button>
      {/* Disabled wins: this button is not also busy. */}
      <Button variant="secondary" disabled loading type="submit" name="action" value="Archive">
        Archive
      </Button>
    </div>
  );
}
