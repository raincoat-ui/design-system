#!/usr/bin/env node
// Writes the tree of the Swift mirror repository, raincoat-ui/design-system-swift:
//
//   node tools/release/swift-mirror.mjs <out-dir>
//
// SwiftPM needs Package.swift at the root of a repository, so the Swift package is mirrored
// to a repository of its own. The mirror is exactly this tree; nothing there is edited by hand.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { repoRoot } from "./lib.mjs";

/** What the mirror holds, as [path in this repository, path in the mirror]. */
export const MIRRORED = [
  ["packages/ios/Package.swift", "Package.swift"],
  ["packages/ios/Sources", "Sources"],
  ["packages/ios/Tests", "Tests"],
  ["packages/ios/README.md", "README.md"],
  ["packages/ios/CHANGELOG.md", "CHANGELOG.md"],
  ["LICENSE", "LICENSE"],
];

const NOTICE = `Raincoat for SwiftUI
Copyright 2026 The Raincoat authors

This repository is a mirror. It is generated from
https://github.com/raincoat-ui/design-system, where issues and pull requests belong.
`;

export function writeMirror(out, root = repoRoot) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const [from, to] of MIRRORED) {
    // The changelog does not exist before the first versioned release.
    if (!existsSync(join(root, from)) && to === "CHANGELOG.md") continue;
    cpSync(join(root, from), join(out, to), { recursive: true });
  }
  writeFileSync(join(out, "NOTICE"), NOTICE);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) {
    console.error("usage: swift-mirror.mjs <out-dir>");
    process.exit(2);
  }
  writeMirror(resolve(out));
  console.log(`Swift mirror tree written to ${out}`);
}
