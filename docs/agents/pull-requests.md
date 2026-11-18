# Pull requests

PR 描述按固定模板写，三段：Summary、Evidence、Merge Danger。模板来自 `pr` skill，下面的例子换成了本项目的东西。

## 流程

main 受分支保护，所有改动走 PR。直接 push main 会被规则拦下。

1. 从 main 建分支，命名 `<type>/<短描述>`，type 与 commit message 一致
2. 提交后 push 到同名远端分支
3. 开 PR，正文按下面的模板写
4. **停下，等仓库所有者对这张 PR 明确同意**
5. 同意之后才合并：squash，合并后删分支

第 4 步不能跳过。分支保护里的审批数是 0，技术上任何 agent 都能自己合，所以这条只靠纪律。合之前问一句，不丢人。

**打标签不等于合并授权。** 代理可以自行给 issue 或 PR 打仓库已有标签（`needs-triage`、`ready-for-agent`、`docs` 等），但不要新增未约定的标签。标签、review 通过、CI 全绿都只是状态信息，不是同意。只有 owner 针对该 PR 的明确同意，才能执行第 5 步；不得把“可以打标签”读成“可以合并”。

**push / 改正文前先查状态。** 每次 `git push` 到 PR 分支、或 `gh pr edit` 改 PR 正文之前，先跑 `scripts/pr-preflight.sh <pr-number>` 确认 PR 仍 OPEN。PR 是共享状态，owner 随时可能已经合并；合并后继续 push 的提交不会进 main。

```bash
git checkout -b docs/example
git commit -m "docs: ..."
git push -u origin docs/example
gh pr create --title "docs: ..." --body-file /tmp/pr-body.md
# 到这里停，等回复
gh pr merge --squash --delete-branch   # 得到明确同意后才执行
```

分支名用不用中文都行，但不要用空格和斜杠以外的符号。

## Summary

用最小的视图说清这次改了什么。树、调用链、状态机、diff，挑一个就够，别都上。

本项目的常见选择：

**改了模块结构**，给浅文件树

```text
trade/
├── TradeFacade.java      # 对外入口
├── api/                  # 请求响应
└── internal/             # 实现，外部不可见
```

**改了状态流转**，给状态图或状态 diff

```diff
 PENDING_PAYMENT ──> PAID
+      │
+      └──超时──> CLOSED
```

**改了接口**，给请求响应的 diff

```diff
 POST /api/orders
-  { "skuId": 1, "count": 1 }
+  { "items": [{ "skuId": 1, "count": 1 }], "addressId": 2 }
```

**改了前端组件**，给组件树

```text
<FlashSalePage>
  useCampaignDetail()
  <CountdownBar>
  <ClaimButton>
```

## Evidence

必须给 before 和 after 的对照，不能只写"已测试"。

视觉改动用截图，两张，标清改前改后。这是最强的证据。

行为改动贴测试输出，指明哪条从红变绿：

```text
FlashSaleConcurrencyTest
  before: expected 100, actual 103
  after:  expected 100, actual 100
```

性能改动给数字，注明压测条件：

```text
wrk -t4 -c200 -d30s
  before: 1240 req/s, P99 890ms
  after:  3100 req/s, P99 142ms
```

## Merge Danger

**Door**：单向门还是双向门。

能靠 `git revert` 干净回滚的是双向门。动了数据、改了接口契约、删了别人在用的东西，是单向门。

本项目里典型的分界：

| 双向门 | 单向门 |
|---|---|
| 加接口、加字段 | 改已有接口的响应结构 |
| 改内部实现 | 改表结构且没有回滚脚本 |
| 调阈值、改配置 | 删除枚举值 |
| 加页面 | 改 Redis 键名 |

单向门要在 PR 里写清回滚代价，不能只标一个"one-way"。

**Blast Radius**：影响范围的词，一个就够。

`single-module`、`api-contract`、`all-clients`、`db-schema`、`cache-keys`。

## 其他约定

标题用 `<type>: <一句话>`，type 和 commit message 一致：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`。

关联 issue 在正文末尾写 `Closes #N`，合并时 GitHub 自动关闭。

一个 PR 只做一件事。顺手改的格式、重命名、依赖升级，单独提一个。混在一起，reviewer 的视线会被几百行缩进变化淹掉。
