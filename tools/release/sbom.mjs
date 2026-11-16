#!/usr/bin/env node
// Writes the bill of materials of a release as CycloneDX 1.6 JSON:
//
//   node tools/release/sbom.mjs <out-file>
//
// It lists what ships to the people who install Raincoat: the published packages and every
// dependency that comes with them. Development tools are not in it.
//
// The dependency lists come from the two license gates, so the bill of materials and the
// gates cannot disagree: pnpm's license report for npm, and the reports that
// `./gradlew licensee` writes for the Android modules. The Swift package has no dependencies.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { flattenReport } from "../license-gate/lib.mjs";
import {
  MAVEN_ARTIFACTS,
  MAVEN_GROUP,
  NPM_PACKAGES,
  readJson,
  releaseVersion,
  repoRoot,
} from "./lib.mjs";

const npmPurl = (name, version) => `pkg:npm/${name.replace("@", "%40")}@${version}`;
const mavenPurl = (group, artifact, version) => `pkg:maven/${group}/${artifact}@${version}`;
const licenses = (ids) => ids.map((id) => ({ license: { id } }));

/** The npm dependencies that ship with the published packages. */
export function npmComponents(rows) {
  return rows.map(({ name, version, license }) => ({
    type: "library",
    name,
    version,
    purl: npmPurl(name, version),
    "bom-ref": npmPurl(name, version),
    // pnpm reports an SPDX expression, which may join several licenses.
    licenses: [{ expression: license }],
  }));
}

/** The Maven dependencies that ship with the Android modules, from licensee's reports. */
export function mavenComponents(reports) {
  const seen = new Map();
  for (const artifact of reports.flat()) {
    const purl = mavenPurl(artifact.groupId, artifact.artifactId, artifact.version);
    seen.set(purl, {
      type: "library",
      group: artifact.groupId,
      name: artifact.artifactId,
      version: artifact.version,
      purl,
      "bom-ref": purl,
      licenses: licenses((artifact.spdxLicenses ?? []).map(({ identifier }) => identifier)),
    });
  }
  return [...seen.values()];
}

/** The CycloneDX document. `serialNumber` is derived from the content, so a rebuild is identical. */
export function bom({ version, timestamp, published, dependencies }) {
  const components = [...published, ...dependencies].sort((a, b) => a.purl.localeCompare(b.purl));
  const digest = createHash("sha256")
    .update(JSON.stringify([version, components]))
    .digest("hex");
  const uuid = [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:${uuid}`,
    version: 1,
    metadata: {
      timestamp,
      component: {
        type: "framework",
        name: "raincoat-design-system",
        version,
        "bom-ref": `raincoat-design-system@${version}`,
        licenses: licenses(["Apache-2.0"]),
        externalReferences: [{ type: "vcs", url: "https://github.com/raincoat-ui/design-system" }],
      },
    },
    components,
  };
}

function shippedNpmRows() {
  const filters = NPM_PACKAGES.flatMap((dir) => ["--filter", readJson(`${dir}/package.json`).name]);
  const result = spawnSync("pnpm", [...filters, "licenses", "list", "--json", "--prod"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`pnpm licenses list failed:\n${result.stderr}`);
  return flattenReport(JSON.parse(result.stdout));
}

function licenseeReports() {
  return MAVEN_ARTIFACTS.map((module) => {
    const base = join(repoRoot, "packages/android", module, "build/reports/licensee");
    // An Android library has a report per variant; a plain Kotlin module has one.
    const file = [join(base, "androidRelease/artifacts.json"), join(base, "artifacts.json")].find(
      existsSync,
    );
    if (!file) throw new Error(`no licensee report for ${module}. Run ./gradlew licensee first.`);
    return JSON.parse(readFileSync(file, "utf8"));
  });
}

/** The time of the commit being released, so that the file does not change between builds. */
function commitTimestamp() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch) return new Date(Number(epoch) * 1000).toISOString();
  const result = spawnSync("git", ["log", "-1", "--format=%cI"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const committed = new Date(result.stdout.trim());
  // Outside a git checkout there is no commit to take the time from.
  return (Number.isNaN(committed.getTime()) ? new Date() : committed).toISOString();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) {
    console.error("usage: sbom.mjs <out-file>");
    process.exit(2);
  }
  const version = releaseVersion();
  const published = [
    ...NPM_PACKAGES.map((dir) => {
      const { name } = readJson(`${dir}/package.json`);
      return {
        type: "library",
        name,
        version,
        purl: npmPurl(name, version),
        "bom-ref": npmPurl(name, version),
        licenses: licenses(["Apache-2.0"]),
      };
    }),
    ...MAVEN_ARTIFACTS.map((artifact) => {
      const purl = mavenPurl(MAVEN_GROUP, artifact, version);
      return {
        type: "library",
        group: MAVEN_GROUP,
        name: artifact,
        version,
        purl,
        "bom-ref": purl,
        licenses: licenses(["Apache-2.0"]),
      };
    }),
    {
      type: "library",
      name: "Raincoat (Swift package)",
      version,
      purl: `pkg:swift/github.com/raincoat-ui/design-system-swift@${version}`,
      "bom-ref": `pkg:swift/github.com/raincoat-ui/design-system-swift@${version}`,
      licenses: licenses(["Apache-2.0"]),
    },
  ];
  const dependencies = [...npmComponents(shippedNpmRows()), ...mavenComponents(licenseeReports())];
  const document = bom({ version, timestamp: commitTimestamp(), published, dependencies });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`);
  console.log(
    `${out}: ${published.length} published packages, ${dependencies.length} dependencies that ship with them.`,
  );
}
