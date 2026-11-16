# 2026-11-16 决策变更：限购额度与失格冷却

**这一页是历史记录，不是指针页。** ADR 的标题索引在 [decisions](decisions.md)；这里记的是**2026-11-16 owner 拍板的三条变更**，以及每条**推翻了什么、保留了什么、代价是不是单向门**。

**2026-11-16**：owner 拍板 D1 / D2 / D3。ADR 与 GLOSSARY 的修订、issue #2 的同步**已派给另一个会话**，在 worktree `../sunshine-hub-decisions`、分支 `docs/limit-cooldown-decisions`（复核时该 worktree 位于 `c5b5508`）。**本层只记录，不碰 `docs/adr/`、`GLOSSARY.md`、`api/openapi.yaml` 与任何 issue。**

行号基准：ADR 与 GLOSSARY 指 `c5b5508` 的工作树；issue 行号指 `gh issue view <n> --json body -q .body` 的正文行号。

相关页：[index](index.md) · [decisions](decisions.md) · [contract-gaps](contract-gaps.md) · [issue-3-review](issue-3-review.md) · [open-loops](open-loops.md) · [workflow](workflow.md)

## D1：限时抢购每人限购可配置，且每场独立额度

**决策**：发布活动时运营选「本场每人最多几件」，**可以 2 件以上**。额度按 Campaign 独立，**不跨场累计**。判定主体仍是实名。

### 推翻了什么（逐条）

| 位置 | 原文要点 | 状态 |
| --- | --- | --- |
| [ADR-0002](../adr/0002-purchase-limit-on-real-name.md):16 | 「限购键挂 `productId` 而不是 `campaignId`……额度按商品累计。**首发抢过的人，回流场不该再有资格**」 | **推翻** |
| [ADR-0010](../adr/0010-two-purchase-limits.md):5 | 「限购必须绑在实名上，**一个证件只能买一件**，跨账号累计」 | **推翻「只能买一件」这半句** |
| #2:194 | 「限购键挂 `productId` 而不是 `campaignId`，因为额度属于商品……要累计」 | **推翻** |
| #2:187 | Redis 键 `limit:{productId}:{realNameHash}` | **推翻，键名要改** |
| #2:402 第三个测试用例 | 「同一商品跨两场 Campaign 累计，抢过首发的人在回流场被拒」 | **推翻，这条断言现在反了** |
| `GLOSSARY.md`:92 | Purchase Limit 定义「一个 Purchaser 在**一个 Product** 上最多能拿几件，**跨 Campaign 累计**」 | **推翻，术语定义要重写** |

### 保留了什么

- **[ADR-0002](../adr/0002-purchase-limit-on-real-name.md) 的主结论「绑实名不绑账号」保留**，:14「实名指纹是限购 Redis 键的组成部分，跨账号的限购状态天然共享」也保留。**换的是键的 scope（product → campaign），不是判定主体。**
- **[ADR-0010](../adr/0010-two-purchase-limits.md) 的「两套维度」保留**：抢购按实名（:5 前半）、虚拟道具按账号（:7）。**D1 只动抢购那一套的数量与 scope，不动「两套并存」这个结构。**
- [ADR-0010](../adr/0010-two-purchase-limits.md):16 的 `limit_flag` + MySQL 多行 NULL 技巧**思路保留、机制必须换**——见下方 P0-9。

### 与 ADR-0003 相容，反黄牛能力保住一部分

[ADR-0003](../adr/0003-repool-as-delayed-release.md):3 定的是「超时关掉的配额延迟 30 分钟放回**同一场** Campaign，不另开场次」。

**所以回流不产生新额度**——它还在同一个 `campaignId` 下，限购键不变。**只有运营另开一场，才重新给额度。** 这条相容性是 D1 能成立的关键：如果回流另开场次，D1 就等于给黄牛开了一条零成本重置额度的路。

### 已知代价（owner 知情选择）

**黄牛可以每场都买满。** 跨场累计原本是挡这个的，D1 主动放弃了这一层。owner 知情后仍选择 D1。

**wiki 的分析（不是 owner 结论）**：放弃跨场累计之后，**跨场 `total_limit` 守恒成了唯一剩下的刹车**——运营另开一场就能重置限购，那么「商品总共只能卖 N 件」就必须靠 #3 P0-2 那条守恒挡住。**P0-2 的严重度因此可能上升，不是下降**，见 [issue-3-review](issue-3-review.md)。

### 单向门：改 Redis 键名

**`limit:{productId}:{realNameHash}` → 按 `campaignId` 挂，是单向门。**

理由：键名一旦上线并写入数据，旧键里的额度标记不会自动迁移。回退到旧键名意味着**已经按新键卖出的额度在旧键里不存在**，同一个人可以再买一遍。要双向可逆就得写迁移脚本 + 双写窗口，那不是「改个名」的成本。

**具体新键名 owner 没给字面串**，只说「按 `campaignId` 挂」。`limit:{campaignId}:{realNameHash}` 是 wiki 的推断写法，**以 decisions worker 落进 ADR 的那份为准**。

### 连带必须换的机制：#3 P0-9

[ADR-0010](../adr/0010-two-purchase-limits.md):16 与 #2:177 的 `UNIQUE KEY uk_purchase (purchaser_hash, product_id, limit_flag)` **表达力上限就是 1 件**：同一人同一商品只能存在一行。D1 允许 N>1，**这个索引机制必须换**（#3 P0-9 的改法是允许同一人多行、靠 `SUM(quantity)` + 行锁/乐观锁校验累计）。

**D1 把 P0-9 从「审查发现的缺陷」变成「已触发、必须修」。** 见 [issue-3-review](issue-3-review.md)。

## D2：取消永久失格，改为两档冷却

**决策**：

| 档 | 触发 | 恢复 |
| --- | --- | --- |
| 轻 | 不足 3 次未支付 | 最后一次关闭后 **24h 自动恢复**（**不变**） |
| 重 | 满 3 次未支付 | **7 天冷却，到期自动恢复**（**新**） |

### 推翻了什么

- **#2:196 后半句**「同一实名 24 小时内累计 3 次未支付，**本商品永久失格**」——**推翻**，永久档取消。
- **[ADR-0002](../adr/0002-purchase-limit-on-real-name.md):5 的「需要客服申诉通道」这个代价不再成立**——因为两档都可逆，**不需要人工解封入口**。

### 保留了什么

- 24h 那一档原样保留。
- 「关闭时不删限购键、改为累加 `miss` 计数」这条反黄牛机制保留（#2:196 前半）——它挡的是「锁一单、放弃、再锁一单」的零成本探测。
- #2:402 第四个测试用例「同一实名累计 3 次未支付后第 4 次被拒」**仍然成立**，只是第 4 次被拒的**时长**从永久变成 7 天。

### 更正：代价不是「消失」，是「从不可逆变有界」

> **2026-11-16 更正（范围 superseded）**：派活时的表述是「因为可逆，ADR-0002:5 的代价消失」。**这句说满了。** [ADR-0002](../adr/0002-purchase-limit-on-real-name.md):5 的代价有两层：(a) 系统要存实名指纹；(b) **一家人共用一张证件的合法用户会被拦下来**。
>
> D2 消掉的是「**误伤不可恢复**」，所以申诉通道不再是必需品。但**共用证件的误伤本身仍然发生**，只是被限制在 24h / 7 天之内。(a) 存指纹的成本也一分没少。
>
> 准确说法：**代价从「不可逆的误伤」降级为「有界的误伤」**，不是消失。写 ADR 时别把 :5 整段删掉。

## D3：第五个按钮禁用态 = 失格 / 冷却

**决策**：确认 [contract-gaps](contract-gaps.md) 推导的第五态。**未实名与未登录不是禁用态**——[ADR-0009](../adr/0009-real-name-at-purchase.md):3 要求点击后弹表单、填完自动继续原来的抢购动作，禁用掉这条路径就断了。

五态权威清单至此成立：**未开售 / 已结束 / 售罄 / 已购或额度用尽 / 失格冷却**。逐态数据来源见 [contract-gaps](contract-gaps.md)。

**落地要新增错误码**，且必须同时改 `ErrorCode.java` 与契约枚举，否则 `ErrorCodeContractTest` 红——见 [guardrails](guardrails.md)。

## 单向门 / 双向门汇总

| 改动 | 门 | 理由 |
| --- | --- | --- |
| Redis 限购键改挂 `campaignId` | **单向门** | 旧键数据不迁移，回退等于额度清零重卖 |
| `uk_purchase` 唯一索引换机制 | **单向门** | 索引变更要迁移 `t_order_item`；旧索引下已写入的行在新机制语义下要重新解释 |
| 永久失格 → 7 天冷却 | **双向门** | 放宽限制，回退只需改 TTL 与文案；已被永久失格的用户在旧规则下本来就没有恢复路径，回退不会让他们更差 |
| `CampaignDetail` 加 `remainingQuota` | **双向门** | 新增可空字段，老客户端忽略即可 |
| 每场限购件数可配置 | **双向门** | 配置项，调回 1 即恢复旧行为 |

## 下游修订清单（属 decisions worker，本层不动）

| 目标 | 位置 | 要改什么 |
| --- | --- | --- |
| ADR-0002 | :16 | 跨场累计 → 每场独立；:5 按上面「更正」条改写，不要整段删 |
| ADR-0010 | :5、:16 | 「只能买一件」→ 可配置 N；唯一索引机制换掉 |
| ADR-0003 | — | **无需改**，D1 与它相容；但值得在 :13 附近点明「回流不产生新额度」 |
| `GLOSSARY.md` | :91-93 | Purchase Limit 定义重写（scope 从 Product 变 Campaign，去掉「跨 Campaign 累计」）；`_Avoid_` 是否收「一人一单」要重判 |
| issue #2 | :187、:188、:194、:196、:177、:402 | 键名、失格规则、索引、测试用例 |
| issue #7 | 第 50 行 | 「大区」旧词，**与本轮决策无关但仍未清**，见 [open-loops](open-loops.md) |

**按 [workflow](workflow.md) 的纪律**：删改领域概念要全仓搜旧词。「跨场累计」「一人一单」「永久失格」都是本轮的旧词，范围含模型图、表结构、Redis 键、用户故事、issue。**改 issue 正文必须把 before/after 贴进 PR 正文**，否则评审看不到——PR #25 就是这么漏掉 #7 第 50 行的。

## 本次没拍、仍未定的

**2026-11-16**，这几条 D1/D2 没覆盖，**不要当成已定**：

1. **`miss:{productId}:{realNameHash}`（#2:188）是否也跟着挂 `campaignId`？** D1 只说限购键。失格计数的 scope 未定——按商品累计还是按场累计，直接影响「换一场能不能洗掉冷却」。
2. **7 天冷却到期后 `miss` 计数是否清零？** 不清零则下次一犯就又是 7 天；清零则等于每 7 天送一次机会。
3. **#2:196 的「24 小时内累计」计数窗口是否保留？** 重档变 7 天之后，24h 滑动窗口与 7 天冷却的关系要重述。#3 P0-7 已指出 `miss` 用 string 做不了滑动窗口。
4. **`CampaignDetail` 的拆分方式**（`oneOf` + `discriminator` vs 其他）——[contract-gaps](contract-gaps.md) 缺口 3 的改法仍是提案，未拍。
5. **#3 P0-2 的重新评估结论**——见 [issue-3-review](issue-3-review.md)。

前四条记在 [open-loops](open-loops.md)。