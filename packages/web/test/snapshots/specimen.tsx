// The visual snapshots of a component: each snapshot of specs/snapshots.yaml, drawn in the theme
// this Vitest project loads. A snapshot shows every example of the component's spec together,
// as a specimen, in the snapshot's color mode, direction, language, and text size. The examples
// and their text in each locale are generated from the spec and its strings.yaml.
//
// To add a component, write <component>.snapshots.test.tsx beside this file: it passes the
// generated examples to describeSnapshots, with a function that draws one instance of them.
//
// In CI each snapshot is compared with its baseline, __screenshots__/<theme>/<component>/
// <snapshot>.png. A missing or different baseline fails the test, and what was drawn is written
// to test-results/snapshots/actual/, which CI uploads. Anywhere else nothing is compared and no
// baseline is ever written: the images go to test-results/snapshots/local/, to look at.
// Baselines are recorded in CI only; CONTRIBUTING.md says how to accept them.
import "../browser/tailwind-app.css";
import { Fragment, type ReactNode } from "react";
import { afterEach, describe, expect, inject, test } from "vitest";
import { render } from "vitest-browser-react";
import { SNAPSHOTS, type Snapshot, type SpecExample } from "./generated/snapshots.js";

const theme = inject("theme");
const compare = inject("compareSnapshots");

/** The text an example shows, by the content it fills: text("label"). */
export type Text = (content: string) => string;
type Draw<Properties> = (instance: Properties, text: Text) => ReactNode;

/** A fixed width, so that long text wraps the same way in every run. */
const WIDTH = 480;
const PADDING = 24;
const GAP = 16;

function Specimen<Properties>({
  snapshot,
  examples,
  draw,
}: {
  snapshot: Snapshot;
  examples: readonly SpecExample<Properties>[];
  draw: Draw<Properties>;
}) {
  return (
    <div
      data-testid="specimen"
      data-theme={snapshot.mode}
      dir={snapshot.direction}
      lang={snapshot.locale}
      style={{
        background: "var(--rc-color-bg-canvas)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: GAP,
        padding: PADDING,
        width: WIDTH,
      }}
    >
      {examples.map((example) => {
        const text: Text = (content) => {
          const value = example.text[snapshot.locale]?.[content];
          if (value === undefined) {
            throw new Error(`${example.id}: no ${content} in ${snapshot.locale}`);
          }
          return value;
        };
        return (
          <div
            key={example.id}
            data-example={example.id}
            style={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: GAP }}
          >
            {example.instances.map((instance) => (
              <Fragment key={JSON.stringify(instance)}>{draw(instance, text)}</Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Draws every snapshot of the matrix for one component, and compares it with its baseline. */
export function describeSnapshots<Properties>(
  component: string,
  examples: readonly SpecExample<Properties>[],
  draw: Draw<Properties>,
) {
  describe(`${component} snapshots`, () => {
    afterEach(() => {
      document.documentElement.style.fontSize = "";
    });

    test.each(SNAPSHOTS)("$id: $description", async (snapshot) => {
      // The largest text size is a larger root font size, as a browser's text size setting sets.
      document.documentElement.style.fontSize = snapshot.textSize.rootFontSize;
      const screen = await render(<Specimen snapshot={snapshot} examples={examples} draw={draw} />);
      await document.fonts.ready;
      const specimen = screen.getByTestId("specimen");
      // A screenshot shows nothing below the viewport, so a specimen must fit in it.
      expect(specimen.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight);
      const name = `${theme}/${component}/${snapshot.id}`;
      if (compare) {
        await expect.element(specimen).toMatchScreenshot(name);
      } else {
        await specimen.screenshot({
          path: `../../test-results/snapshots/local/${name}.png`,
          animations: "disabled",
          caret: "hide",
        });
      }
    });
  });
}
