const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const VTERMINAL = path.join(__dirname, "..", "bin", "vterminal");

// 假的 AI CLI：行為由 FAKE_CLI_MODE 決定，模擬 Claude CLI 在 PTY 裡的幾種結果。
// - respond：輸出執行中標記 ⏺ 與收到的 argv，之後保持存活直到被 SIGTERM
// - plain：只輸出收到的 argv（沒有 ⏺），之後保持存活
// - hang：只顯示輸入框，永遠不開始回應
// - exit：顯示信任資料夾對話框後直接退出（exit code 0）
const FAKE_CLI = `#!/usr/bin/env node
const mode = process.env.FAKE_CLI_MODE;
const args = JSON.stringify(process.argv.slice(2));
if (mode === "respond") {
  process.stdout.write("⏺ ARGS " + args + "\\r\\n");
} else if (mode === "plain") {
  process.stdout.write("ARGS " + args + "\\r\\n");
} else if (mode === "hang") {
  process.stdout.write("❯ \\r\\n");
} else if (mode === "exit") {
  process.stdout.write("Is this a project you trust?\\r\\n");
  process.exit(0);
}
setInterval(() => {}, 1000);
`;

function createFakeBinDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vterminal-test-"));
  for (const name of ["claude", "codex"]) {
    const file = path.join(dir, name);
    fs.writeFileSync(file, FAKE_CLI);
    fs.chmodSync(file, 0o755);
  }
  return dir;
}

function runVterminal(args, { mode, env = {} }) {
  const binDir = createFakeBinDir();
  const childEnv = {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    FAKE_CLI_MODE: mode,
    ...env
  };
  delete childEnv.GITHUB_ACTIONS;
  delete childEnv.CLAUDE_BIN;

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VTERMINAL, ...args], {
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => {
      fs.rmSync(binDir, { recursive: true, force: true });
      resolve({ code, output });
    });
  });
}

test("passes the slash command to the CLI as a single initial prompt argument", async () => {
  const params = "https://github.com/o/r/pull/1?a=1&b=$HOME 'quoted'";
  const { code, output } = await runVterminal(["lab-review", params, "--idle", "500"], {
    mode: "respond"
  });
  assert.equal(code, 0, output);
  assert.ok(
    output.includes(`⏺ ARGS ${JSON.stringify([`/lab-review ${params}`])}`),
    output
  );
  assert.match(output, /\[start\] response started/);
  assert.match(output, /\[auto-close\] idle timeout reached \(500ms\)/);
});

test("exits 1 when the CLI exits before the response starts", async () => {
  const { code, output } = await runVterminal(["lab-review", "--idle", "500"], {
    mode: "exit"
  });
  assert.equal(code, 1, output);
  assert.match(output, /\[start\] response never started/);
});

test("exits 1 when the response does not start within the start timeout", async () => {
  const { code, output } = await runVterminal(["lab-review", "--idle", "500"], {
    mode: "hang",
    env: { RESPONSE_START_TIMEOUT_MS: "1500" }
  });
  assert.equal(code, 1, output);
  assert.match(output, /\[start\] response never started/);
  assert.doesNotMatch(output, /\[auto-close\] waiting for idle/);
});

test("non-claude CLIs are treated as started without an execution marker", async () => {
  const { code, output } = await runVterminal(
    ["simplify", "--bin", "codex", "--idle", "500"],
    { mode: "plain" }
  );
  assert.equal(code, 0, output);
  assert.ok(output.includes(`ARGS ${JSON.stringify(["/simplify"])}`), output);
  assert.doesNotMatch(output, /\[start\]/);
});
