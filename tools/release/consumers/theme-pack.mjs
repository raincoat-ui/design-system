#!/usr/bin/env node
// Builds a theme kept outside this repository with the token build's command line, the way a
// private theme pack does, then compiles what it produced against Raincoat's own packages:
//
//   node tools/release/consumers/theme-pack.mjs --tarballs <dir>     the staged npm tarballs
//   node tools/release/consumers/theme-pack.mjs --version <version>  from the npm registry
//
//   --swift <dir>   also test the Swift package against this copy of the Swift mirror; with
//                   --version and no directory, against the published mirror
//   --maven <dir>   also test the Gradle build against this Maven repository; with --version
//                   and no directory, against the one on GitHub Pages
//
// The theme pack is tools/release/consumers/theme-pack, copied to a temporary directory outside
// the repository, so that nothing of this checkout but the theme itself is used.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  return value === undefined || value.startsWith("--") ? true : value;
};
const tarballs = option("--tarballs");
const version = option("--version");
const swift = option("--swift");
const maven = option("--maven");
if (Boolean(tarballs) === Boolean(version) || tarballs === true || version === true) {
  console.error(
    "usage: theme-pack.mjs --tarballs <dir> | --version <version> [--swift [<dir>]] [--maven [<dir>]]",
  );
  process.exit(2);
}
if ((swift === true || maven === true) && !version) {
  console.error("--swift and --maven need a directory unless --version is given");
  process.exit(2);
}

const pack = mkdtempSync(join(tmpdir(), "raincoat-theme-pack-"));
function run(command, commandArgs, { cwd = pack, env = {} } = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error(`${command} ${commandArgs.join(" ")} failed:\n${result.stdout}${result.stderr}`);
    process.exit(1);
  }
  return result.stdout;
}
function check(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

// 1. A theme pack, as its owner keeps it: themes/, and the token build as a development tool.
cpSync(join(here, "theme-pack/themes"), join(pack, "themes"), { recursive: true });
writeFileSync(join(pack, "package.json"), JSON.stringify({ name: "theme-pack", private: true }));
const cli = tarballs
  ? join(
      resolve(tarballs),
      readdirSync(resolve(tarballs)).find((name) => name.startsWith("raincoat-ui-tokens-")) ??
        "missing-tokens-tarball",
    )
  : `@raincoat-ui/tokens@${version}`;
check(!tarballs || existsSync(cli), `no @raincoat-ui/tokens tarball in ${tarballs}`);
const install = ["install", "--no-audit", "--no-fund", "--save-dev", "--save-exact", cli];
if (version) {
  // A version npm has just published can take minutes to be served. Try until it is.
  const deadline = Date.now() + Number(process.env.NPM_CHECK_WAIT_MINUTES ?? 30) * 60_000;
  for (;;) {
    const result = spawnSync("npm", [...install, "--prefer-online"], {
      cwd: pack,
      encoding: "utf8",
    });
    if (result.status === 0) break;
    const output = `${result.stdout}${result.stderr}`;
    if (!/\b(E404|ETARGET)\b/.test(output) || Date.now() > deadline) {
      console.error(`npm ${install.join(" ")} failed:\n${output}`);
      process.exit(1);
    }
    console.log(
      `npm does not serve @raincoat-ui/tokens@${version} yet. Trying again in 20 seconds.`,
    );
    await new Promise((done) => setTimeout(done, 20_000));
  }
} else {
  run("npm", install);
}
const installed = JSON.parse(
  readFileSync(join(pack, "node_modules/@raincoat-ui/tokens/package.json"), "utf8"),
);
console.log(`Installed @raincoat-ui/tokens ${installed.version} into a theme pack.`);

// 2. The command line, as the pack's owner runs it.
const npx = (...command) => run("npx", ["--no-install", "raincoat-tokens", ...command]);
console.log(npx("lint").trim());
console.log(npx("contrast").trim());
npx("build");
npx("build", "--check");

const dist = join(pack, "dist");
const read = (file) => readFileSync(join(dist, file), "utf8");
for (const file of [
  "npm/harbor/theme.css",
  "npm/harbor/package.json",
  "swift/Package.swift",
  "swift/Sources/RaincoatThemeHarbor/HarborTheme.swift",
  "android/settings.gradle.kts",
  "android/theme-harbor/build.gradle.kts",
  "android/theme-harbor/src/main/kotlin/io/github/raincoatui/theme/harbor/HarborTheme.kt",
]) {
  check(existsSync(join(dist, file)), `the build did not write dist/${file}`);
}
const manifest = JSON.parse(read("npm/harbor/package.json"));
check(manifest.name === "@harbor-example/theme-harbor", `unexpected npm name ${manifest.name}`);
check(manifest.version === installed.version, "the theme's version is not Raincoat's");
// The theme's own accent, not the base's yellow, and every mode.
check(/--rc-color-brand-600: #[0-9a-f]{6};/.test(read("npm/harbor/theme.css")), "no brand ramp");
check(!read("npm/harbor/theme.css").includes("#f7d22a"), "the base's yellow is still there");
check(read("npm/harbor/theme.css").includes('[data-theme="dark-hc"]'), "a mode is missing");
check(
  read("swift/Package.swift").includes(`exact: "${installed.version}"`),
  "the Swift package does not ask for this version of Raincoat",
);
check(
  read("android/theme-harbor/build.gradle.kts").includes(
    `api("io.github.raincoat-ui:tokens:${installed.version}")`,
  ),
  "the Android module does not depend on this version of Raincoat's token types",
);
console.log("The theme pack builds: an npm package, a Swift package, and a Gradle build.");

// 3. What it produced compiles against Raincoat's packages, and its contract tests pass.
if (swift) {
  const env = swift === true ? {} : { RAINCOAT_SWIFT_PATH: resolve(swift) };
  run("swift", ["test", "--package-path", join(dist, "swift")], { env });
  console.log(
    `The Swift package builds and its tests pass, against ${swift === true ? "the published Swift mirror" : swift}.`,
  );
}
if (maven) {
  const repository =
    maven === true ? "https://raincoat-ui.github.io/design-system/maven" : resolve(maven);
  const gradlew = join(repoRoot, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  run(gradlew, [
    "-p",
    join(dist, "android"),
    "test",
    `-PraincoatRepository=${repository}`,
    "--no-daemon",
    "--console=plain",
  ]);
  console.log(`The Gradle build compiles and its tests pass, against ${repository}.`);
}

rmSync(pack, { recursive: true, force: true });
