import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      onwarn(warning, warn) {
        // Radix marks its modules "use client" for React Server Components. A single-page app
        // has none, so the bundler dropping the directive changes nothing, and the warning it
        // prints for each Radix module would hide the warnings that matter.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes("use client")) {
          return;
        }
        warn(warning);
      },
    },
  },
});
