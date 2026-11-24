import { Button } from "../../src/index.js";
import { BUTTON_EXAMPLES } from "./generated/snapshots.js";
import { describeSnapshots } from "./specimen.js";

describeSnapshots("button", BUTTON_EXAMPLES, (properties, text) => (
  <Button {...properties}>{text("label")}</Button>
));
