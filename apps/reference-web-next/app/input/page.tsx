// The Input page is a Server Component. Its form posts to a Server Action, which checks the email
// address and, when it is not one, shows the page again with the field in error: an invalid field
// reached by submitting, with JavaScript off too. The Input is a Client Component, so the server
// renders it and React then hydrates it.
import { Button, Input } from "@raincoat-ui/react";
import { subscribe } from "../actions";
import { Column, Section } from "../ui";

type Search = { invalid?: string; email?: string; subscribed?: string };

/** A magnifying glass, drawn for this app. It is decoration: the field carries the name. */
function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export default async function InputPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { invalid, email = "", subscribed } = await searchParams;

  return (
    <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
      <h1 className="m-0 text-(length:--rc-font-size-24) font-(--rc-font-weight-semibold)">
        Input
      </h1>

      <Section title="In a form, from a Server Component">
        <form action={subscribe} noValidate>
          <Column>
            <Input
              // A new field for each answer from the server, with what was typed.
              key={`${invalid}-${email}`}
              label="Email"
              name="email"
              type="email"
              description="We send the newsletter here."
              placeholder="name@example.com"
              defaultValue={email}
              required
              invalid={invalid === "email"}
              error="Enter an email address, like name@example.com"
            />
            <Button type="submit" variant="primary">
              Subscribe
            </Button>
          </Column>
        </form>
        <p className="m-0" data-testid="subscribed">
          {subscribed ? `Subscribed: ${subscribed}` : "Not subscribed yet"}
        </p>
      </Section>

      <Section title="Every state">
        <Column>
          <Input size="sm" label="Small" defaultValue="Ana Lima" />
          <Input size="lg" label="Large" defaultValue="Ana Lima" />
          <Input label="Company" disabled defaultValue="Harbour Supplies" />
          <Input label="Account number" readOnly defaultValue="DE89 3704 0044 0532 0130 00" />
          <Input
            label="Search the docs"
            labelHidden
            type="search"
            size="sm"
            leadingIcon={<SearchIcon />}
          />
          <Input label="Message" multiline defaultValue="Please leave the parcel next door." />
        </Column>
      </Section>
    </main>
  );
}
