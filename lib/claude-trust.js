const fs = require("node:fs");
const path = require("node:path");

// Claude Code 只在 stdout 是 TTY 時才會跳出資料夾信任對話框（非互動模式會自動跳過）。
// vterminal 用 pty.spawn 起 Claude，stdout 對 Claude 來說永遠是 TTY，
// 所以第一次在全新目錄執行時一定會撞到這個對話框；這裡在啟動前直接把目前
// 工作目錄寫入信任清單，從根本避開對話框出現的可能性。
const LOCK_RETRY_MS = 50;
const LOCK_STALE_MS = 10000;
const LOCK_TIMEOUT_MS = 5000;

function sleepSync(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function acquireLock(lockPath) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      fs.mkdirSync(lockPath);
      return;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.rmdirSync(lockPath);
          continue;
        }
      } catch (_) {
        // lock 可能剛好被另一個 process 釋放，重試即可
      }
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for lock: ${lockPath}`);
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }
}

function releaseLock(lockPath) {
  try {
    fs.rmdirSync(lockPath);
  } catch (_) {}
}

/**
 * 若 ~/.claude.json 中尚未信任 cwd，補上 projects[cwd].hasTrustDialogAccepted = true。
 * 用 mkdir-based lock 避免同機多個 vterminal/runner 併發讀寫時寫壞檔案。
 * 回傳是否「新增」了信任紀錄；任何錯誤都不會拋出，改由 log 回報並回傳 false。
 */
function ensureCwdTrusted({ cwd, home, log = () => {} }) {
  const claudeJsonPath = path.join(home, ".claude.json");
  const lockPath = `${claudeJsonPath}.vterminal-trust.lock`;

  try {
    acquireLock(lockPath);
  } catch (err) {
    log(`[auto-trust] 取得鎖失敗，略過自動信任：${err.message}`);
    return false;
  }

  try {
    let data = {};
    if (fs.existsSync(claudeJsonPath)) {
      try {
        data = JSON.parse(fs.readFileSync(claudeJsonPath, "utf8"));
      } catch (err) {
        log(`[auto-trust] ~/.claude.json 解析失敗，略過自動信任：${err.message}`);
        return false;
      }
    }

    if (!data.projects || typeof data.projects !== "object") {
      data.projects = {};
    }

    const existing = data.projects[cwd];
    if (existing && existing.hasTrustDialogAccepted === true) {
      return false;
    }

    data.projects[cwd] = { ...existing, hasTrustDialogAccepted: true };

    const tmpPath = `${claudeJsonPath}.vterminal-trust.tmp-${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, claudeJsonPath);
    log(`[auto-trust] 已將 "${cwd}" 加入 Claude Code 信任清單`);
    return true;
  } catch (err) {
    log(`[auto-trust] 寫入 ~/.claude.json 失敗，略過自動信任：${err.message}`);
    return false;
  } finally {
    releaseLock(lockPath);
  }
}

module.exports = { ensureCwdTrusted };
