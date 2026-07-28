const fs = require("node:fs");

function stripAnsi(text = "") {
  return String(text)
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\r/g, "");
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

  if (options.stream === "stderr") {
    process.stderr.write(`${rendered}\n`);
  } else {
    process.stdout.write(`${rendered}\n`);
  }

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
