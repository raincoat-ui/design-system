import "vitest";
import "vitest/browser";

declare module "vitest" {
  interface ProvidedContext {
    /** Expected token values by "mode/density", then by token id. See expected-tokens.js. */
    tokens: Record<string, Record<string, string | number>>;
    /** The id of the theme this project tests. */
    theme: string;
    /** Whether snapshots are compared with their baselines (in CI), or only saved. */
    compareSnapshots: boolean;
  }
}

// The commands vitest.config.ts defines, which Playwright runs outside the page.
declare module "vitest/browser" {
  interface BrowserCommands {
    /** Moves the pointer to the top left corner of the page, off every component. */
    movePointerAway: () => Promise<void>;
    /** Emulates a system setting, such as reduced motion. A null value stops emulating it. */
    emulateMedia: (media: {
      colorScheme?: "light" | "dark" | null;
      reducedMotion?: "reduce" | "no-preference" | null;
    }) => Promise<void>;
  }
}
