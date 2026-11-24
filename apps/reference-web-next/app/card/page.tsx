// The Card in a Server Component. A static card and a link card hold no state, so they reach the
// browser as HTML that needs none of their JavaScript, and work with JavaScript off. The card that
// is a button is a Client Component, which this page renders and React then hydrates.
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardLink,
  CardMedia,
  CardTitle,
  Heading,
  Text,
} from "@raincoat-ui/react";
import { ReturnCard } from "./ReturnCard";

const LONG_TITLE = "Your order of three linen shirts and a wool scarf is on its way";

/** A picture to stand for a photo: hills under a sky, in the theme's colors. */
function Picture({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 400 120" preserveAspectRatio="none">
      <rect width="400" height="120" className="fill-(--rc-color-bg-subtle)" />
      <path
        d="M0 120 L0 70 Q100 20 200 70 T400 60 L400 120 Z"
        className="fill-(--rc-color-accent-default)"
      />
    </svg>
  );
}

/** A list of cards, as wide a column as fits. */
const LIST =
  "m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,var(--rc-size-panel-sm)),1fr))] gap-(--rc-space-4) p-0 *:flex";

/**
 * The Card in the states of its spec (specs/components/card/spec.yaml), as an orders page sets
 * cards. The outline has one level 1 heading and skips no level.
 */
export default function CardPage() {
  return (
    <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
      <Heading level={1}>Orders</Heading>

      <section className="flex flex-col gap-(--rc-space-3)">
        <Heading level={2}>Recent orders</Heading>
        <ul className={LIST} data-testid="orders">
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
            <ReturnCard />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-(--rc-space-3)">
        <Heading level={2}>Your account</Heading>
        <ul className={LIST}>
          <li>
            <Card>
              <CardTitle level={3}>
                {/* A static card that needs a Button: its title is the link. */}
                <a href="#summer-trip" className="text-inherit">
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
                <Button asChild variant="primary">
                  <a href="#album">Open album</a>
                </Button>
              </CardFooter>
            </Card>
          </li>
        </ul>
      </section>
    </main>
  );
}
