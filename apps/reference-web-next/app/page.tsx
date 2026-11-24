// The page is a Server Component. The Button screen above the forms is a Client Component that
// the server renders and React then hydrates. The forms below are rendered by this Server
// Component alone: their Buttons reach the browser as HTML and are never hydrated, and the forms
// post to Server Actions, so they work with JavaScript off.
import { Button, Input } from "@raincoat-ui/react";
import { saveDraft, sendInvitation } from "./actions";
import { ButtonScreen } from "./ButtonScreen";
import { Column, Row, Section } from "./ui";

type Search = { saved?: string; invited?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const { saved, invited } = await searchParams;

  return (
    <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
      <h1 className="m-0 text-(length:--rc-font-size-24) font-(--rc-font-weight-semibold)">
        Button
      </h1>

      <ButtonScreen />

      <Section title="In a form, from a Server Component">
        <form action={saveDraft}>
          <Column>
            <Input label="Title" name="title" defaultValue="Spring launch" />
            <Row>
              <Button type="submit" variant="primary">
                Save draft
              </Button>
              {/* A Button submits a form only when asked to: this one does not. */}
              <Button variant="secondary">Preview</Button>
            </Row>
          </Column>
        </form>
        <p className="m-0" data-testid="saved">
          {saved ? `Saved: ${saved}` : "Not saved yet"}
        </p>
      </Section>

      {/* A busy Button needs a Client Component. In a Server Component it is never hydrated, so
          it stays disabled, and its form cannot be sent. */}
      <Section title="Busy, from a Server Component">
        <form action={sendInvitation}>
          <Column>
            <Input label="Email" name="email" type="email" defaultValue="ana@example.com" />
            <Button type="submit" variant="primary" loading>
              Send invitation
            </Button>
          </Column>
        </form>
        <p className="m-0" data-testid="invited">
          {invited ? `Invited: ${invited}` : "Nobody invited yet"}
        </p>
      </Section>
    </main>
  );
}
