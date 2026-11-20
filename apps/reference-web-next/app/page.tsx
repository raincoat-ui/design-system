import { Button } from "@raincoat-ui/react";
import type { ReactNode } from "react";
import { record } from "./actions";
import { Loading } from "./Loading";
import { TrashIcon } from "./TrashIcon";

const LONG_LABEL = "Save all of these changes and send the updated version to every reviewer";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-(--rc-space-2)">
      <h2 className="m-0 text-(length:--rc-type-body-sm-font-size) font-(--rc-type-body-sm-font-weight) text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The Button in the states of its spec (specs/components/button/spec.yaml), rendered by a
 * Server Component: the browser receives every button in the page's HTML.
 *
 * A Server Component cannot hand the browser an onClick handler, so the buttons that run an
 * action submit a form to a Server Action instead. That works before React has hydrated the
 * page, and without JavaScript at all. The action's name then shows in the line at the top,
 * which is how the tests see that it ran.
 */
export default async function ButtonPage({
  searchParams,
}: {
  searchParams: Promise<{ last?: string | string[] }>;
}) {
  const { last } = await searchParams;

  return (
    <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
      <h1 className="m-0 text-(length:--rc-font-size-24)">Button</h1>
      <p aria-live="polite" data-testid="last-action" className="m-0">
        Last action: {typeof last === "string" ? last : "Nothing yet"}
      </p>

      <form action={record} className="flex flex-col gap-(--rc-space-6)">
        <Section title="Variants">
          <div className="flex flex-col items-start gap-(--rc-space-3)">
            <Button variant="primary" type="submit" name="action" value="Save changes">
              Save changes
            </Button>
            <Button variant="secondary" type="submit" name="action" value="Cancel">
              Cancel
            </Button>
            <Button variant="ghost" type="submit" name="action" value="Show details">
              Show details
            </Button>
            <Button variant="danger" type="submit" name="action" value="Delete project">
              Delete project
            </Button>
          </div>
        </Section>

        <Section title="Sizes">
          <div className="flex flex-wrap items-center gap-(--rc-space-4)">
            <Button variant="primary" size="sm" type="submit" name="action" value="Small">
              Small
            </Button>
            <Button variant="primary" size="md" type="submit" name="action" value="Medium">
              Medium
            </Button>
            <Button variant="primary" size="lg" type="submit" name="action" value="Large">
              Large
            </Button>
          </div>
        </Section>

        <Section title="Disabled">
          <div className="flex flex-wrap items-center gap-(--rc-space-4)">
            <Button variant="primary" disabled type="submit" name="action" value="Publish">
              Publish
            </Button>
          </div>
        </Section>

        <Section title="Loading, in a Client Component">
          <Loading />
        </Section>

        <Section title="Icon only">
          <div className="flex flex-col items-start">
            <Button
              variant="secondary"
              size="sm"
              aria-label="Delete page"
              leadingIcon={<TrashIcon />}
              type="submit"
              name="action"
              value="Delete page"
            />
          </div>
        </Section>

        <Section title="Full width and a long label">
          <div className="flex flex-col items-start gap-(--rc-space-3)">
            <Button variant="primary" fullWidth type="submit" name="action" value="Continue">
              Continue
            </Button>
            <Button variant="secondary" type="submit" name="action" value="Save all">
              {LONG_LABEL}
            </Button>
          </div>
        </Section>
      </form>

      <Section title="A link that looks like a button">
        <div className="flex">
          <Button asChild variant="ghost">
            <a href="#guide">Read the guide</a>
          </Button>
        </div>
      </Section>
      <p id="guide" className="m-0">
        The guide would start here.
      </p>
    </main>
  );
}
