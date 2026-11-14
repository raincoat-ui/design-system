#!/usr/bin/env node
// Runs a pinned standalone tool: `node tools/ci/run-tool.mjs <tool> [args...]`.
// The binary is downloaded once into .cache/tools, verified against the SHA-256 in
// tool-versions.json, and then executed. A digest mismatch aborts before anything runs.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const versions = JSON.parse(readFileSync(join(here, "tool-versions.json"), "utf8"));

function fail(message) {
  console.error(`run-tool: ${message}`);
  process.exit(2);
}

function findBinary(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findBinary(path, name);
      if (found) return found;
    } else if (entry.name === name) {
      return path;
    }
  }
  return null;
}

async function ensureTool(name) {
  const tool = versions[name];
  if (!tool || typeof tool !== "object") {
    const known = Object.keys(versions).filter((key) => !key.startsWith("$"));
    fail(`unknown tool "${name}". Known tools: ${known.join(", ")}`);
  }
  const platform = `${process.platform}-${process.arch}`;
  const asset = tool.assets[platform];
  if (!asset) fail(`${name} ${tool.version} has no pinned build for ${platform}`);

  const installDir = join(repoRoot, ".cache", "tools", `${name}-${tool.version}-${platform}`);
  const existing = existsSync(installDir) ? findBinary(installDir, tool.binary) : null;
  if (existing) return existing;

  const response = await fetch(asset.url, { redirect: "follow" });
  if (!response.ok) fail(`download of ${asset.url} failed with HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== asset.sha256) {
    fail(`checksum mismatch for ${name} ${tool.version}: expected ${asset.sha256}, got ${digest}`);
  }

  mkdirSync(installDir, { recursive: true });
  if (asset.archive) {
    const archivePath = join(installDir, "download.tar.gz");
    writeFileSync(archivePath, bytes);
    const result = spawnSync("tar", ["-xzf", archivePath, "-C", installDir], { stdio: "inherit" });
    if (result.status !== 0) fail(`could not extract ${archivePath}`);
  } else {
    writeFileSync(join(installDir, tool.binary), bytes);
  }
  const binary = findBinary(installDir, tool.binary);
  if (!binary) fail(`${tool.binary} not found after installing ${name} ${tool.version}`);
  chmodSync(binary, 0o755);
  return binary;
}

const [name, ...args] = process.argv.slice(2);
if (!name) fail("usage: run-tool.mjs <tool> [args...]");
const binary = await ensureTool(name);
const result = spawnSync(binary, args, { stdio: "inherit", cwd: process.cwd() });
if (result.error) fail(`could not start ${name}: ${result.error.message}`);
process.exit(result.status ?? 1);
