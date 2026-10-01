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
2. 透過 `@homebridge/node-pty-prebuilt-multiarch` 啟動 Claude CLI PTY session
3. 等待 8 秒（讓 Claude CLI 完全載入）後，用 bracketed-paste escape sequence（`\x1b[200~` … `\x1b[201~`）將 `/<command> <params>` 貼入 PTY
4. 監控輸出——輸出靜止超過 `--idle` ms（預設 60 秒）或總時間超過 `--max` ms（預設 600 秒）後，對 PTY 送 SIGTERM

**關鍵計時常數：**
- `8000 ms` — 送出指令前的啟動等待時間
- `300 ms / 800 ms` — bracketed paste 後，分批送出換行與 return 的間隔
- `4000 ms` — 送出後檢查是否真的送出的輪詢間隔（`SUBMIT_CHECK_DELAY_MS`），最多重試 3 次（`SUBMIT_MAX_ATTEMPTS`）
- `1200 ms` — 確認送出成功後，開始監控 idle 前的額外等待

**送出確認與重試（僅限非 TTY / CI 模式）：**
- Claude Code 輸入框有文字時畫面會顯示 `ctrl+g to edit in VS Code` 提示，送出成功、輸入框清空後提示會消失——用這個訊號（`isSubmitPending` / `SUBMIT_HINT_RE`）判斷 Enter 有沒有生效，而不是假設送出一定成功
- 提示仍在代表沒送出，重送一次 Enter（`sendEnter`），最多重試 3 次；全部失敗則 `submitFailed = true` 並立即 `closeTerminal()`，process 以非 0 exit code（1）結束，不會誤報 `success`
- TTY 模式下 headless terminal buffer 不會同步更新（見 `shell.onData` 只在非 TTY 時寫入 `term`），無法判斷送出狀態，維持原本單次送出、不重試的行為

**自動關閉狀態機：**
- `shouldCloseAfterIdle` — 控制輸出資料是否重置 idle timer
- `didAutoClose` — 防止重複關閉；也確保自動關閉時 process 以 exit code 0 結束
- `submitFailed` — 送出重試用盡時設為 true，process 以 exit code 1 結束（優先於 `didAutoClose` 的 0）

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
