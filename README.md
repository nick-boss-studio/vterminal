# vterminal

透過 PTY 啟動 AI CLI（claude／codex／agy），自動執行任意 skill 或 slash command，待回應輸出靜止後自動關閉 session。

## 安裝

**前置需求：**
- Node.js >= 22
- [Claude Code CLI](https://claude.ai/code) 已安裝並完成登入
- SSH key 已加入 GitHub（[說明](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)）

```bash
npm install -g git+ssh://git@github.com/nick-boss-studio/vterminal.git
```

更新到最新版：

```bash
npm install -g github:nick-boss-studio/vterminal
```

安裝指定版本：

```bash
npm install -g git+ssh://git@github.com/nick-boss-studio/vterminal.git#v1.0.0
```

沒有 SSH 的話，改用 HTTPS token：

```bash
npm install -g "https://GITHUB_TOKEN@github.com/nick-boss-studio/vterminal.git"
```

## 使用方式

```
vterminal <command> [params]
```

| 參數 | 說明 |
|------|------|
| `command` | Skill 或 slash command 名稱（不含開頭的 `/`） |
| `params` | 傳遞給該 command 的參數（選填） |

## 範例

```bash
# Code review 一個 PR（需要 GH_TOKEN）
vterminal code-review https://github.com/owner/repo/pull/42

# 使用 ultra 模式 review 指定 PR 編號
vterminal code-review ultra 123

# 執行 run skill
vterminal run

# 執行 simplify skill
vterminal simplify
```

## 選項

| 旗標 | 說明 | 預設值 |
|------|------|--------|
| `-t, --token` | GitHub token（或設定 `GH_TOKEN` 環境變數） | — |
| `--idle` | 回應靜止多久後自動關閉（ms） | `60000` |
| `--max` | 最長等待時間（ms），`0` 表示不限制 | `600000` |
| `--bin` | CLI 執行檔名稱（透過 PATH 解析），僅允許 `claude`／`codex`／`agy` | `claude` |
| `-h, --help` | 顯示說明 | — |
| `-v, --version` | 顯示版本號 | — |

## 環境變數

| 變數 | 說明 |
|------|------|
| `GH_TOKEN` | GitHub Personal Access Token（`code-review` 時必填） |
| `GH_PACKAGES_TOKEN` | 備用 GitHub token |
| `CLAUDE_BIN` | CLI 執行檔名稱（透過 PATH 解析），同 `--bin` |
| `RESPONSE_IDLE_MS` | 同 `--idle` |
| `RESPONSE_MAX_MS` | 同 `--max` |

## 自動關閉機制

vterminal 在送出指令後會監控輸出，當輸出靜止超過 `--idle` 設定的時間時自動關閉 session。若整體時間超過 `--max`，也會強制關閉。

## 開發與發版

本專案使用 [semantic-release](https://semantic-release.gitbook.io) 自動管理版本，commit 訊息請遵循 [Conventional Commits](https://www.conventionalcommits.org) 格式。**冒號後必須有空格**，否則不會觸發版本更新。

```
feat: 新功能    → minor（1.x.0）
fix: 修正       → patch（1.0.x）
feat!: 破壞性   → major（x.0.0）
chore:/docs:/refactor: 等 → 不出版本
```

推送到 `main` branch 後，GitHub Actions 會自動：
1. 分析 commit 決定新版本號
2. 更新 `CHANGELOG.md` 與 `package.json`
3. 建立 GitHub Release

所需 secret：`NICK_BOSS_STUDIO_TOKEN`（org admin 的 Personal Access Token）。因為 `main` 有 branch ruleset 要求變更需透過 PR，而 ruleset 只允許 `OrganizationAdmin` 身分繞過，預設的 `GITHUB_TOKEN`（`github-actions[bot]`）不符合條件，semantic-release 直接 push 版本號到 `main` 會被拒絕，需改用具備 org admin 權限的 PAT 才能通過。

## License

MIT

<!-- AI workflow v3 驗證用測試變更，PR 不會 merge -->
