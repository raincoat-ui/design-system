// Runs before the snapshots of each theme. It fails the run when a component spec has no
// snapshot test here, and when a baseline belongs to no snapshot that is still drawn: one of a
// snapshot that left specs/snapshots.yaml, or of a component or theme that was removed. A
// baseline that is missing fails the snapshot itself (specimen.tsx).
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMatrix, loadSpecs, openProject, resolveSnapshots } from "@raincoat-ui/tokens";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));
const baselines = join(here, "__screenshots__");

export default function setup(project) {
  const theme = project.config.provide.theme;
  const components = loadSpecs(repoRoot).map(({ id }) => id);
  const snapshots = new Set(resolveSnapshots(loadMatrix(repoRoot)).map(({ id }) => `${id}.png`));
  const problems = [];

  for (const component of components) {
    if (!existsSync(join(here, `${component}.snapshots.test.tsx`))) {
      problems.push(
        `specs/components/${component} has no snapshot test: add test/snapshots/${component}.snapshots.test.tsx`,
      );
    }
  }
  const themes = openProject(repoRoot).themes.map(({ id }) => id);
  for (const dir of existsSync(baselines) ? readdirSync(baselines) : []) {
    if (!themes.includes(dir)) problems.push(`${dir}/ holds the baselines of no theme; delete it`);
  }
  const themeDir = join(baselines, theme);
  for (const component of existsSync(themeDir) ? readdirSync(themeDir) : []) {
    for (const file of readdirSync(join(themeDir, component))) {
      if (!components.includes(component) || !snapshots.has(file)) {
        problems.push(`${theme}/${component}/${file} is the baseline of no snapshot; delete it`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`Snapshots in the ${theme} theme:\n  ${problems.join("\n  ")}`);
  }
}
