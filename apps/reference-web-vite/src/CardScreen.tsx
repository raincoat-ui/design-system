import {
  Button,
  Card,
  CardBody,
  CardButton,
  CardFooter,
  CardLink,
  CardMedia,
  CardTitle,
  Heading,
  Text,
} from "@raincoat-ui/react";
import { useState } from "react";

export const LONG_TITLE = "Your order of three linen shirts and a wool scarf is on its way";

/** A picture to stand for a photo: hills under a sky, in the theme's colors. */
function Picture({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 400 120" preserveAspectRatio="none">
      <rect width="400" height="120" className="picture-sky" />
      <path d="M0 120 L0 70 Q100 20 200 70 T400 60 L400 120 Z" className="picture-hills" />
    </svg>
  );
}

/**
 * The Card in the states of its spec (specs/components/card/spec.yaml), as an orders screen sets
 * cards: a list of interactive cards, links and a button, and static cards that hold links and
 * Buttons. The outline has one level 1 heading and skips no level.
 */
export function CardScreen() {
  const [lastAction, setLastAction] = useState("Nothing yet");

  return (
    <main>
      <Heading level={1}>Orders</Heading>
      <p data-testid="last-action">Last action: {lastAction}</p>

      <section>
        <Heading level={2}>Recent orders</Heading>
        <ul className="card-list" data-testid="orders">
          <li>
            <Card data-testid="order-1042">
              <CardTitle level={3}>
                <CardLink href="#order-1042">Order 1042</CardLink>
              </CardTitle>
              <CardMedia>
                <Picture label="A parcel at a front door" />
              </CardMedia>
              <CardBody>
                <Text color="muted">Delivered on Monday</Text>
              </CardBody>
            </Card>
          </li>
          <li>
            <Card>
              <CardTitle level={3}>
                <CardLink href="#order-1043">{LONG_TITLE}</CardLink>
              </CardTitle>
              <CardBody>
                <Text color="muted">Arrives on Thursday</Text>
              </CardBody>
            </Card>
          </li>
          <li>
            <Card data-testid="return">
              <CardTitle level={3}>
                <CardButton onClick={() => setLastAction("Start a return")}>
                  Start a return
                </CardButton>
              </CardTitle>
              <CardBody>
                <Text color="muted">Within 30 days of delivery</Text>
              </CardBody>
            </Card>
          </li>
        </ul>
      </section>

      <section>
        <Heading level={2}>Your account</Heading>
        <ul className="card-list">
          <li>
            <Card data-testid="storage">
              <CardTitle level={3}>Storage</CardTitle>
              <CardBody>
                <Text color="muted">4.2 GB of 15 GB used</Text>
              </CardBody>
              <CardFooter>
                <Button onClick={() => setLastAction("Manage storage")}>Manage storage</Button>
              </CardFooter>
            </Card>
          </li>
          <li>
            <Card data-testid="album">
              <CardTitle level={3}>
                {/* A static card that needs Buttons: its title is the link. */}
                <a href="#summer-trip" className="title-link">
                  Summer trip
                </a>
              </CardTitle>
              <CardMedia>
                <Picture label="A lake between hills covered in pine trees" />
              </CardMedia>
              <CardBody>
                <Text color="muted">48 photos, shared with 3 people</Text>
              </CardBody>
              <CardFooter>
                <Button variant="ghost" onClick={() => setLastAction("Share")}>
                  Share
                </Button>
                <Button variant="primary" onClick={() => setLastAction("Open album")}>
                  Open album
                </Button>
              </CardFooter>
            </Card>
          </li>
        </ul>
      </section>
    </main>
  );
}
