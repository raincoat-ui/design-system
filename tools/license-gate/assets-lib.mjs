const FONT = /\.(woff2?|ttf|otf|ttc)$/i;
const THEME_ASSET = /^themes\/[^/]+\/assets\/.+/;
export const BRAND_LICENSE = "LicenseRef-Brand-Proprietary";

/** Files the manifest must cover: every font, and everything under themes/<id>/assets/. */
export function needsEntry(path) {
  if (/(^|\/)(README|LICENSES)\.md$/i.test(path)) return false;
  return FONT.test(path) || THEME_ASSET.test(path);
}

/** Converts a glob (`*` within a segment, `**` across segments) into a RegExp. */
export function globToRegExp(glob) {
  let pattern = "";
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        pattern += ".*";
        index++;
        if (glob[index + 1] === "/") index++;
      } else {
        pattern += "[^/]*";
      }
    } else {
      pattern += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`);
}

/**
 * @param files     repo-relative paths of committed files
 * @param manifest  parsed licenses/assets.yml
 * @param shipLicenses  Set of licenses in the "ship" scope
 * @param fontLicenses  Set of licenses in the "fonts" scope
 * @returns {string[]} problems; empty when everything is covered
 */
export function checkAssets({ files, manifest, shipLicenses, fontLicenses }) {
  const problems = [];
  const entries = (manifest.assets ?? []).map((entry) => ({
    ...entry,
    regexp: globToRegExp(entry.path ?? ""),
    used: false,
  }));

  for (const entry of entries) {
    const label = `assets.yml entry "${entry.path}"`;
    for (const field of ["path", "kind", "license", "source"]) {
      if (!entry[field]) problems.push(`${label} lacks "${field}"`);
    }
    if (entry.kind === "font" && !fontLicenses.has(entry.license)) {
      problems.push(
        `${label}: fonts must be ${[...fontLicenses].join(" or ")}, not ${entry.license}`,
      );
    } else if (entry.kind === "icon" && !shipLicenses.has(entry.license)) {
      problems.push(`${label}: icon license ${entry.license} is not on the "ship" allowlist`);
    } else if (entry.kind === "brand") {
      if (entry.license !== BRAND_LICENSE) {
        problems.push(`${label}: brand assets must be ${BRAND_LICENSE}`);
      }
      if (!/^themes\/[^/]+\/assets\//.test(entry.path ?? "")) {
        problems.push(`${label}: brand assets may only live under themes/<id>/assets/`);
      }
    } else if (entry.kind && !["font", "icon", "brand"].includes(entry.kind)) {
      problems.push(`${label}: unknown kind "${entry.kind}"`);
    }
  }

  for (const file of files.filter(needsEntry)) {
    const entry = entries.find((candidate) => candidate.regexp.test(file));
    if (!entry) {
      problems.push(`${file} has no entry in licenses/assets.yml`);
      continue;
    }
    entry.used = true;
    if (/\.(woff2?|ttf|otf|ttc)$/i.test(file) && entry.kind !== "font") {
      problems.push(`${file} is a font but its entry "${entry.path}" has kind "${entry.kind}"`);
    }
  }

  for (const entry of entries.filter((candidate) => !candidate.used)) {
    problems.push(`assets.yml entry "${entry.path}" matches no committed file; remove it`);
  }
  return problems;
}
