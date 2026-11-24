import { Input } from "../../src/index.js";
import { INPUT_EXAMPLES } from "./generated/snapshots.js";
import { describeSnapshots, type Text } from "./specimen.js";

/** Content that only some examples have, such as a description: undefined where it has none. */
const optional = (text: Text, content: string) => {
  try {
    return text(content);
  } catch {
    return undefined;
  }
};

describeSnapshots("input", INPUT_EXAMPLES, ({ multiline, type, ...properties }, text) => {
  const content = {
    ...properties,
    label: text("label"),
    description: optional(text, "description"),
    error: optional(text, "error"),
    placeholder: optional(text, "placeholder"),
    defaultValue: optional(text, "value"),
  };
  return multiline ? <Input {...content} multiline /> : <Input {...content} type={type} />;
});
