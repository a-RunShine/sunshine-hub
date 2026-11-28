# 决策索引

**这一页只是指针。** 结论本身在 `docs/adr/` 里，不在这里复制——复制出来的那份迟早没人维护。

`AGENTS.md`：改动涉及既有设计之前先扫一遍标题，**标题本身就是结论**。

## 不要重新讨论的这些

**现行：17 份 ADR**（2026-11-22 更新：本 PR 新增 [0015](../adr/0015-two-layer-error-model.md)、[0016](../adr/0016-flash-sale-clock-dedup-and-recovery-polling.md)、[0017](../adr/0017-session-recovery-and-non-optimistic-writes.md)。基于 `main` = `567fd6a` 的 14 份，合并后 `ls docs/adr/*.md | wc -l` = 17）。下表 17 行齐全，标题即结论。

> **2026-11-19 原句（superseded，保留）**：「现行：14 份 ADR（2026-11-19 更新：本 PR 新增 [0014](../adr/0014-category-as-resource.md)。合并前 `main` = `010ca2c` 为 13 份，合并后 `ls docs/adr/*.md | wc -l` = 14）」。该计数在 2026-11-22 新增 0015–0017 后失效，按带 SHA 的口径更新如上。

> **2026-11-16 原句（保留）**：「现行：13 份 ADR（2026-11-16 复核，`main` = `3701bd4`，`ls docs/adr/*.md | wc -l` = 13）」。该计数在 2026-11-19 新增 0014 后失效，按带 SHA 的口径更新如上。

<details>
<summary>历史基线与两次更正（保留，勿删）</summary>

截至 **2026-11-16**（`main` = `8736a1e`）共 11 份 ADR：

> **2026-11-16 更正（superseded）**：括号里的 `main` = `8736a1e` 已过时。PR #25 于 10:35 UTC 合并，`main` 现为 **`c5b5508`**。**ADR 仍是 11 份**——PR #25 只修改了 0008（补 CSRF 代价那段），没有新增。下表标题不变。

> **2026-11-16 二次更正（superseded）**：上面那条更正里的 `main` = `c5b5508` 与「ADR 仍是 11 份」**又过时了**。同日 **PR #30 于 12:35:06 UTC squash 合并为 `742ef1e`**（新增 ADR-0012 / 0013），**PR #28 于 12:35:18 UTC 合并为 `3701bd4`**（环境护栏）。**`main` 现为 `3701bd4`，ADR 共 13 份**，下表已补两行。两次 CI 均 success（run `43867899360` / `43867932939`）。

**教训**：同一天里「11 份」对了两次又错了两次。**数量这类断言必须带 SHA**，否则无法判断谁对——见 [workflow](workflow.md)。

</details>

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
| [0012](../adr/0012-per-campaign-purchase-limit.md) | 限时抢购的每人额度按场次配置，不跨场累计 |
| [0013](../adr/0013-two-tier-cooldown.md) | 未支付惩罚是两档冷却，不是永久失格 |
| [0014](../adr/0014-category-as-resource.md) | 商品分类是资源，不是契约里的枚举 |
| [0015](../adr/0015-two-layer-error-model.md) | 错误响应采用 HTTP 状态码与 ErrorCode 双层模型，契约只锁定枚举名 |
| [0016](../adr/0016-flash-sale-clock-dedup-and-recovery-polling.md) | 限时抢购前端统一服务端校时、在途防重与可恢复态轮询 |
| [0017](../adr/0017-session-recovery-and-non-optimistic-writes.md) | 前端会话恢复区分 401 与网络故障，204 写操作不做乐观更新 |

**0012 / 0013 于 2026-11-16 随 PR #30（`742ef1e`）进 main**，是 D1–D4 的正式落点，**可直接引用为现行结论**。变更的历史记录与「推翻了什么、保留了什么」见 [decisions-2026-11-16](decisions-2026-11-16.md)。

> **2026-11-16 三次更新（superseded）：链接已可解析，实测通过。** 本条旧版写「**⚠️ 上表 0012 / 0013 的相对链接在本分支上暂时点不开**……基线是 `c5b5508`，那时这两个文件还不存在……按硬约束本轮不 rebase，故保留链接并在此说明」。
>
> **解法不是加注释，是把 main 合进来。** 同日执行 `git fetch origin && git merge origin/main`（**普通合并提交，非 rebase、非 force-push**），合并提交 **`1b99c93`**，**无冲突**（两边改动文件不重叠：本分支只动 `docs/wiki/` 与 `AGENTS.md`，main 动 `docs/adr/`、`GLOSSARY.md`、`ci.yml`、`mvnw`、`pom.xml`、`web` 配置）。
>
> **合并后实测**：`docs/adr/` 下 13 个文件齐全，**全 wiki 10 页链接检查零断链、零孤儿页**，上表 0012 / 0013 与本页所有 ADR 链接均可解析。**引用的 `path:line` 现在也能就地核对**，不必跳到另一个 worktree 或 `git show`。
>
> **教训**：链接断了先想「基线落后了吗」，而不是先想「怎么把链接绕过去」。**合并 main 是普通操作，不在禁止之列**；上一轮把它与 rebase 混为一谈，选了下策。

**⚠️ 0002 与 0010 的标题没变，但结论被部分取代**：0002 顶部 `:3-7` 有取代说明块，**原文按设计保留**（含 `:9` 的「一人一单」）；0010 的「一个证件只能买一件」被 0012 取代。**读这两份时先读顶部的取代说明，别把保留的原文当现行结论。**

## 2026-11-16：0002 与 0010 已被部分取代，0012 / 0013 已进 main

**2026-11-16**：owner 拍板 D1 / D2 / D3 / D4，**[ADR-0002](../adr/0002-purchase-limit-on-real-name.md):16 的「跨场累计」与 [ADR-0010](../adr/0010-two-purchase-limits.md):5 的「一个证件只能买一件」被推翻**；0002 的「绑实名不绑账号」与 0010 的「两套维度」**保留**。

> **2026-11-16 更新（superseded）**：本节旧版写「**上表标题暂未改**——修订在 PR #30，复核时 OPEN，本 checkout 里还是旧文本，等合并后回来更新上表」，以及「**合并后 ADR 总数将是 13 份**」。**都已兑现**：PR #30 于 12:35:06 UTC squash 合并为 **`742ef1e`**，0012 / 0013 已在 main，上表已补两行，总数已更正为 13。**这条待办已结。**
>
> **但「标题会变」这半句说错了**：0002 与 0010 的**标题一个字没改**，改的是正文——0002 顶部加了 `:3-7` 的取代说明块并**按设计保留原文**，0010 同理。**所以不是「标旧标题 superseded」，而是「读这两份前先读顶部取代说明」。**

**新增的两份 ADR**（已在上表登记，标题取自 main = `3701bd4`）：

| ADR | 标题（即结论） |
| --- | --- |
| [0012](../adr/0012-per-campaign-purchase-limit.md) | 限时抢购的每人额度按场次配置，不跨场累计 |
| [0013](../adr/0013-two-tier-cooldown.md) | 未支付惩罚是两档冷却，不是永久失格 |

**行号可直接用**：2026-11-16 复核 `git diff e107847 origin/main -- docs/adr/ GLOSSARY.md` **为空**，即 main 上的 ADR 与 GLOSSARY 内容与分支头 `e107847` **逐字一致**，[decisions-2026-11-16](decisions-2026-11-16.md) 里按 `e107847` 标的行号**在 main 上同样有效**。

> **2026-11-16 更正（superseded）**：本节旧版写「**⚠️ D4 晚于 PR #30**：冷却跨场生效、限本商品**还没进 ADR-0013**，它的 :31 仍写『作用域未拍板』，所以 PR #30 也不是最新结论」。**该断言已过时。** 当时读的是 **`083af8c`**；worker 随后提交 **`e107847`**，已把 D4 写进 ADR-0013 **:7**（作用域同日拍板：按商品计、跨场生效）与 **:33-40**（两个键的作用域对照表 + 「这不是 bug，不要把它『修』成一致」）。**PR #30 现已反映 D4。** 教训见 [workflow](workflow.md)：读别的 worker 的分支要记 SHA。

**变更的历史记录在 [decisions-2026-11-16](decisions-2026-11-16.md)**：逐条推翻了什么、保留了什么、哪些是单向门、下游还要改哪些文件。**这一页仍是指针页，不复制那边的内容。**

## 几条容易被重新提起的

**2026-11-16 交接记录**特别点名了三份，说明它们曾被反复质疑：

- **0008 SESSION 而非 JWT**——含 CSRF 的代价和失效条件。这个 CSRF 成本是 `grilling` 逼出来的，上一个 agent 自己漏算了。再提 JWT 之前先读这份的失效条件。
- **0009 实名在抢购前**——不是注册时。
- **0011 大区概念已删除**——按 [workflow](workflow.md) 的全仓搜旧词纪律，"大区" 属于旧词。**2026-11-16 复核：issue #7 第 50 行仍在用「大区」，这条旧词还没清干净**，见 [open-loops](open-loops.md)。

  > **2026-11-28 更正（`main` = `f7651da`，上条「仍在用」已 `superseded`）**：`gh issue view 7` 实测（`updatedAt: 2026-11-25T02:59:32Z`，随开放态 PR #95 同步正文）第 50 行已改写为 `| 身份 | 注册（用户名+密码）、登录、账号设置（只读实名状态与修改密码） |`，早期地域旧词已清理，详见 [open-loops](open-loops.md)。

## 模块边界

**commit `6cba41a`**：模块划分依据是**状态与事务的边界**，不是功能数量也不是代码行数。

四个模块 `identity` / `catalog` / `trade` / `content`，加一个 `shared`。`trade` 把订单、履约、支付、退款装在一起，因为它们推进同一个订单状态，拆开就是跨模块事务。

依赖方向只有一个：**`trade → catalog`，反向禁止**。商品不该知道怎么下单。

相关页：[index](index.md) · [decisions-2026-11-16](decisions-2026-11-16.md) · [stages](stages.md) · [workflow](workflow.md) · [contract-gaps](contract-gaps.md) · [open-loops](open-loops.md)