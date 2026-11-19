// Commit rules shared by the local hook and CI: Developer Certificate of Origin sign-off, and
// the pull request title that commitlint checks.

const SIGN_OFF = /^Signed-off-by:\s*(.+?)\s*<([^<>\s]+)>\s*$/gim;

/** Returns every `Signed-off-by` trailer in a commit message as {name, email}. */
export function signOffs(message) {
  const found = [];
  for (const match of message.matchAll(SIGN_OFF)) {
    found.push({ name: match[1], email: match[2].toLowerCase() });
  }
  return found;
}

/** Automated accounts (Dependabot and other GitHub Apps) cannot sign off and are exempt. */
export function isBot(commit) {
  return /\[bot\]@users\.noreply\.github\.com$/i.test(commit.authorEmail);
}

/**
 * Checks one commit. A commit passes when a sign-off trailer carries the author's or the
 * committer's email address. Merge commits and bot commits are skipped.
 * @returns {string|null} a problem description, or null when the commit is fine.
 */
export function dcoProblem(commit) {
  if (commit.parents > 1 || isBot(commit)) return null;
  const trailers = signOffs(commit.message);
  if (trailers.length === 0) return "has no Signed-off-by line";
  const accepted = [commit.authorEmail, commit.committerEmail]
    .filter(Boolean)
    .map((email) => email.toLowerCase());
  if (!trailers.some((trailer) => accepted.includes(trailer.email))) {
    return `is signed off by ${trailers.map((t) => t.email).join(", ")}, not by its author (${commit.authorEmail})`;
  }
  return null;
}

/**
 * The pull request title commitlint checks. Dependabot capitalizes its first word ("chore(deps):
 * Bump …") because it copies the case it finds after a colon in recent commit messages, and our
 * `Co-Authored-By:` trailers read to it as capitalized subjects. It has no setting to stop that,
 * so for a bot's pull request only that one letter is lowercased; every other rule still applies.
 * @param {string} title the pull request title
 * @param {string} [authorLogin] the login of the account that opened the pull request
 */
export function titleToLint(title, authorLogin = "") {
  if (!/\[bot\]$/i.test(authorLogin)) return title;
  return title.replace(
    /^([a-z]+(?:\([^)]*\))?!?: )([A-Z])/,
    (_, head, first) => `${head}${first.toLowerCase()}`,
  );
}

/** Parses the output of `git log --format=%H%x00%P%x00%ae%x00%ce%x00%B%x01`. */
export function parseGitLog(output) {
  return output
    .split("\x01")
    .map((record) => record.replace(/^\n+/, ""))
    .filter((record) => record.trim() !== "")
    .map((record) => {
      const [sha, parents, authorEmail, committerEmail, message] = record.split("\x00");
      return {
        sha,
        parents: parents.trim() === "" ? 0 : parents.trim().split(/\s+/).length,
        authorEmail,
        committerEmail,
        message: message ?? "",
      };
    });
}
