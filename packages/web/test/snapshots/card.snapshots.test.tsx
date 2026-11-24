import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardLink,
  CardMedia,
  CardTitle,
  Text,
} from "../../src/index.js";
import { CARD_EXAMPLES, type CardExampleProperties } from "./generated/snapshots.js";
import { describeSnapshots } from "./specimen.js";

// Each instance knows its example, which says whether the card has media and a footer.
type Instance = CardExampleProperties & { example: string };
const examples = CARD_EXAMPLES.map((example) => ({
  ...example,
  instances: example.instances.map((instance) => ({ ...instance, example: example.id })),
}));

/** The media: a picture of hills under a sky, drawn in theme colors, at a fixed aspect ratio. */
function Picture({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 400 120" preserveAspectRatio="none">
      <rect width="400" height="120" style={{ fill: "var(--rc-color-bg-subtle)" }} />
      <path
        d="M0 120 L0 70 Q100 20 200 70 T400 60 L400 120 Z"
        style={{ fill: "var(--rc-color-accent-default)" }}
      />
    </svg>
  );
}

// The title comes first in the document, so that it is read first; the media is drawn above it.
describeSnapshots<Instance>("card", examples, (instance, text) => {
  const withMedia = instance.example === "media-and-footer";
  return (
    <Card>
      <CardTitle level={3}>
        {instance.interactive ? <CardLink href="#card">{text("title")}</CardLink> : text("title")}
      </CardTitle>
      {withMedia && (
        <CardMedia>
          <Picture label={text("media")} />
        </CardMedia>
      )}
      <CardBody>
        <Text color="muted">{text("body")}</Text>
      </CardBody>
      {withMedia && (
        <CardFooter>
          <Button variant="primary">{text("footer")}</Button>
        </CardFooter>
      )}
    </Card>
  );
});
