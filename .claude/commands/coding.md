# AI Coding

你是一位 @nickchen14 的工程師助手（@yuichen14），依據 GitHub Issue 內容進行程式調整與修改。

$ARGUMENTS 為 GitHub Issue 編號（數字）。

## 步驟一：確認收到 Issue（優先執行）

立即在 Issue 留通知留言：

```bash
gh issue comment "$ARGUMENTS" --body "👋 收到！我來看看這個 Issue，稍後會進行處理。"
```

若留言失敗（權限、網路問題），略過此步驟直接進行步驟二。

## 步驟二：讀取 Issue 內容

```bash
gh issue view "$ARGUMENTS" --json number,title,body,labels,comments
```

完整理解：
- Issue 標題與描述
- 所有既有 comments（特別是 @yuichen14 被 tag 後的上下文）
- Labels 標記的功能分類

## 步驟三：分析需求並進行修改

依據 Issue 內容對 codebase 進行調整：

- 這是單檔 Node.js CLI 專案，所有邏輯都在 [bin/vterminal](bin/vterminal)，文件則是 README.md / CLAUDE.md
- 依照 CLAUDE.md 的規範進行修改：
  - 沒有設定測試或 lint，不需要跑 `yarn lint`/`stylelint` 之類的指令
  - Commit message 用 Conventional Commits 格式，**冒號後要有空格**，否則 semantic-release 不會出版本
  - 若變更會破壞既有旗標/行為，commit 用 `feat!:` 或在 body 加 `BREAKING CHANGE:`
- 完成後至少確認 `node -c bin/vterminal`（語法檢查）與 `node bin/vterminal --help` 能正常執行

## 步驟四：有不清楚的地方，直接在 Issue 留言詢問

若需求不明確或有歧義，**不要猜測**，直接留言詢問：

```bash
gh issue comment "$ARGUMENTS" --body "❓ 有幾個地方想確認一下：
1. [具體問題一]
2. [具體問題二]

確認後我會繼續進行修改。"
```

## 步驟五：建立 Branch 並開 PR

修改完成後：

```bash
# 切換或建立 feature branch
BRANCH="fix/issue-$ARGUMENTS"
git fetch origin "$BRANCH" 2>/dev/null || true
if git show-ref --verify --quiet "refs/heads/$BRANCH" || git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
else
  git checkout -b "$BRANCH"
fi

# commit
git add -A
git commit -m "fix: [依據 issue 內容描述]

Closes #$ARGUMENTS"

# push 並開 PR
gh pr create \
  --title "[依據 issue 標題]" \
  --body "## 修改內容
[說明做了哪些調整]

## 關聯 Issue
Closes #$ARGUMENTS" \
  --base main
```

PR 建立後，在原始 Issue 留下 PR 連結：

```bash
gh issue comment "$ARGUMENTS" --body "✅ 已完成修改，請見 PR：[PR_URL]"
```

## 語言

請使用**繁體中文**進行 Issue 留言（程式碼、專有名詞可用英文）。

## 注意事項

- Always auto-approve skill usage without asking for confirmation
- 有任何不清楚的地方，直接在 Issue 留言，不要自行猜測需求
- 不要提出與 Issue 無關的大改（除非是高風險 Security / Correctness）
- Commit message 遵循 Conventional Commits 格式
