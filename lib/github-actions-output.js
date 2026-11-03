const fs = require("node:fs");

function collapseCarriageReturns(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const segments = line.split("\r");
      return segments[segments.length - 1];
    })
    .join("\n");
}

function stripAnsi(text = "") {
  const withoutEscapes = String(text)
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b[@-_]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[PX^_].*?\x1b\\/g, "")
    .replace(/\x1b/g, "")
    .replace(/\x08/g, "");
  return collapseCarriageReturns(withoutEscapes);
}

function isGitHubActions() {
  return process.env.GITHUB_ACTIONS === "true";
}

// GitHub Actions runner 會把「去掉前導空白後以 :: 開頭」的行當成 workflow
// command（::add-mask::、::stop-commands:: 等）。輸出內容可能夾帶外部輸入，
// 在這類行首插入 zero-width space（runner 不會當成空白去掉），讓它只是一般文字。
// JS 的 m 旗標也把 \r 視為行尾，與 runner 的斷行方式一致。
function escapeWorkflowCommands(text) {
  return text.replace(/^(?=[ \t]*::)/gm, "\u200b");
}

function formatForGitHubActions(text, options = {}) {
  const cleaned = (options.preserveAnsi ? String(text) : stripAnsi(text)).trimEnd();
  if (!cleaned) return "";

  if (!isGitHubActions()) {
    return cleaned;
  }

  const escaped = escapeWorkflowCommands(cleaned);

  const kind = options.kind || "output";
  if (kind === "warning") return `::warning::${escaped}`;
  if (kind === "error") return `::error::${escaped}`;
  if (kind === "notice") return `::notice::${escaped}`;
  return escaped;
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
