# Pull requests

PR 描述按固定模板写，三段：Summary、Evidence、Merge Danger。模板来自 `pr` skill，下面的例子换成了本项目的东西。

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
