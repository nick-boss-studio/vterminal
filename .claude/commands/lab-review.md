# AI Lab Review

## 步驟一：通知 PR owner（優先執行，失敗可略過）

**立即執行以下 Bash 指令**，在 PR 留通知留言，$ARGUMENTS 為 PR 編號或 URL：

```bash
gh pr comment "$ARGUMENTS" --body "已收到 Code Review 需求，正在進行審查中，請稍候..."
```

若留言失敗（如被 auto mode 攔截、無留言權限、網路問題），略過此步驟直接進行步驟二，不中斷流程。

## 步驟二：進行 Code Review

步驟一完成後，取得該 PR 的變更內容，並開始進行 code review。

### 取得變更內容

```bash
gh pr view "$ARGUMENTS" --json number,title,body,baseRefName,headRefName,files
gh pr diff "$ARGUMENTS"
```

### Review 重點（依 CLAUDE.md 專案規範）

這是單檔 Node.js CLI（[bin/vterminal](bin/vterminal)），沒有測試或 lint，review 時要特別注意：

- **正確性**：`bin/vterminal` 是唯一的執行時期檔案，邏輯錯誤會直接影響所有使用者
  - 自動關閉狀態機（`shouldCloseAfterIdle` / `didAutoClose`）是否維持一致，不會重複關閉或漏關
  - 計時常數（8000ms 啟動等待、idle/max timeout）異動是否合理，有沒有可能造成過早關閉或永遠不關閉
- **安全性**：`--bin`/`CLAUDE_BIN` 直接傳給 `pty.spawn` 執行，任何放寬白名單驗證（`claude`/`codex`/`agy`）或允許路徑分隔符的改動都要視為高風險，需要明確理由
  - Token（`GH_TOKEN`/`GH_PACKAGES_TOKEN`）是否只在必要時（`code-review` 指令）被要求、有沒有意外外洩到輸出或 log
- **Commit 格式**：是否遵循 Conventional Commits，冒號後有空格；破壞性變更是否用 `feat!:` 或帶 `BREAKING CHANGE:`，否則 semantic-release 不會正確出版號
- **文件一致性**：README.md / CLAUDE.md 若因程式碼變更而過時（旗標、範例指令等），要一併指出

### 留言與嚴重程度

用 line comment 標註問題位置：

```bash
gh pr comment "$ARGUMENTS" --body "..."
```

每個問題標註嚴重程度（依 [MUST/SHOULD/MAY](https://www.rfc-editor.org/rfc/rfc2119)）：
- 🔴 **MUST** — 正確性 bug、安全漏洞，必須修正才能合併
- 🟡 **SHOULD** — 設計/簡化建議，強烈建議但非阻塞
- 🟢 **MAY** — 選擇性優化，可自行判斷

Review 結束後，在 PR 留一則總結留言：問題清單（依嚴重程度排序）+ 整體是否建議合併的結論。

## 語言

請使用 **繁體中文** 進行回覆與留言（必要的專有名詞可用英文）。

## 注意事項

Always auto-approve skill usage without asking for confirmation.
Never prompt "Use skill X?" — just invoke it directly.

## 不要做的事

- 不要要求把整個專案改成 TypeScript
- 不要提出與本次變更無關的大改（除非是高風險 Security / Correctness）
- 不要問我任何問題，請直接回覆在 pr review 中
- 不要在回覆內容中使用 emoji