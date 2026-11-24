import { Heading, Text } from "../../src/index.js";
import { TYPOGRAPHY_EXAMPLES, type TypographyExampleProperties } from "./generated/snapshots.js";
import { describeSnapshots, type Text as Strings } from "./specimen.js";

// The long heading is drawn twice: composed (NFC), as strings.yaml has it, and decomposed (NFD),
// as some input methods write Vietnamese. The two must look the same, and stacked diacritics on
// its second line must not touch the first.
type Instance = TypographyExampleProperties & { decomposed?: boolean };
const examples = TYPOGRAPHY_EXAMPLES.map((example) =>
  example.id === "long-heading"
    ? {
        ...example,
        instances: example.instances.flatMap((instance) => [
          instance,
          { ...instance, decomposed: true },
        ]),
      }
    : example,
);

/** The text of an instance. In person-name, the name goes where {name} marks it. */
function content(instance: Instance, text: Strings) {
  const value = instance.decomposed ? text("text").normalize("NFD") : text("text");
  const [before, after] = value.split(/\{[^}]*\}/);
  if (after === undefined) return value;
  return (
    <>
      {before}
      {/* A name from a person takes its direction from its first strong character. */}
      <Text as="span" dir="auto">
        {text("name")}
      </Text>
      {after}
    </>
  );
}

describeSnapshots<Instance>("typography", examples, (instance, text) =>
  instance.part === "heading" ? (
    <Heading level={instance.level} variant={instance.variant} color={instance.color}>
      {content(instance, text)}
    </Heading>
  ) : (
    <Text variant={instance.variant} color={instance.color} maxLines={instance.maxLines}>
      {content(instance, text)}
    </Text>
  ),
);
