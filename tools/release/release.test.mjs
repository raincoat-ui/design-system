import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import {
  compareVersions,
  gradleVersion,
  isPrerelease,
  NPM_PACKAGES,
  readJson,
  releaseVersion,
  repoRoot,
  shippedChangesSince,
  VERSIONED,
} from "./lib.mjs";
import { add, artifacts, metadata } from "./maven-repo.mjs";
import { entries, notes } from "./notes.mjs";
import { promisedFiles, tarballProblems } from "./pack-npm.mjs";
import { bom, mavenComponents, npmComponents } from "./sbom.mjs";
import { writeMirror } from "./swift-mirror.mjs";
import {
  androidProperties,
  isVersion,
  projectWithMirror,
  WEB_APPS,
  webPackages,
} from "./use-published.mjs";

const scratch = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "raincoat-release-"));
  scratch.push(dir);
  return dir;
};
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const git = (cwd, ...args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
};

// Versions

test("versions sort as semantic versions, with a prerelease before its release", () => {
  const sorted = [
    "1.0.0",
    "0.1.0-next.10",
    "0.1.0",
    "0.1.0-next.2",
    "0.2.0-next.0",
    "0.1.0-next.0",
    "0.10.0",
    "0.9.1",
  ];
  assert.deepEqual(sorted.sort(compareVersions), [
    "0.1.0-next.0",
    "0.1.0-next.2",
    "0.1.0-next.10",
    "0.1.0",
    "0.2.0-next.0",
    "0.9.1",
    "0.10.0",
    "1.0.0",
  ]);
  assert.equal(isPrerelease("0.1.0-next.0"), true);
  assert.equal(isPrerelease("0.1.0"), false);
});

// A formatter once took the one-line frontmatter of a changeset for a heading and rewrote it,
// and the changeset tool could then not read the file.
test("every changeset, waiting or already in a prerelease, has its frontmatter", () => {
  const directories = [".changeset", ".changeset/pre"].filter((dir) =>
    existsSync(join(repoRoot, dir)),
  );
  const files = directories.flatMap((dir) =>
    readdirSync(join(repoRoot, dir))
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .map((name) => join(dir, name)),
  );
  for (const file of files) {
    const text = readFileSync(join(repoRoot, file), "utf8");
    assert.match(
      text,
      /^---\n("@raincoat-ui\/[a-z-]+": (major|minor|patch)\n)+---\n/,
      `${file} must start with frontmatter that names packages and bumps`,
    );
  }
});

test("every package has the same version, and Gradle has it too", () => {
  // releaseVersion throws when the packages disagree.
  assert.equal(gradleVersion(), releaseVersion(), "run: node tools/release/sync-versions.mjs");
});

test("exactly the packages meant for npm are publishable, each with the license text", () => {
  const license = readFileSync(join(repoRoot, "LICENSE"), "utf8");
  for (const dir of VERSIONED) {
    const manifest = readJson(`${dir}/package.json`);
    const published = NPM_PACKAGES.includes(dir);
    assert.equal(manifest.private === true, !published, `${dir}: private`);
    if (!published) continue;
    assert.equal(manifest.license, "Apache-2.0");
    assert.equal(manifest.publishConfig?.access, "public", dir);
    // npm's trusted publishing compares this with the repository that publishes.
    assert.equal(
      manifest.repository.url,
      "git+https://github.com/raincoat-ui/design-system.git",
      dir,
    );
    assert.equal(manifest.repository.directory, dir);
    assert.equal(
      readFileSync(join(repoRoot, dir, "LICENSE"), "utf8"),
      license,
      `${dir}/LICENSE differs from LICENSE`,
    );
    assert.ok(existsSync(join(repoRoot, dir, "NOTICE")), `${dir}/NOTICE`);
    assert.ok(existsSync(join(repoRoot, dir, "README.md")), `${dir}/README.md`);
  }
});

test("only a change to something that ships stops a tagged release from being finished", () => {
  const repository = temp();
  const write = (file, content) => {
    mkdirSync(join(repository, file, ".."), { recursive: true });
    writeFileSync(join(repository, file), content);
  };
  const commit = (message) => {
    git(repository, "add", "--all");
    git(
      repository,
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "--quiet",
      "--message",
      message,
    );
  };
  git(repository, "init", "--quiet", "--initial-branch", "main");
  for (const file of [
    "packages/web/src/index.ts",
    "packages/web/test/browser/button.suite.tsx",
    "packages/android/README.md",
    "packages/android/ui/src/main/kotlin/Button.kt",
    "packages/android/ui/src/test/kotlin/ButtonTest.kt",
    "packages/ios/Tests/RaincoatTests/ButtonTests.swift",
    "docs/roadmap.md",
    "tools/release/plan.mjs",
  ]) {
    write(file, "one");
  }
  commit("release");
  git(repository, "tag", "v0.1.0");

  // Documents, tools, and tests that are not shipped may move on.
  for (const file of [
    "docs/roadmap.md",
    "tools/release/plan.mjs",
    "packages/android/README.md",
    "packages/web/test/browser/button.suite.tsx",
    "packages/android/ui/src/test/kotlin/ButtonTest.kt",
  ]) {
    write(file, "two");
  }
  commit("documents and tests");
  assert.deepEqual(shippedChangesSince("v0.1.0", repository), []);

  // Component code, and the Swift tests that the mirror carries, may not.
  write("packages/web/src/index.ts", "two");
  write("packages/android/ui/src/main/kotlin/Button.kt", "two");
  write("packages/ios/Tests/RaincoatTests/ButtonTests.swift", "two");
  commit("code");
  assert.deepEqual(shippedChangesSince("v0.1.0", repository), [
    "packages/android/ui/src/main/kotlin/Button.kt",
    "packages/ios/Tests/RaincoatTests/ButtonTests.swift",
    "packages/web/src/index.ts",
  ]);
});

// The Maven repository

/** Writes a staged repository holding one version of each named artifact. */
function stage(version, names = ["ui", "tokens"], content = "bytes") {
  const dir = temp();
  for (const name of names) {
    const target = join(dir, "io/github/raincoat-ui", name, version);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, `${name}-${version}.pom`), `<project>${name} ${version}</project>`);
    writeFileSync(join(target, `${name}-${version}.jar`), content);
  }
  return dir;
}

test("a staged release is added to the repository, with metadata that lists every version", () => {
  const repository = temp();
  assert.deepEqual(add(stage("0.1.0-next.0"), repository), [
    { coordinates: "io.github.raincoat-ui:tokens:0.1.0-next.0", status: "added" },
    { coordinates: "io.github.raincoat-ui:ui:0.1.0-next.0", status: "added" },
  ]);
  add(stage("0.1.0"), repository);
  add(stage("0.1.0-next.1", ["ui"]), repository);

  const ui = join(repository, "io/github/raincoat-ui/ui");
  assert.ok(existsSync(join(ui, "0.1.0/ui-0.1.0.jar")));
  const xml = readFileSync(join(ui, "maven-metadata.xml"), "utf8");
  assert.match(xml, /<groupId>io\.github\.raincoat-ui<\/groupId>\s*<artifactId>ui<\/artifactId>/);
  assert.match(xml, /<latest>0\.1\.0<\/latest>\s*<release>0\.1\.0<\/release>/);
  assert.deepEqual(
    [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(([, version]) => version),
    ["0.1.0-next.0", "0.1.0-next.1", "0.1.0"],
  );
  // Each checksum file holds the digest of the metadata beside it.
  for (const algorithm of ["md5", "sha1", "sha256", "sha512"]) {
    assert.equal(
      readFileSync(join(ui, `maven-metadata.xml.${algorithm}`), "utf8"),
      createHash(algorithm).update(xml).digest("hex"),
    );
  }
  assert.deepEqual(
    artifacts(repository).map(({ group, artifact, versions }) => [
      group,
      artifact,
      versions.length,
    ]),
    [
      ["io.github.raincoat-ui", "tokens", 2],
      ["io.github.raincoat-ui", "ui", 3],
    ],
  );
});

test("a version that is already published is never replaced", () => {
  const repository = temp();
  add(stage("0.1.0", ["ui"], "the first bytes"), repository);
  const again = add(stage("0.1.0", ["ui"], "different bytes"), repository);
  assert.deepEqual(again, [{ coordinates: "io.github.raincoat-ui:ui:0.1.0", status: "kept" }]);
  assert.equal(
    readFileSync(join(repository, "io/github/raincoat-ui/ui/0.1.0/ui-0.1.0.jar"), "utf8"),
    "the first bytes",
  );
});

test("metadata carries the time it was written", () => {
  const xml = metadata({
    group: "g",
    artifact: "a",
    versions: ["1.0.0"],
    now: new Date("2026-11-16T05:06:07Z"),
  });
  assert.match(xml, /<lastUpdated>20261116050607<\/lastUpdated>/);
});

// npm tarballs

test("a tarball must hold what its manifest promises, and nothing that only works here", () => {
  const manifest = {
    exports: {
      ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
      "./ui.css": "./dist/ui.css",
    },
    dependencies: { clsx: "^2.1.1" },
  };
  const complete = [...promisedFiles(manifest)];
  assert.deepEqual(tarballProblems(complete, manifest), []);
  assert.deepEqual(
    tarballProblems(
      complete.filter((file) => file !== "dist/ui.css" && file !== "LICENSE"),
      manifest,
    ),
    ["dist/ui.css is missing from the tarball", "LICENSE is missing from the tarball"],
  );
  assert.deepEqual(
    tarballProblems(complete, {
      ...manifest,
      dependencies: { "@raincoat-ui/tokens": "workspace:*" },
    }),
    [
      'dependencies.@raincoat-ui/tokens is "workspace:*", which only resolves inside this repository',
    ],
  );
  assert.deepEqual(tarballProblems(complete, { ...manifest, private: true }), [
    "the package is private",
  ]);
  assert.deepEqual(tarballProblems([...complete, "test/browser/button.suite.tsx"], manifest), [
    "test/browser/button.suite.tsx should not ship",
  ]);
});

// Release notes

test("release notes merge the changelogs and say how to install and verify", () => {
  const changelog = [
    "# @raincoat-ui/react",
    "",
    "## 0.1.0-next.1",
    "",
    "### Patch Changes",
    "",
    "- abc1234: Fix the focus ring.",
    "",
    "## 0.1.0-next.0",
    "",
    "### Minor Changes",
    "",
    "- 54629f3: The first prerelease. It contains",
    "  the Button.",
    "- A second change.",
    "",
  ].join("\n");
  assert.deepEqual(entries(changelog, "0.1.0-next.0"), [
    "The first prerelease. It contains the Button.",
    "A second change.",
  ]);
  assert.deepEqual(entries(changelog, "0.1.0-next.1"), ["Fix the focus ring."]);
  assert.deepEqual(entries(changelog, "9.9.9"), []);

  const text = notes({
    version: "0.1.0-next.0",
    changes: ["The first prerelease."],
    npmPending: ["@raincoat-ui/react"],
  });
  assert.match(text, /^> This is a prerelease\./);
  assert.match(text, /- The first prerelease\./);
  assert.match(
    text,
    /npm install @raincoat-ui\/react@0\.1\.0-next\.0 @raincoat-ui\/theme-base@0\.1\.0-next\.0/,
  );
  assert.match(text, /Not on npm yet: @raincoat-ui\/react/);
  assert.match(text, /implementation\("io\.github\.raincoat-ui:ui:0\.1\.0-next\.0"\)/);
  assert.match(text, /design-system-swift", exact: "0\.1\.0-next\.0"\)/);
  assert.match(
    notes({ version: "0.1.0-next.0", changes: [], swiftPending: true }),
    /Not in the Swift mirror yet/,
  );
  assert.doesNotMatch(
    notes({ version: "1.0.0", changes: [] }),
    /prerelease|Not on npm|Not in the Swift mirror/,
  );
});

// Bill of materials

test("the bill of materials lists each component once, in a fixed order, and is the same every time", () => {
  const dependencies = [
    ...npmComponents([
      { name: "clsx", version: "2.1.1", license: "MIT" },
      { name: "@radix-ui/react-slot", version: "1.2.3", license: "MIT" },
    ]),
    ...mavenComponents([
      [
        {
          groupId: "androidx.core",
          artifactId: "core",
          version: "1.16.0",
          spdxLicenses: [{ identifier: "Apache-2.0" }],
        },
      ],
      // The same artifact reported by a second module.
      [
        {
          groupId: "androidx.core",
          artifactId: "core",
          version: "1.16.0",
          spdxLicenses: [{ identifier: "Apache-2.0" }],
        },
      ],
    ]),
  ];
  const input = {
    version: "0.1.0",
    timestamp: "2026-11-16T00:00:00.000Z",
    published: [],
    dependencies,
  };
  const document = bom(input);
  assert.equal(document.bomFormat, "CycloneDX");
  assert.equal(document.specVersion, "1.6");
  assert.match(
    document.serialNumber,
    /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.deepEqual(
    document.components.map(({ purl }) => purl),
    [
      "pkg:maven/androidx.core/core@1.16.0",
      "pkg:npm/%40radix-ui/react-slot@1.2.3",
      "pkg:npm/clsx@2.1.1",
    ],
  );
  assert.deepEqual(document.components[0].licenses, [{ license: { id: "Apache-2.0" } }]);
  assert.deepEqual(document.components[2].licenses, [{ expression: "MIT" }]);
  assert.deepEqual(bom(input), document);
  assert.notEqual(bom({ ...input, version: "0.2.0" }).serialNumber, document.serialNumber);
});

// Publishing, against local repositories

const script = (name, args, env) =>
  spawnSync(process.execPath, [join(repoRoot, "tools/release", name), ...args], {
    encoding: "utf8",
    // Start from an environment with no credentials of any kind.
    env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_CONFIG_NOSYSTEM: "1", ...env },
  });

test("the Maven publish adds to the Pages branch without touching the site, and can be repeated", () => {
  // A stand-in for the repository on GitHub, with a site already on its gh-pages branch.
  const remote = join(temp(), "pages.git");
  git(tmpdir(), "init", "--quiet", "--bare", "--initial-branch", "gh-pages", remote);
  const seed = temp();
  git(seed, "init", "--quiet", "--initial-branch", "gh-pages");
  writeFileSync(join(seed, "index.html"), "<h1>the site</h1>");
  git(seed, "add", "--all");
  git(
    seed,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@example.invalid",
    "commit",
    "--quiet",
    "--message",
    "site",
  );
  git(seed, "push", "--quiet", remote, "gh-pages");

  const first = script("publish-maven.mjs", [stage("0.1.0-next.0")], { PAGES_REMOTE: remote });
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /added {2}io\.github\.raincoat-ui:ui:0\.1\.0-next\.0/);

  const files = git(remote, "ls-tree", "-r", "--name-only", "gh-pages").split("\n");
  assert.ok(files.includes("index.html"), "the site is still there");
  assert.ok(files.includes("maven/io/github/raincoat-ui/ui/0.1.0-next.0/ui-0.1.0-next.0.pom"));
  assert.ok(files.includes("maven/io/github/raincoat-ui/ui/maven-metadata.xml.sha256"));
  assert.match(
    git(remote, "log", "-1", "--format=%s", "gh-pages"),
    /^Publish io\.github\.raincoat-ui:tokens:0\.1\.0-next\.0, /,
  );

  const again = script("publish-maven.mjs", [stage("0.1.0-next.0")], { PAGES_REMOTE: remote });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /Everything was already published/);
  assert.equal(git(remote, "rev-list", "--count", "gh-pages"), "2");
});

test("the Swift publish makes the mirror exactly the staged tree, tags it, and can be repeated", () => {
  const remote = join(temp(), "mirror.git");
  git(tmpdir(), "init", "--quiet", "--bare", "--initial-branch", "main", remote);
  const tree = join(temp(), "design-system-swift");
  mkdirSync(join(tree, "Sources"), { recursive: true });
  writeFileSync(join(tree, "Package.swift"), "// one");
  writeFileSync(join(tree, "Sources/Old.swift"), "// removed in the next version");

  // The first release goes to an empty repository.
  const first = script("publish-swift.mjs", [tree, "0.1.0-next.0"], { SWIFT_MIRROR_URL: remote });
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Pushed 0\.1\.0-next\.0/);
  assert.equal(git(remote, "tag", "--list"), "0.1.0-next.0");
  assert.deepEqual(git(remote, "ls-tree", "-r", "--name-only", "0.1.0-next.0").split("\n"), [
    "Package.swift",
    "Sources/Old.swift",
  ]);

  const again = script("publish-swift.mjs", [tree, "0.1.0-next.0"], { SWIFT_MIRROR_URL: remote });
  assert.match(again.stdout, /already tagged/);
  assert.equal(git(remote, "rev-list", "--count", "main"), "1");

  // The next release replaces the tree: a file that is gone from the package is gone from the mirror.
  rmSync(join(tree, "Sources/Old.swift"));
  writeFileSync(join(tree, "Sources/New.swift"), "// added");
  const second = script("publish-swift.mjs", [tree, "0.1.0-next.1"], { SWIFT_MIRROR_URL: remote });
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(git(remote, "ls-tree", "-r", "--name-only", "0.1.0-next.1").split("\n"), [
    "Package.swift",
    "Sources/New.swift",
  ]);
  assert.deepEqual(git(remote, "tag", "--list").split("\n"), ["0.1.0-next.0", "0.1.0-next.1"]);
  assert.match(git(remote, "log", "-1", "--format=%s", "main"), /^Release 0\.1\.0-next\.1$/);
});

test("without a credential, the Swift publish reports the package as pending and does not fail", () => {
  const outputs = join(temp(), "outputs");
  writeFileSync(outputs, "");
  const result = script("publish-swift.mjs", [temp(), "0.1.0-next.0"], { GITHUB_OUTPUT: outputs });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /was not published: the release has no credential/);
  assert.equal(readFileSync(outputs, "utf8"), "pending=true\n");
});

// The Swift mirror

test("the Swift mirror holds the package at its root, and nothing that belongs to npm", () => {
  const out = join(temp(), "design-system-swift");
  writeMirror(out);
  for (const file of [
    "Package.swift",
    "LICENSE",
    "NOTICE",
    "README.md",
    "Sources/Raincoat/Components/RaincoatButton.swift",
    "Tests/RaincoatTests/ButtonRenderingTests.swift",
  ]) {
    assert.ok(existsSync(join(out, file)), file);
  }
  assert.equal(existsSync(join(out, "package.json")), false);
  assert.equal(
    readFileSync(join(out, "LICENSE"), "utf8"),
    readFileSync(join(repoRoot, "LICENSE"), "utf8"),
  );
});

// The reference apps on a published release

test("only a semantic version is ever written into a reference app", () => {
  for (const good of ["0.1.0", "0.1.0-next.1", "1.20.3-rc.0", "2.0.0-alpha-2"]) {
    assert.ok(isVersion(good), good);
  }
  for (const bad of [
    "",
    "v0.1.0",
    "0.1",
    "01.0.0",
    "0.1.0-",
    "0.1.0-next..1",
    '0.1.0"; x',
    "0.1.0\n",
  ]) {
    assert.ok(!isVersion(bad), JSON.stringify(bad));
  }
  const refused = script("use-published.mjs", ["ios", "0.1.0; touch x"]);
  assert.equal(refused.status, 2);
  const unknown = script("use-published.mjs", ["windows", "0.1.0"]);
  assert.equal(unknown.status, 2);
});

test("each web app trades exactly the Raincoat packages it takes from this workspace", () => {
  assert.deepEqual(WEB_APPS, ["apps/reference-web-vite", "apps/reference-web-next"]);
  for (const app of WEB_APPS) {
    assert.deepEqual(webPackages(readJson(`${app}/package.json`)), [
      "@raincoat-ui/react",
      "@raincoat-ui/theme-base",
    ]);
  }
  assert.deepEqual(
    webPackages({
      dependencies: { "@raincoat-ui/react": "0.1.0", react: "19.3.1" },
      devDependencies: { "@raincoat-ui/tokens": "workspace:*", "other-tool": "workspace:*" },
    }),
    ["@raincoat-ui/tokens"],
  );
});

test("the Android app is pointed at the Maven repository on GitHub Pages", () => {
  const properties = androidProperties("0.1.0-next.1");
  assert.match(
    properties,
    /^raincoatRepository=https:\/\/raincoat-ui\.github\.io\/design-system\/maven$/m,
  );
  assert.match(properties, /^raincoatVersion=0\.1\.0-next\.1$/m);
  // The property names are the ones the app's build reads.
  const settings = readFileSync(
    join(repoRoot, "apps/reference-android/settings.gradle.kts"),
    "utf8",
  );
  const build = readFileSync(join(repoRoot, "apps/reference-android/build.gradle.kts"), "utf8");
  assert.match(settings, /gradleProperty\("raincoatRepository"\)/);
  assert.match(build, /gradleProperty\("raincoatVersion"\)/);
});

test("the iOS app is pointed at the Swift mirror, at exactly the version, and nothing else changes", () => {
  const file = join(repoRoot, "apps/reference-ios/ReferenceApp.xcodeproj/project.pbxproj");
  const project = readFileSync(file, "utf8");
  const changed = projectWithMirror(project, "0.1.0-next.1");

  // The lines of `to` that `from` does not have, counting a line that occurs more than once.
  const difference = (from, to) => {
    const left = from.split("\n");
    return to.split("\n").filter((line) => {
      const at = left.indexOf(line);
      if (at !== -1) left.splice(at, 1);
      return at === -1;
    });
  };
  const removed = difference(changed, project);
  const added = difference(project, changed);
  // The local reference, and where the project lists it.
  assert.deepEqual(removed, [
    '\t\t\t\t5A0000000000000000000121 /* XCLocalSwiftPackageReference "../../packages/ios" */,',
    "/* Begin XCLocalSwiftPackageReference section */",
    '\t\t5A0000000000000000000121 /* XCLocalSwiftPackageReference "../../packages/ios" */ = {',
    "\t\t\tisa = XCLocalSwiftPackageReference;",
    "\t\t\trelativePath = ../../packages/ios;",
    "/* End XCLocalSwiftPackageReference section */",
  ]);
  const reference =
    '5A0000000000000000000121 /* XCRemoteSwiftPackageReference "design-system-swift" */';
  assert.deepEqual(added, [
    `\t\t\t\t${reference},`,
    "/* Begin XCRemoteSwiftPackageReference section */",
    `\t\t${reference} = {`,
    "\t\t\tisa = XCRemoteSwiftPackageReference;",
    '\t\t\trepositoryURL = "https://github.com/raincoat-ui/design-system-swift";',
    "\t\t\trequirement = {",
    "\t\t\t\tkind = exactVersion;",
    '\t\t\t\tversion = "0.1.0-next.1";',
    "\t\t\t};",
    "/* End XCRemoteSwiftPackageReference section */",
    // Every product the two targets use comes from the mirror.
    ...Array(4).fill(`\t\t\tpackage = ${reference};`),
  ]);
  assert.equal(changed.match(/isa = XCSwiftPackageProductDependency;/g).length, 4);

  assert.throws(() => projectWithMirror(changed, "0.1.0-next.1"), /already using a release/);
  assert.throws(
    () => projectWithMirror(project.replaceAll("../../packages/ios", "../Elsewhere"), "0.1.0"),
    /should refer to \.\.\/\.\.\/packages\/ios/,
  );
});
