#!/usr/bin/env node
// Copies the base token source into base/, so that the published package can build a theme
// kept outside this repository on exactly the base it was released with:
//
//   base/tokens/                    the token source, and the base theme's theme.json
//   base/schemas/                   the schemas of token files, theme.json, and theme overrides
//   base/gradle/libs.versions.toml  the Kotlin version a theme pack's Android modules build with
//
// base/ is git-ignored. Inside the repository, the command line reads the repository itself.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "../..");
const base = join(packageRoot, "base");

rmSync(base, { recursive: true, force: true });
mkdirSync(join(base, "schemas"), { recursive: true });
cpSync(join(repoRoot, "tokens"), join(base, "tokens"), { recursive: true });
for (const schema of ["tokens.schema.json", "theme.schema.json", "theme-tokens.schema.json"]) {
  cpSync(join(repoRoot, "schemas", schema), join(base, "schemas", schema));
}
mkdirSync(join(base, "gradle"));
cpSync(join(repoRoot, "gradle/libs.versions.toml"), join(base, "gradle/libs.versions.toml"));
console.log(`Bundled the base token source into ${base}.`);
