# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 指令

```bash
npm install          # 安裝相依套件（包含 node-pty 原生編譯）
npm run release      # 手動觸發 semantic-release（正常情況由 CI 執行）
```

沒有設定測試或 lint。唯一的執行時期檔案是 `bin/vterminal`。

## 架構

這是一個單檔 Node.js CLI，發布為 `vterminal` npm binary，所有邏輯都在 [bin/vterminal](bin/vterminal)。

**運作流程：**

1. 解析 CLI 參數：`positionals[0]` = command 名稱，`positionals.slice(1)` = 參數
2. 透過 `@homebridge/node-pty-prebuilt-multiarch` 啟動 Claude CLI PTY session，並把 `/<command> <params>` 直接當成初始 prompt 參數傳入（等同 `claude "/<command> <params>"`），由 CLI 自己在 TUI 就緒後送出
3. 偵測回應是否開始（見下方「回應啟動偵測」），開始後才進入 idle 監控
4. 輸出靜止超過 `--idle` ms（預設 60 秒）或總時間超過 `--max` ms（預設 600 秒）後，對 PTY 送 SIGTERM

**為什麼不用貼上 + Enter：** 舊做法是固定等 8 秒後用 bracketed paste 貼入指令再送 Enter，但 TUI 不一定已就緒，貼上內容或 Enter 會被延遲／吃掉，指令卡在輸入框直到 idle 逾時被當成 success。改成初始 prompt 參數後由 CLI 負責送出，沒有時序競爭。參數以陣列傳給 `pty.spawn`，不經 shell，不需跳脫。

**回應啟動偵測（`hasResponseStarted`，僅 `--bin claude`）：**
- 每 `RESPONSE_START_POLL_MS`（1000 ms）掃描 headless terminal 尚未 flush 的即時區段（`flushedRow` 之後），出現 `⏺`（執行中標記）或忙碌狀態列（`STATUS_LINE_RE`）即視為回應已開始，呼叫 `closeWhenResponseIsIdle()`
- 超過 `RESPONSE_START_TIMEOUT_MS`（120000 ms）仍未開始 → 關閉 terminal
- CLI 提早退出也算未開始。例如目錄未被信任時會跳出信任對話框，而帶初始 prompt 時預設選項是「No, exit」
- 未開始就結束時，log 印出 `[start] response never started ...`（GitHub Actions `::error::` annotation），process 以 exit code `1` 結束
- codex/agy 沒有可靠的畫面特徵，spawn 後直接視為已開始
- TTY 模式下 PTY 輸出也會寫入 headless terminal（但不 flush 印出），偵測才讀得到畫面

**自動關閉狀態機：**
- `shouldCloseAfterIdle` — 控制輸出資料是否重置 idle timer
- `didAutoClose` — 防止重複關閉；一般情況下也確保自動關閉時 process 以 exit code 0 結束
- `responseStarted` — 優先於 `didAutoClose`：回應沒開始就結束，無論如何關閉都以 exit code 1 結束

**Token 處理：** `GH_TOKEN` / `GH_PACKAGES_TOKEN` 會轉入 PTY 環境變數。只有 `command === "code-review"` 時才強制要求 token。

## 發版

合併到 `main` 會觸發 [.github/workflows/release.yml](.github/workflows/release.yml)，執行 semantic-release，自動更新 `package.json`、寫入 `CHANGELOG.md`、建立 GitHub Release。不發布到 npm。

**`NICK_BOSS_STUDIO_TOKEN` secret：** `main` 設有 branch ruleset，要求變更需透過 PR，且只允許 `OrganizationAdmin` 身分繞過。預設的 `GITHUB_TOKEN`（`github-actions[bot]`）不符合此條件，semantic-release 直接 push 版本號到 `main` 會被 GH013 拒絕。因此 `actions/checkout` 的 `token` 與 `npx semantic-release` 的 `GITHUB_TOKEN` env 都改用 `secrets.NICK_BOSS_STUDIO_TOKEN`（org admin 的 PAT）—— 前者決定 `git push` 的認證身分，後者供 `@semantic-release/github` 呼叫 API，兩處都要換才會生效。

### Commit 格式（Conventional Commits）

**冒號後必須有空格**，否則 semantic-release 不會識別，不會出版本。

```
feat: 新功能描述        → minor 版（1.x.0）
fix: 修正描述           → patch 版（1.0.x）
feat!: 破壞性變更       → major 版（x.0.0）
chore: 雜項             → 不出版本
docs: 文件更新          → 不出版本
refactor: 重構          → 不出版本
```

`BREAKING CHANGE:` 也可以寫在 commit body，同樣觸發 major。
