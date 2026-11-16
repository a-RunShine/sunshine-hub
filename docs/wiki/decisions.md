# 决策索引

**这一页只是指针。** 结论本身在 `docs/adr/` 里，不在这里复制——复制出来的那份迟早没人维护。

`AGENTS.md`：改动涉及既有设计之前先扫一遍标题，**标题本身就是结论**。

## 不要重新讨论的这些

截至 **2026-11-16**（`main` = `8736a1e`）共 11 份 ADR：

> **2026-11-16 更正**：括号里的 `main` = `8736a1e` 已过时。PR #25 于 10:35 UTC 合并，`main` 现为 **`c5b5508`**。**ADR 仍是 11 份**——PR #25 只修改了 0008（补 CSRF 代价那段），没有新增。下表标题不变。

| ADR | 标题（即结论） |
| --- | --- |
| [0001](../adr/0001-claim-binds-collectible-number.md) | 抢占成功时就绑定收藏编号 |
| [0002](../adr/0002-purchase-limit-on-real-name.md) | 限购绑在实名主体上，不绑账号 |
| [0003](../adr/0003-repool-as-delayed-release.md) | 回流放在同一场 Campaign 里延迟释放，不另开场次 |
| [0004](../adr/0004-product-and-campaign-separated.md) | 商品和售卖方式拆成两层 |
| [0005](../adr/0005-order-and-fulfillment-separated.md) | 订单管钱，履约单管货 |
| [0006](../adr/0006-event-not-merged-into-campaign.md) | 运营活动是独立内容，不并入售卖活动 |
| [0007](../adr/0007-refund-per-fulfillment.md) | 退款按履约单走，运费不退，虚拟商品不接自助申请 |
| [0008](../adr/0008-session-over-jwt.md) | 会话存在 Redis 里，不用 JWT |
| [0009](../adr/0009-real-name-at-purchase.md) | 实名放在抢购之前，不放在注册 |
| [0010](../adr/0010-two-purchase-limits.md) | 限购有两套维度：抢购按实名，虚拟道具按账号 |
| [0011](../adr/0011-no-regional-stock.md) | 库存不按地域切分，需要削峰时用技术分片 |

## 几条容易被重新提起的

**2026-11-16 交接记录**特别点名了三份，说明它们曾被反复质疑：

- **0008 SESSION 而非 JWT**——含 CSRF 的代价和失效条件。这个 CSRF 成本是 `grilling` 逼出来的，上一个 agent 自己漏算了。再提 JWT 之前先读这份的失效条件。
- **0009 实名在抢购前**——不是注册时。
- **0011 大区概念已删除**——按 [workflow](workflow.md) 的全仓搜旧词纪律，"大区" 属于旧词。**2026-11-16 复核：issue #7 第 50 行仍在用「大区」，这条旧词还没清干净**，见 [open-loops](open-loops.md)。

## 模块边界

**commit `6cba41a`**：模块划分依据是**状态与事务的边界**，不是功能数量也不是代码行数。

四个模块 `identity` / `catalog` / `trade` / `content`，加一个 `shared`。`trade` 把订单、履约、支付、退款装在一起，因为它们推进同一个订单状态，拆开就是跨模块事务。

依赖方向只有一个：**`trade → catalog`，反向禁止**。商品不该知道怎么下单。

相关页：[index](index.md) · [stages](stages.md) · [workflow](workflow.md) · [contract-gaps](contract-gaps.md)