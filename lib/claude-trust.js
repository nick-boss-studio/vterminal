const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

/**
 * Claude Code 在同一個目錄第一次啟動時會跳出 folder-trust 對話框，等待互動式確認。
 * vterminal 透過 PTY 貼上指令是無人值守流程，貼上的文字會落在對話框上而不是
 * prompt，導致該次執行空跑，或卡到 --max timeout 才被強制關閉。
 *
 * Claude Code 把每個專案目錄的信任狀態記錄在 ~/.claude.json 的
 * projects["<絕對路徑>"].hasTrustDialogAccepted。啟動前直接把這個欄位設成
 * true，讓對話框根本不會出現，比在 PTY 輸出裡偵測對話框文字再回應更可靠。
 *
 * @param {string} cwd 即將啟動 claude 的工作目錄（絕對路徑）
 * @param {{ configPath?: string }} [options] configPath 供測試注入，預設 ~/.claude.json
 * @returns {boolean} 是否實際寫入了設定檔（已信任過則回傳 false，不做任何事）
 */
function ensureClaudeFolderTrusted(cwd, { configPath } = {}) {
  const resolvedConfigPath = configPath || path.join(os.homedir(), ".claude.json");

  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(resolvedConfigPath, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      // 設定檔存在但解析失敗：不要整份蓋掉，放棄預先信任，讓 Claude Code 自己處理對話框。
      return false;
    }
  }

  if (config.projects?.[cwd]?.hasTrustDialogAccepted) return false;

  config.projects = config.projects || {};
  config.projects[cwd] = { ...config.projects[cwd], hasTrustDialogAccepted: true };
  fs.writeFileSync(resolvedConfigPath, JSON.stringify(config, null, 2));
  return true;
}

module.exports = { ensureClaudeFolderTrusted };
