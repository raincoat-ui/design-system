import { Toast } from "../../src/index.js";
import { TOAST_EXAMPLES } from "./generated/snapshots.js";
import { describeSnapshots } from "./specimen.js";

// The toast itself, standing still: what ToastProvider shows, without the timer or the motion.
describeSnapshots("toast", TOAST_EXAMPLES, ({ action }, text) =>
  action ? (
    <Toast
      message={text("message")}
      action={{ label: text("action-label"), onClick: () => {} }}
      closeLabel={text("close-label")}
    />
  ) : (
    <Toast message={text("message")} />
  ),
);
