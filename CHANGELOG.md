## [2.2.5](https://github.com/nick-boss-studio/vterminal/compare/v2.2.4...v2.2.5) (2026-07-29)


### Bug Fixes

* 修正 PTY 輸出因 spinner 重繪與逐 chunk 寫出導致的雜訊 ([c90145c](https://github.com/nick-boss-studio/vterminal/commit/c90145c086a553961b08e9ca92cf944f148e5dfb))
* 優化 github 輸出 ([eba2842](https://github.com/nick-boss-studio/vterminal/commit/eba28420e5ac206bd43341f028a9ab3475662ef9))

## [2.2.4](https://github.com/nick-boss-studio/vterminal/compare/v2.2.3...v2.2.4) (2026-07-28)


### Bug Fixes

* 修正安裝後找不到 lib/github-actions-output 模組 ([#10](https://github.com/nick-boss-studio/vterminal/issues/10)) ([4f2af5b](https://github.com/nick-boss-studio/vterminal/commit/4f2af5b389ca01547c7494fdb9ba63f6d715ee99))

## [2.2.3](https://github.com/nick-boss-studio/vterminal/compare/v2.2.2...v2.2.3) (2026-07-28)


### Bug Fixes

* 優化 github 輸出 ([53dd0fb](https://github.com/nick-boss-studio/vterminal/commit/53dd0fba6cda7dbd7a1a9c3039e7e2eab9185613))

## [2.2.2](https://github.com/nick-boss-studio/vterminal/compare/v2.2.1...v2.2.2) (2026-07-20)


### Bug Fixes

* rename ([e813a05](https://github.com/nick-boss-studio/vterminal/commit/e813a05b68ca3ef1b3e28d113eab586521681956))

## [2.2.1](https://github.com/nick-boss-studio/vterminal/compare/v2.2.0...v2.2.1) (2026-07-17)


### Bug Fixes

* avoid heredoc-built PR comment bodies in lab-review ([#6](https://github.com/nick-boss-studio/vterminal/issues/6)) ([571d17b](https://github.com/nick-boss-studio/vterminal/commit/571d17b5284c904073e8bd6f1dee09e483683449))

# [2.2.0](https://github.com/nick-boss-studio/vterminal/compare/v2.1.0...v2.2.0) (2026-07-17)


### Features

* add AI Lab Review workflow and /lab-review command ([#5](https://github.com/nick-boss-studio/vterminal/issues/5)) ([5a3bc90](https://github.com/nick-boss-studio/vterminal/commit/5a3bc9015f2e42139aca37f37c7c29a506309f5e))

# [2.1.0](https://github.com/nick-boss-studio/vterminal/compare/v2.0.0...v2.1.0) (2026-07-17)


### Features

* add AI coding workflow and /coding command ([#3](https://github.com/nick-boss-studio/vterminal/issues/3)) ([a524faa](https://github.com/nick-boss-studio/vterminal/commit/a524faa4ec350a06ec235cc7ab071869542e08b0))

# [2.0.0](https://github.com/nick-boss-studio/vterminal/compare/v1.0.0...v2.0.0) (2026-07-17)


* feat!: restrict --bin whitelist and rename package to vterminal ([#1](https://github.com/nick-boss-studio/vterminal/issues/1)) ([9633cb6](https://github.com/nick-boss-studio/vterminal/commit/9633cb64870ec91897bd83e2bb08347bfaed79b3))


### Bug Fixes

* change default responseMaxMs value ([aa160aa](https://github.com/nick-boss-studio/vterminal/commit/aa160aa7b3cb8bfee43057301b75429dbcf84184))


### Features

* add AI coding workflow and /coding command ([#2](https://github.com/nick-boss-studio/vterminal/issues/2)) ([be75670](https://github.com/nick-boss-studio/vterminal/commit/be75670e3dcc15e2520e670d8676b2c85238886a))
* add version option ([9eaf39c](https://github.com/nick-boss-studio/vterminal/commit/9eaf39c21460298857cb965b87cf584be8b7657a))


### BREAKING CHANGES

* --claude flag is renamed to --bin. --bin/CLAUDE_BIN
now only accepts claude, codex, or agy (no path separators), since
this value is passed straight to pty.spawn and could otherwise be
used to execute an arbitrary binary when vclaude is invoked by
automation with untrusted arguments.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

* feat!: rename package/CLI from vclaude to vterminal
* npm package name and CLI command renamed from
vclaude to vterminal. This reflects that the tool now drives
multiple AI CLIs (claude/codex/agy) via PTY, not only Claude.
The GitHub repo itself is unchanged, so install URLs still point
to NickChen14/vclaude.git.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

* docs: update install URLs to new vterminal repo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

## [1.1.3](https://github.com/NickChen14/vclaude/compare/v1.1.2...v1.1.3) (2026-06-17)


### Bug Fixes

* --ai ([9342aff](https://github.com/NickChen14/vclaude/commit/9342aff50a5f4eb89ae5b12192379b5e006d1fdd))

## [1.1.2](https://github.com/NickChen14/vclaude/compare/v1.1.1...v1.1.2) (2026-06-17)


### Bug Fixes

* action 裡看乾淨的純文字輸出 ([2aadee5](https://github.com/NickChen14/vclaude/commit/2aadee5694320bfc11c649a565494d38a619e249))

## [1.1.1](https://github.com/NickChen14/vclaude/compare/v1.1.0...v1.1.1) (2026-06-11)


### Bug Fixes

* change default responseMaxMs value ([aa160aa](https://github.com/NickChen14/vclaude/commit/aa160aa7b3cb8bfee43057301b75429dbcf84184))

# [1.1.0](https://github.com/NickChen14/vclaude/compare/v1.0.0...v1.1.0) (2026-06-10)


### Features

* add version option ([9eaf39c](https://github.com/NickChen14/vclaude/commit/9eaf39c21460298857cb965b87cf584be8b7657a))

# 1.0.0 (2026-06-10)


### Features

* add simplify command support ([9ce0058](https://github.com/NickChen14/vclaude/commit/9ce00582f90aa9a98dc50b24cefeb8ad81bf9691))
