// Runs before each component test file outside the touch projects (vitest.config.ts). Every
// such file starts with a mouse, as a desktop browser has one. In Chromium a page in which a
// touch screen was turned on has none, for good, and the hover tests would fail without saying
// why; this says why, before the first test.
import { beforeAll } from "vitest";

beforeAll(() => {
  if (!matchMedia("(hover: hover)").matches || matchMedia("(pointer: coarse)").matches) {
    throw new Error(
      "This page has no mouse: a touch screen was turned on in it. Put tests that turn on a touch screen in *.touch.test.tsx files, which run in the touch projects, after every other test.",
    );
  }
});
