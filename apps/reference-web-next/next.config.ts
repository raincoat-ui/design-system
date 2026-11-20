import type { NextConfig } from "next";

const config: NextConfig = {
  // Types are checked by `pnpm typecheck`, with the TypeScript this repository pins.
  typescript: { ignoreBuildErrors: true },
};

export default config;
