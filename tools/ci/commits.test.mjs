import assert from "node:assert/strict";
import { test } from "node:test";
import { dcoProblem, isBot, parseGitLog, signOffs } from "./commits.mjs";

const author = "12345+someone@users.noreply.github.com";
const commit = (overrides) => ({
  sha: "a".repeat(40),
  parents: 1,
  authorEmail: author,
  committerEmail: author,
  message: `feat: add a thing\n\nSigned-off-by: Some One <${author}>\n`,
  ...overrides,
});

test("signOffs finds every trailer and lowercases the address", () => {
  const message = "fix: x\n\nSigned-off-by: A <A@Example.org>\nSigned-off-by: B <b@example.org>\n";
  assert.deepEqual(signOffs(message), [
    { name: "A", email: "a@example.org" },
    { name: "B", email: "b@example.org" },
  ]);
});

test("a commit signed off by its author passes", () => {
  assert.equal(dcoProblem(commit()), null);
});

test("a commit without a sign-off fails", () => {
  assert.match(dcoProblem(commit({ message: "feat: add a thing\n" })), /no Signed-off-by/);
});

test("a sign-off by someone other than the author or committer fails", () => {
  const message = "feat: x\n\nSigned-off-by: Other <other@example.org>\n";
  assert.match(dcoProblem(commit({ message })), /not by its author/);
});

test("a sign-off matching the committer passes", () => {
  const message = "feat: x\n\nSigned-off-by: C <committer@example.org>\n";
  assert.equal(dcoProblem(commit({ message, committerEmail: "committer@example.org" })), null);
});

test("bot commits and merge commits are exempt", () => {
  const bot = commit({
    authorEmail: "49699333+dependabot[bot]@users.noreply.github.com",
    message: "chore(deps): bump x\n",
  });
  assert.equal(isBot(bot), true);
  assert.equal(dcoProblem(bot), null);
  assert.equal(dcoProblem(commit({ parents: 2, message: "Merge branch 'x'\n" })), null);
});

test("parseGitLog splits records and counts parents", () => {
  const record = (sha, parents, body) =>
    `${sha}\x00${parents}\x00a@x.org\x00c@x.org\x00${body}\x01`;
  const output = `${record("111", "000", "one\n")}\n${record("222", "111 000", "two\n")}\n${record("333", "", "root\n")}`;
  const commits = parseGitLog(output);
  assert.deepEqual(
    commits.map((c) => [c.sha, c.parents, c.message.trim()]),
    [
      ["111", 1, "one"],
      ["222", 2, "two"],
      ["333", 0, "root"],
    ],
  );
});
