import { Button, Input } from "@raincoat-ui/react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

const LONG_LABEL =
  "Where should we send the invoice, if it should go somewhere other than your address";

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

type Values = { name: string; email: string; phone: string; message: string };
type Errors = Partial<Record<keyof Values, string>>;

/** What the form asks of each field: it says what to do, not what went wrong. */
function check(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter an email address, like name@example.com";
  }
  return errors;
}

/**
 * The Input in the states of its spec (specs/components/input/spec.yaml), and a form that checks
 * its fields as RFC 0004 says: when it is submitted, with focus moved to the first field in
 * error, and after that as each field changes. Sending the form writes a line at the top, which
 * is how the tests see that it was sent.
 */
export function InputScreen() {
  const [values, setValues] = useState<Values>({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState("Nothing yet");
  const fields = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null) };
  const errors = submitted ? check(values) : {};

  const field = (name: keyof Values) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
    invalid: errors[name] !== undefined,
    error: errors[name],
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const found = check(values);
    const first = (["name", "email"] as const).find((name) => found[name] !== undefined);
    if (first) {
      fields[first].current?.focus();
    } else {
      setSent(values.name.trim());
    }
  };

  return (
    <main>
      <h1>Input</h1>
      <p aria-live="polite" data-testid="sent">
        Sent: {sent}
      </p>

      <Section title="A form">
        <form noValidate onSubmit={submit} className="fields">
          <Input
            label="Full name"
            autoComplete="name"
            required
            ref={fields.name}
            {...field("name")}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            description="We send the receipt here."
            placeholder="name@example.com"
            required
            ref={fields.email}
            {...field("email")}
          />
          <Input label="Phone (optional)" type="tel" autoComplete="tel" {...field("phone")} />
          <Input label="Message (optional)" multiline {...field("message")} />
          <Button type="submit" variant="primary">
            Send
          </Button>
        </form>
      </Section>

      <Section title="Sizes">
        <div className="fields">
          <Input size="sm" label="Small" defaultValue="Ana Lima" />
          <Input size="md" label="Medium" defaultValue="Ana Lima" />
          <Input size="lg" label="Large" defaultValue="Ana Lima" />
        </div>
      </Section>

      <Section title="Disabled and read-only">
        <div className="fields">
          <Input label="Company" disabled defaultValue="Harbour Supplies" />
          <Input label="Account number" readOnly defaultValue="DE89 3704 0044 0532 0130 00" />
        </div>
      </Section>

      {/* The lines directly above and below the small field show how much room it takes: the
          tests measure the distance between them. */}
      <Section title="A hidden label and an icon">
        <div className="stack">
          <p data-testid="small-above">Above the small field</p>
          <Input
            size="sm"
            type="search"
            label="Search the docs"
            labelHidden
            leadingIcon={<SearchIcon />}
          />
          <p data-testid="small-below">Below the small field</p>
        </div>
      </Section>

      <Section title="A long label">
        <Input label={LONG_LABEL} />
      </Section>
    </main>
  );
}
