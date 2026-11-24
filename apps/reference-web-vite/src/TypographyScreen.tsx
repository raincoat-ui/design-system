import { HEADING_LEVELS, Heading, TEXT_VARIANTS, Text } from "@raincoat-ui/react";

export const PARAGRAPH =
  "Your files are kept on this device and in the cloud. Changes made on one device reach the others the next time they connect, usually within a minute.";
export const LONG_HEADING = "Notifications for comments, mentions, and changes to shared documents";
// An Arabic name, as a person would write it.
export const NAME = "مريم الحسيني";

/**
 * Text and Heading in the states of their spec (specs/components/typography/spec.yaml), as a
 * settings screen sets them: a title, sections, running text, and short facts. The outline has
 * one level 1 heading and skips no level.
 */
export function TypographyScreen() {
  return (
    <main>
      <Heading level={1}>Settings</Heading>
      <Text variant="body-lg">
        Choose how this app keeps your files, and what it tells you about them.
      </Text>

      <section>
        <Heading level={2}>Text styles</Heading>
        {TEXT_VARIANTS.map((variant) => (
          <Text key={variant} variant={variant} data-testid={`text-${variant}`}>
            {`Synced 2 minutes ago, in ${variant}`}
          </Text>
        ))}
      </section>

      <section>
        <Heading level={2}>Colors</Heading>
        <Text>Your files are up to date.</Text>
        <Text color="muted">Last checked at 9:41.</Text>
        <Text color="danger">This file could not be opened.</Text>
      </section>

      <section>
        <Heading level={2}>Headings</Heading>
        {HEADING_LEVELS.filter((level) => level > 2).map((level) => (
          <Heading key={level} level={level}>{`Level ${level}`}</Heading>
        ))}
        <Heading level={3} variant="heading-sm">
          Recent files
        </Heading>
        <Heading level={3} color="muted">
          Shared with you
        </Heading>
      </section>

      <section>
        <Heading level={2}>Long text</Heading>
        <Heading level={3}>{LONG_HEADING}</Heading>
        <Text maxLines={2} data-testid="max-lines">
          {PARAGRAPH}
        </Text>
        <Text>
          Message from{" "}
          <Text as="span" dir="auto" data-testid="name">
            {NAME}
          </Text>
          , 2 minutes ago
        </Text>
      </section>

      <section>
        <Heading level={2}>A label</Heading>
        <Text as="label" htmlFor="device-name" variant="label-md">
          Device name
        </Text>
        <input id="device-name" defaultValue="Ana's laptop" />
      </section>
    </main>
  );
}
