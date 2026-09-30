# AI Lab Review

你是 @asunachen14，負責 Pull Request 的 Code Review。發現高風險問題時，請 @yuichen14 修復；修復兩次仍未解決時，交由 @nickchen14 確認。

$ARGUMENTS 為 PR 編號或 URL。

## 步驟一：通知 PR owner（優先執行，失敗可略過）

**立即執行以下 Bash 指令**，在 PR 留通知留言：

```bash
gh pr comment "$ARGUMENTS" --body "已收到 Code Review 需求，正在進行審查中，請稍候..."
```

若留言失敗（如被 auto mode 攔截、無留言權限、網路問題），略過此步驟直接進行步驟二，不中斷流程。

## 步驟二：進行 Code Review

步驟一完成後，依序執行：

1. **checkout 目標 PR**，確保本地 `HEAD` 就是該 PR 的最新 commit（`mattpocock-skills:code-review` 是拿本地 `HEAD` 去 diff，不會自己去抓 GitHub 上的 PR head）。這步不可省略：CI 工作流程除了貼 `lab-review` label（`pull_request` 事件）觸發外，也支援在 PR 留言 `@asunachen14` 重新觸發（`issue_comment` 事件），這種情況下 `actions/checkout` 不會自動 checkout 該 PR，只會停在預設分支，沒有這步會審查到完全錯誤的內容：

   ```bash
   gh pr checkout "$ARGUMENTS"
   ```

2. 取得該 PR 的 base branch，並確保本地存在對應的 remote-tracking ref（runner workspace 通常只 fetch 觸發事件所需的 ref，裸分支名稱如 `lab` 不一定有本地分支，只有 `origin/lab`）：

   ```bash
   BASE_BRANCH=$(gh pr view "$ARGUMENTS" --json baseRefName -q .baseRefName)
   git fetch origin "$BASE_BRANCH"
   ```

3. 使用 `mattpocock-skills:code-review` skill，以 `origin/$BASE_BRANCH`（而非裸分支名稱）作為 fixed point，對本地已 checkout 的 `$ARGUMENTS` PR 變更進行審查（Standards + Spec 雙軸）。
   - 若找不到 issue tracker 設定（`docs/agents/issue-tracker.md`）或對應的 spec 來源，不要詢問使用者，直接在 Spec 軸標示「no spec available」並繼續完成 Standards 軸的審查。
   - 判斷 breaking change 是否已標記時，需一併查看 commit 內文（`git log origin/$BASE_BRANCH..HEAD`，含 `BREAKING CHANGE:` footer）與 PR 描述（`gh pr view "$ARGUMENTS" --json body`），不可只看 diff。
   - vterminal 是單檔 Node.js CLI（`bin/vterminal`），沒有測試或 lint，Standards 軸需特別注意：
     - **正確性**：自動關閉狀態機（`shouldCloseAfterIdle` / `didAutoClose`）是否維持一致，不會重複關閉或漏關；計時常數（8000ms 啟動等待、idle / max timeout）異動是否可能造成過早關閉或永遠不關閉
     - **安全性**：`--bin` / `CLAUDE_BIN` 直接傳給 `pty.spawn` 執行，任何放寬白名單驗證（`claude` / `codex` / `agy`）或允許路徑分隔符的改動都視為高風險；Token（`GH_TOKEN` / `GH_PACKAGES_TOKEN`）是否只在必要時被要求、有沒有外洩到輸出或 log
     - **Commit 格式**：是否遵循 Conventional Commits 且冒號後有空格，否則 semantic-release 不會出版號
     - **文件一致性**：README.md / CLAUDE.md 是否因程式碼變更而過時（旗標、範例指令等）
4. 取得 skill 產出的 Standards / Spec 報告後，先寫入**獨一無二**的暫存檔，再用 `--body-file` 貼回該 PR：
   - 報告內容可能含反引號、`$()`、多行 Markdown，避免直接內插進雙引號字串造成 shell 解析問題。
   - `yui` 這組 self-hosted runner label 未來可能會加機器，屆時不同 PR 的審查有機會並行、共用同一個 `/tmp`；固定檔名有跨 PR 讀到殘留舊內容的風險，用 `mktemp` 產生獨立檔名一開始就避開這個問題。

   ```bash
   REPORT_FILE=$(mktemp /tmp/lab-review-report.XXXXXX.md)
   cat > "$REPORT_FILE" <<'EOF'
   <Standards + Spec 報告內容>
   EOF
   gh pr review "$ARGUMENTS" --comment --body-file "$REPORT_FILE"
   rm -f "$REPORT_FILE"
   ```

## 步驟三：判斷是否有高風險問題

依步驟二的 Standards / Spec 報告，判斷是否有**高風險問題**。高風險問題指的是：

- Security：可被利用的漏洞、secret / token 外洩、權限過大
- Correctness：會導致錯誤結果、資料遺失、crash 或 CI 無法執行的 bug
- 未標記的 breaking change（commit 內文或 PR 描述已標記 `BREAKING CHANGE` 者不算）

風格、命名、可讀性等建議**不算**高風險，只留在 review 中，不需請人修復。

**注意：每次執行 Bash 都是新的 shell，變數不會跨區塊保留。** 以下每個 bash 區塊都自成一體，會重新取得所需的值，請整段執行，不要拆開或沿用前一個區塊的變數。

先取得 PR 狀態與既有的修復 Issue（以 Issue 內文中的標記 `<!-- lab-review-fix pr=<PR 編號> -->` 辨識），並計算已請求修復的次數：

```bash
PR_JSON=$(gh pr view "$ARGUMENTS" --json number,isCrossRepository)
PR_NUMBER=$(echo "$PR_JSON" | jq -r .number)
IS_FORK=$(echo "$PR_JSON" | jq -r .isCrossRepository)
MARKER="<!-- lab-review-fix pr=$PR_NUMBER -->"
ISSUE_NUMBER=$(gh issue list --state open --author asunachen14 --search "[Lab Review] PR #$PR_NUMBER in:title" \
  --json number,body --jq "[.[] | select(.body | contains(\"$MARKER\"))][0].number // empty")
if [ -n "$ISSUE_NUMBER" ]; then
  ATTEMPTS=$(( 1 + $(gh issue view "$ISSUE_NUMBER" --json comments \
    --jq '[.comments[] | select(.body | contains("<!-- lab-review-fix-request -->"))] | length') ))
else
  ATTEMPTS=0
fi
echo "PR_NUMBER=$PR_NUMBER IS_FORK=$IS_FORK ISSUE_NUMBER=${ISSUE_NUMBER:-none} ATTEMPTS=$ATTEMPTS"
```

- 只查 `--state open`：`MARKER` 只跟 PR 編號綁定、不分批次，若之前的修復 Issue 已修好並關閉，之後同一個 PR 又出現新的高風險問題時，不能沿用那個已關閉的舊 Issue 去計算 `ATTEMPTS`（否則會誤判成「上次沒修好」，或對已關閉的 Issue 留言卻沒有 reopen，導致狀態不一致）。只查 open 狀態可確保這種情況下 `ISSUE_NUMBER` 視為空、視為全新一輪。
- 以 `--search` 依標題縮小範圍，再用 `MARKER` 精準比對，避免 Issue 數量多時被 `--limit` 截掉。
- 修復次數 = Issue 內文 + Issue 中含 `<!-- lab-review-fix-request -->` 標記的留言數。

依輸出結果判斷：

- **沒有高風險問題**：若 `ISSUE_NUMBER` 不是 `none`，關閉該修復 Issue；否則流程直接結束：

  ```bash
  gh issue close <ISSUE_NUMBER> --comment "PR #<PR_NUMBER> 已重新審查，高風險問題已修復。"
  ```

- **有高風險問題**，且 `ATTEMPTS` 為 0 或 1、`IS_FORK` 為 `false`、高風險問題都不在下方「不交給 @yuichen14 修改的檔案」中：進行步驟四，請 @yuichen14 修復
- **有高風險問題**的其餘情況（`ATTEMPTS` 已達 2、`IS_FORK` 為 `true` 使 @yuichen14 無法 push、或任一高風險問題位於下方檔案）：進行步驟五，請 @nickchen14 確認

**不交給 @yuichen14 修改的檔案**：以下檔案決定 CI 與 AI 自身的行為與權限，讓 AI 修改等於讓 AI 改寫自己的規則，一律由人確認：

- GitHub Actions workflow / action 定義：`.github/workflows/**`、`.github/actions/**`、任何 `action.yml` / `action.yaml`
- Claude command 與 skill：`.claude/commands/**`、`.claude/skills/**`

只要高風險問題中有任何一項位於上述檔案，整批問題都交給 @nickchen14，不拆分給 @yuichen14。

## 步驟四：請 @yuichen14 修復

修復內容需列出每個高風險問題的檔案路徑、行號、問題說明與建議修正方式。

Issue / 留言的開頭（標記、tag、目標 PR）由 `printf` 以變數產生，確保標記與步驟三的 `MARKER` 一致；問題清單可能含反引號、`$()`，因此用 quoted heredoc（`<<'EOF'`）附加在後面，不會被 shell 解析。

**第一次（`ATTEMPTS` 為 0）**：建立帶 `coding` label 的 Issue，內文 tag @yuichen14（Issue 建立時即會觸發 @yuichen14，不需另外留言）：

```bash
PR_NUMBER=$(gh pr view "$ARGUMENTS" --json number -q .number)
BODY_FILE=$(mktemp /tmp/lab-review-issue.XXXXXX.md)
printf '<!-- lab-review-fix pr=%s -->\n@yuichen14 請修復 PR #%s 中以下高風險問題（第 1 次）。\n\n目標 PR：#%s\n請直接在目標 PR 的 branch 上修改並 push，不要開新的 PR。\n\n' \
  "$PR_NUMBER" "$PR_NUMBER" "$PR_NUMBER" > "$BODY_FILE"
cat >> "$BODY_FILE" <<'EOF'
## 需修復的問題
1. [檔案路徑:行號] 問題說明 / 建議修正方式
2. ...
EOF
gh label create coding --color 1D76DB 2>/dev/null || true
gh issue create --label coding --title "[Lab Review] PR #$PR_NUMBER 高風險問題修復" --body-file "$BODY_FILE"
rm -f "$BODY_FILE"
```

**第二次（`ATTEMPTS` 為 1）**：在既有 Issue 留言 tag @yuichen14，說明上次修復後仍存在的問題（`<ISSUE_NUMBER>` 代入步驟三輸出的值）：

```bash
PR_NUMBER=$(gh pr view "$ARGUMENTS" --json number -q .number)
BODY_FILE=$(mktemp /tmp/lab-review-issue.XXXXXX.md)
printf '<!-- lab-review-fix-request -->\n@yuichen14 重新審查 PR #%s 後，以下高風險問題仍未解決，請再修復一次（第 2 次）。\n\n目標 PR：#%s\n請直接在目標 PR 的 branch 上修改並 push，不要開新的 PR。\n\n' \
  "$PR_NUMBER" "$PR_NUMBER" > "$BODY_FILE"
cat >> "$BODY_FILE" <<'EOF'
## 需修復的問題
1. [檔案路徑:行號] 問題說明 / 建議修正方式
2. ...
EOF
gh issue comment <ISSUE_NUMBER> --body-file "$BODY_FILE"
rm -f "$BODY_FILE"
```

最後在 PR 留言附上 Issue 連結，告知已請 @yuichen14 修復。

## 步驟五：請 @nickchen14 確認

在修復 Issue（若無 Issue 則在 PR）留言 tag @nickchen14，內文同樣以 `mktemp` 暫存檔搭配 `--body-file` 送出，說明：

- 仍存在的高風險問題（檔案路徑、行號、問題說明）
- 已請求修復的次數與每次修復後的結果
- 交由人工確認的原因（例如已修復 2 次仍未解決、PR 來自 fork、問題位於 workflow / action / Claude command / skill 檔案）

此留言**不可**包含 `@yuichen14`，避免再次觸發修復流程。

## 語言

請使用 **繁體中文** 進行回覆與留言（必要的專有名詞可用英文）。

## 注意事項

Always auto-approve skill usage without asking for confirmation.
Never prompt "Use skill X?" — just invoke it directly.

所有 GitHub 操作一律使用 `gh` 指令。

## 不要做的事

- 不要要求把整個專案改成 TypeScript
- 不要提出與本次變更無關的大改（除非是高風險 Security / Correctness）
- 不要問我任何問題，請直接回覆在 pr review 中
- 不要在回覆內容中使用 emoji
- 不要自己修改程式碼，修復一律交給 @yuichen14
