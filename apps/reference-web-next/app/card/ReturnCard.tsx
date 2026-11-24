"use client";

import { Card, CardBody, CardButton, CardTitle, Text } from "@raincoat-ui/react";
import { useState } from "react";

/**
 * A card that is a button. Its click handler is a function, which a Server Component cannot give
 * an element, so it is a Client Component, as any button with an action is.
 */
export function ReturnCard() {
  const [started, setStarted] = useState(0);
  return (
    <Card data-testid="return">
      <CardTitle level={3}>
        <CardButton onClick={() => setStarted((count) => count + 1)}>Start a return</CardButton>
      </CardTitle>
      <CardBody>
        <Text color="muted" data-testid="returns">
          {started === 0 ? "Within 30 days of delivery" : `Returns started: ${started}`}
        </Text>
      </CardBody>
    </Card>
  );
}
