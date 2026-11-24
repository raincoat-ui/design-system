// An example of the Tabs is a row of tabs: its text gives one line per tab. Each instance is told
// which example it draws, because the examples differ in their content, not their properties.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/index.js";
import { TABS_EXAMPLES, type TabsExampleProperties } from "./generated/snapshots.js";
import { describeSnapshots, type Text } from "./specimen.js";

type Instance = TabsExampleProperties & { example: string };

const examples = TABS_EXAMPLES.map((example) => ({
  ...example,
  instances: example.instances.map((instance) => ({ ...instance, example: example.id })),
}));

/** Simple shapes in the text color, to stand for an app's icons. */
const ICONS = [
  <circle key="circle" cx="12" cy="12" r="8" />,
  <rect key="square" x="4" y="4" width="16" height="16" rx="2" />,
  <path key="triangle" d="M12 4l8 16H4z" />,
];

function Icon({ index }: { index: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      {ICONS[index % ICONS.length]}
    </svg>
  );
}

function draw({ example, activationMode, keepMounted }: Instance, text: Text) {
  const icons = example === "icons" || example === "icon-only";
  const lines = text(example === "icon-only" ? "accessible-name" : "label").split("\n");
  // The overflowing row selects its last tab, so it is drawn scrolled to the end.
  const selected = example === "overflow" ? String(lines.length - 1) : "0";
  return (
    <Tabs defaultValue={selected} activationMode={activationMode} style={{ width: "100%" }}>
      <TabsList aria-label={example}>
        {lines.map((line, index) =>
          example === "icon-only" ? (
            <TabsTrigger
              key={line}
              value={String(index)}
              aria-label={line}
              leadingIcon={<Icon index={index} />}
            />
          ) : (
            <TabsTrigger
              key={line}
              value={String(index)}
              leadingIcon={icons && <Icon index={index} />}
            >
              {line}
            </TabsTrigger>
          ),
        )}
      </TabsList>
      {example === "labels" && (
        <TabsContent
          value="0"
          keepMounted={keepMounted}
          style={{ color: "var(--rc-color-fg-default)", paddingBlock: 16 }}
        >
          {text("panel")}
        </TabsContent>
      )}
    </Tabs>
  );
}

describeSnapshots("tabs", examples, draw);
