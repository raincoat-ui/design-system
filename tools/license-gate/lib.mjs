import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { isAllowed } from "./spdx.mjs";

/** Loads licenses/allowlist.yml and resolves `extends`, returning a Set per scope. */
export function loadAllowlist(path) {
  return resolveAllowlist(parseYaml(readFileSync(path, "utf8")));
}

export function resolveAllowlist(document) {
  const scopes = {};
  const resolve = (name, seen = []) => {
    if (scopes[name]) return scopes[name];
    const scope = document.scopes?.[name];
    if (!scope) throw new Error(`allowlist: unknown scope "${name}"`);
    if (seen.includes(name)) throw new Error(`allowlist: "extends" cycle through "${name}"`);
    const licenses = new Set(scope.licenses ?? []);
    if (scope.extends) {
      for (const id of resolve(scope.extends, [...seen, name])) licenses.add(id);
    }
    scopes[name] = licenses;
    return licenses;
  };
  for (const name of Object.keys(document.scopes ?? {})) resolve(name);
  return scopes;
}

export function loadCurations(path) {
  const document = parseYaml(readFileSync(path, "utf8")) ?? {};
  return { corrections: document.corrections ?? [], exceptions: document.exceptions ?? [] };
}

/** Flattens `pnpm licenses list --json` output into one row per package version. */
export function flattenReport(report) {
  const rows = [];
  for (const entries of Object.values(report ?? {})) {
    for (const entry of entries) {
      for (const version of entry.versions ?? [undefined]) {
        rows.push({ name: entry.name, version, license: entry.license });
      }
    }
  }
  return rows.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
}

const matches = (selector, row) =>
  selector === row.name || selector === `${row.name}@${row.version}`;

/**
 * Evaluates package rows against one scope of the allowlist.
 * @returns {{violations: Array<{name, version, license, why}>, problems: string[]}}
 *   `violations` are packages that are not allowed; `problems` are mistakes in curations.yml.
 */
export function evaluate({ rows, scope, allowlist, curations, today }) {
  const allowed = allowlist[scope];
  if (!allowed) throw new Error(`license gate: unknown scope "${scope}"`);
  const violations = [];
  const problems = [];

  for (const exception of curations.exceptions) {
    for (const field of ["package", "scope", "reason", "approved", "review-by"]) {
      if (!exception[field]) problems.push(`exception for "${exception.package}" lacks "${field}"`);
    }
    if (exception.package && !/.@[^@]+$/.test(exception.package)) {
      problems.push(`exception "${exception.package}" must name an exact version (name@version)`);
    }
  }
  for (const correction of curations.corrections) {
    for (const field of ["package", "license", "evidence"]) {
      if (!correction[field])
        problems.push(`correction for "${correction.package}" lacks "${field}"`);
    }
  }

  for (const row of rows) {
    const correction = curations.corrections.find((item) => matches(item.package, row));
    const license = correction?.license ?? row.license;
    if (isAllowed(license, allowed)) continue;

    const exception = curations.exceptions.find(
      (item) => item.scope === scope && item.package === `${row.name}@${row.version}`,
    );
    if (exception && String(exception["review-by"]) >= today) continue;

    violations.push({
      name: row.name,
      version: row.version,
      license: license || "(none declared)",
      why: exception
        ? `its exception expired on ${exception["review-by"]}`
        : `not on the "${scope}" allowlist`,
    });
  }
  return { violations, problems };
}
