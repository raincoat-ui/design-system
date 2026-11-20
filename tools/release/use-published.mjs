#!/usr/bin/env node
// Points a reference app at a published release, so that it installs Raincoat from where an app
// installs it instead of from this checkout:
//
//   node tools/release/use-published.mjs web [version]      from npm, for both web apps
//   node tools/release/use-published.mjs android [version]  from the Maven repository
//   node tools/release/use-published.mjs ios [version]      from the Swift mirror
//
// Without a version, the one this checkout names. The app's tests then run as they always do.
//
// It changes the checkout the way an app's own change would: the web apps' package.json files
// and the lockfile, a gradle.properties for the Android app, the iOS app's Xcode project. CI runs
// it on a fresh checkout. To go back, restore those files with git, then run `pnpm install`; for Android,
// delete apps/reference-android/gradle.properties.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, releaseVersion, repoRoot } from "./lib.mjs";

export const MAVEN_REPOSITORY = "https://raincoat-ui.github.io/design-system/maven";
export const SWIFT_MIRROR = "https://github.com/raincoat-ui/design-system-swift";

/** A semantic version, which is all that is ever written into the apps' files. */
export const isVersion = (value) =>
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/.test(value);

// Web

/** The web apps: a single-page app built with Vite, and a Next.js app rendered on a server. */
export const WEB_APPS = ["apps/reference-web-vite", "apps/reference-web-next"];

/** The Raincoat packages a web app installs from this workspace. */
export function webPackages(manifest) {
  return Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
    .filter(([name, range]) => name.startsWith("@raincoat-ui/") && range.startsWith("workspace:"))
    .map(([name]) => name);
}

function useNpm(version) {
  for (const app of WEB_APPS) useNpmIn(app, version);
}

function useNpmIn(app, version) {
  const manifest = readJson(`${app}/package.json`);
  const packages = webPackages(manifest);
  if (packages.length === 0) {
    throw new Error(`${app} installs no Raincoat package from this workspace`);
  }
  const added = spawnSync(
    "pnpm",
    [
      "--filter",
      manifest.name,
      "add",
      "--save-exact",
      ...packages.map((name) => `${name}@${version}`),
    ],
    { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (added.status !== 0) throw new Error(`pnpm could not install ${version} from npm in ${app}`);

  // The tests would pass just as well against this workspace, so make sure they will not.
  for (const name of packages) {
    const installed = realpathSync(join(repoRoot, app, "node_modules", name));
    if (!installed.includes(`${sep}node_modules${sep}.pnpm${sep}`)) {
      throw new Error(`${name} resolves to ${installed}, not to the package from npm`);
    }
    const found = JSON.parse(readFileSync(join(installed, "package.json"), "utf8")).version;
    if (found !== version) throw new Error(`${name} is ${found}, not ${version}`);
  }
}

// Android

const ANDROID_PROPERTIES = "apps/reference-android/gradle.properties";
const ANDROID_HEADER = "# Written by tools/release/use-published.mjs.";

/** The Android app's gradle.properties, which its settings and build files read. */
export const androidProperties = (version) =>
  `${ANDROID_HEADER} The app installs Raincoat from the Maven
# repository on GitHub Pages instead of the one this checkout stages. Delete this file to go back.
raincoatRepository=${MAVEN_REPOSITORY}
raincoatVersion=${version}
`;

function useMaven(version) {
  const file = join(repoRoot, ANDROID_PROPERTIES);
  if (existsSync(file) && !readFileSync(file, "utf8").startsWith(ANDROID_HEADER)) {
    throw new Error(`${ANDROID_PROPERTIES} exists and was not written by this script`);
  }
  writeFileSync(file, androidProperties(version));
}

// iOS

const IOS_PROJECT = "apps/reference-ios/ReferenceApp.xcodeproj/project.pbxproj";
const LOCAL_PACKAGE = "../../packages/ios";

const section = (isa) =>
  new RegExp(`/\\* Begin ${isa} section \\*/\\n([\\s\\S]*?)/\\* End ${isa} section \\*/\\n`);

/**
 * The iOS app's Xcode project, with the Swift package taken from the mirror at exactly `version`
 * instead of from packages/ios. Only the package reference changes: the same object, now a remote
 * reference, which each product the targets use now names, as Xcode writes it.
 */
export function projectWithMirror(project, version) {
  const local = section("XCLocalSwiftPackageReference").exec(project);
  if (!local) {
    throw new Error("the project has no local package reference; is it already using a release?");
  }
  const references = [
    ...local[1].matchAll(/^\t\t(\w+) \/\* XCLocalSwiftPackageReference "([^"]+)" \*\/ = \{$/gm),
  ];
  if (references.length !== 1 || references[0][2] !== LOCAL_PACKAGE) {
    throw new Error(`the project should refer to ${LOCAL_PACKAGE} and to no other local package`);
  }
  const id = references[0][1];
  const before = `${id} /* XCLocalSwiftPackageReference "${LOCAL_PACKAGE}" */`;
  const after = `${id} /* XCRemoteSwiftPackageReference "design-system-swift" */`;
  const remote = [
    "/* Begin XCRemoteSwiftPackageReference section */",
    `\t\t${after} = {`,
    "\t\t\tisa = XCRemoteSwiftPackageReference;",
    `\t\t\trepositoryURL = "${SWIFT_MIRROR}";`,
    "\t\t\trequirement = {",
    "\t\t\t\tkind = exactVersion;",
    `\t\t\t\tversion = "${version}";`,
    "\t\t\t};",
    "\t\t};",
    "/* End XCRemoteSwiftPackageReference section */",
    "",
  ].join("\n");

  const result = project
    .replace(local[0], () => remote)
    .replaceAll(before, after)
    .replace(section("XCSwiftPackageProductDependency"), (products) =>
      products.replace(
        /^(\t\t\tisa = XCSwiftPackageProductDependency;\n)(?!\t\t\tpackage = )/gm,
        (isa) => `${isa}\t\t\tpackage = ${after};\n`,
      ),
    );
  if (result.includes(LOCAL_PACKAGE))
    throw new Error(`the project still refers to ${LOCAL_PACKAGE}`);
  return result;
}

function useMirror(version) {
  const file = join(repoRoot, IOS_PROJECT);
  writeFileSync(file, projectWithMirror(readFileSync(file, "utf8"), version));
}

const APPS = {
  web: { use: useNpm, label: "web", from: "npm" },
  android: { use: useMaven, label: "Android", from: MAVEN_REPOSITORY },
  ios: { use: useMirror, label: "iOS", from: SWIFT_MIRROR },
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [name, given] = process.argv.slice(2);
  const app = Object.hasOwn(APPS, name ?? "") ? APPS[name] : null;
  const version = given || releaseVersion();
  if (!app || !isVersion(version)) {
    console.error("usage: use-published.mjs <web|android|ios> [version]");
    process.exit(2);
  }
  app.use(version);
  const apps =
    name === "web" ? "web reference apps now install" : `${app.label} reference app now installs`;
  console.log(`The ${apps} Raincoat ${version} from ${app.from}.`);
}
