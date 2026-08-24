const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ensureClaudeFolderTrusted } = require("../lib/claude-trust");

function tempConfigPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vterminal-test-")), ".claude.json");
}

test("ensureClaudeFolderTrusted creates the config file and trusts a new cwd", () => {
  const configPath = tempConfigPath();
  const cwd = "/work/some-repo";

  const changed = ensureClaudeFolderTrusted(cwd, { configPath });

  assert.equal(changed, true);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(config.projects[cwd].hasTrustDialogAccepted, true);
});

test("ensureClaudeFolderTrusted preserves existing project fields and other projects", () => {
  const configPath = tempConfigPath();
  const cwd = "/work/some-repo";
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      projects: {
        "/work/other-repo": { hasTrustDialogAccepted: true },
        [cwd]: { allowedTools: ["Bash"], hasTrustDialogAccepted: false }
      }
    })
  );

  ensureClaudeFolderTrusted(cwd, { configPath });

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(config.projects[cwd].hasTrustDialogAccepted, true);
  assert.deepEqual(config.projects[cwd].allowedTools, ["Bash"]);
  assert.equal(config.projects["/work/other-repo"].hasTrustDialogAccepted, true);
});

test("ensureClaudeFolderTrusted is a no-op when already trusted", () => {
  const configPath = tempConfigPath();
  const cwd = "/work/some-repo";
  fs.writeFileSync(configPath, JSON.stringify({ projects: { [cwd]: { hasTrustDialogAccepted: true } } }));
  const mtimeBefore = fs.statSync(configPath).mtimeMs;

  const changed = ensureClaudeFolderTrusted(cwd, { configPath });

  assert.equal(changed, false);
  assert.equal(fs.statSync(configPath).mtimeMs, mtimeBefore);
});

test("ensureClaudeFolderTrusted leaves a corrupt config file untouched", () => {
  const configPath = tempConfigPath();
  fs.writeFileSync(configPath, "{not json");

  const changed = ensureClaudeFolderTrusted("/work/some-repo", { configPath });

  assert.equal(changed, false);
  assert.equal(fs.readFileSync(configPath, "utf8"), "{not json");
});
