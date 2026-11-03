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

test("stripAnsi collapses same-line carriage-return redraws to the last frame", () => {
  const spinnerFrames = "*thinking\r4thinking\rstill thinking\r\n";
  assert.equal(stripAnsi(spinnerFrames), "still thinking\n");
});

test("stripAnsi keeps normal CRLF line breaks intact", () => {
  const input = "line1\r\nline2\r\n";
  assert.equal(stripAnsi(input), "line1\nline2\n");
});

test("formatForGitHubActions with preserveAnsi keeps deliberately injected color codes", () => {
  const input = "\x1b[90mgray text\x1b[0m";
  assert.equal(formatForGitHubActions(input, { preserveAnsi: true }), input);
});

test("formatForGitHubActions escapes lines that look like workflow commands", () => {
  const previous = process.env.GITHUB_ACTIONS;
  process.env.GITHUB_ACTIONS = "true";
  try {
    assert.equal(
      formatForGitHubActions("ok\n  ::add-mask::x", { preserveAnsi: true }),
      "ok\n\u200b  ::add-mask::x"
    );
    assert.equal(
      formatForGitHubActions("::stop-commands::t", { kind: "error" }),
      "::error::\u200b::stop-commands::t"
    );
  } finally {
    if (previous === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previous;
  }
});
