const test = require("node:test");
const assert = require("node:assert/strict");
const { stripAnsi, formatForGitHubActions } = require("../lib/github-actions-output");

test("stripAnsi removes cursor and alternate-screen escape sequences", () => {
  const input = "hello\x1b[?25l\x1b[<u\x1b(B\x1b[?4mworld\x1b[0m";
  assert.equal(stripAnsi(input), "helloworld");
});

test("formatForGitHubActions preserves plain text outside GitHub Actions", () => {
  const input = "plain output";
  assert.equal(formatForGitHubActions(input), "plain output");
});
