import "vitest";

declare module "vitest" {
  interface ProvidedContext {
    /** Expected token values by "mode/density", then by token id. See expected-tokens.js. */
    tokens: Record<string, Record<string, string | number>>;
  }
}
