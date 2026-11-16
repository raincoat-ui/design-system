#!/usr/bin/env node
// Writes the notes of a GitHub release to standard output:
//
//   node tools/release/notes.mjs [--npm-pending "<names>"] [--swift-pending]
//
// The changes come from the changelogs that Changesets writes. Because every package has the
// same version, their entries are merged, and an entry that appears in several is shown once.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isPrerelease, MAVEN_GROUP, releaseVersion, repoRoot, VERSIONED } from "./lib.mjs";

/** The entries of one version in a changelog written by Changesets, as paragraphs of text. */
export function entries(changelog, version) {
  const start = changelog.split("\n").findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return [];
  const lines = changelog.split("\n").slice(start + 1);
  const end = lines.findIndex((line) => line.startsWith("## "));
  const section = (end === -1 ? lines : lines.slice(0, end)).join("\n");
  return (
    section
      .split(/\n(?=- )/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.startsWith("- "))
      // Drop the commit hash Changesets puts first, and join wrapped lines.
      .map((entry) => entry.replace(/^- (?:[0-9a-f]{7,}: )?/, "").replaceAll(/\s*\n\s*/g, " "))
  );
}

export function notes({ version, changes, npmPending = [], swiftPending = false }) {
  const lines = [];
  if (isPrerelease(version)) {
    lines.push("> This is a prerelease. Anything in it may change before 1.0.", "");
  }
  lines.push(
    "## Changes",
    "",
    ...(changes.length > 0 ? changes.map((change) => `- ${change}`) : ["- No recorded changes."]),
    "",
  );
  lines.push(
    "## Install",
    "",
    "**React**",
    "",
    "```sh",
    `npm install @raincoat-ui/react@${version} @raincoat-ui/theme-base@${version}`,
    "```",
    "",
  );
  if (npmPending.length > 0) {
    lines.push(
      `_Not on npm yet: ${npmPending.join(", ")}. The first publish of a new package name is a manual step._`,
      "",
    );
  }
  lines.push(
    "**Android**",
    "",
    "```kotlin",
    "// settings.gradle.kts, in dependencyResolutionManagement { repositories { … } }",
    'maven { url = uri("https://raincoat-ui.github.io/design-system/maven") }',
    "",
    "// build.gradle.kts",
    `implementation("${MAVEN_GROUP}:ui:${version}")`,
    "```",
    "",
    "**iOS**",
    "",
    "```swift",
    `.package(url: "https://github.com/raincoat-ui/design-system-swift", exact: "${version}")`,
    "```",
    "",
  );
  if (swiftPending) {
    lines.push(
      "_Not in the Swift mirror yet. It follows when the mirror's credential is in place._",
      "",
    );
  }
  lines.push(
    "## Verify",
    "",
    "Every file attached here, and every published artifact, has a provenance attestation:",
    "",
    "```sh",
    "gh attestation verify <file> --repo raincoat-ui/design-system",
    "```",
    "",
    `\`raincoat-${version}.cdx.json\` is the bill of materials: every dependency that ships with the packages, with its license.`,
  );
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = releaseVersion();
  const pendingAt = process.argv.indexOf("--npm-pending");
  const npmPending =
    pendingAt === -1 ? [] : (process.argv[pendingAt + 1] ?? "").split(/\s+/).filter(Boolean);
  const changes = [];
  for (const dir of VERSIONED) {
    const file = join(repoRoot, dir, "CHANGELOG.md");
    if (!existsSync(file)) continue;
    for (const entry of entries(readFileSync(file, "utf8"), version)) {
      if (!changes.includes(entry)) changes.push(entry);
    }
  }
  const swiftPending = process.argv.includes("--swift-pending");
  process.stdout.write(notes({ version, changes, npmPending, swiftPending }));
}
