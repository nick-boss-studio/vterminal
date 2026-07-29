const fs = require("node:fs");

function stripAnsi(text = "") {
  return String(text)
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b[@-_]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[PX^_].*?\x1b\\/g, "")
    .replace(/\u001b/g, "")
    .replace(/\r/g, "")
    .replace(/\x08/g, "");
}

function isGitHubActions() {
  return process.env.GITHUB_ACTIONS === "true";
}

function formatForGitHubActions(text, options = {}) {
  const cleaned = stripAnsi(text).trimEnd();
  if (!cleaned) return "";

  if (!isGitHubActions()) {
    return cleaned;
  }

  const kind = options.kind || "output";
  if (kind === "warning") return `::warning::${cleaned}`;
  if (kind === "error") return `::error::${cleaned}`;
  if (kind === "notice") return `::notice::${cleaned}`;
  return cleaned;
}

function writeGitHubActionsOutput(text, options = {}) {
  const rendered = formatForGitHubActions(text, options);
  if (!rendered) return;

  const target = options.stream === "stderr" ? process.stderr : process.stdout;
  const normalized = rendered.endsWith("\n") ? rendered : `${rendered}\n`;
  target.write(normalized);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath && options.summary) {
    try {
      fs.appendFileSync(summaryPath, `${rendered}\n`);
    } catch (_) {}
  }
}

function writeGitHubActionsGroup(title) {
  if (!isGitHubActions()) return;
  process.stdout.write(`::group::${title}\n`);
}

function endGitHubActionsGroup() {
  if (!isGitHubActions()) return;
  process.stdout.write("::endgroup::\n");
}

module.exports = {
  stripAnsi,
  formatForGitHubActions,
  writeGitHubActionsOutput,
  writeGitHubActionsGroup,
  endGitHubActionsGroup
};
