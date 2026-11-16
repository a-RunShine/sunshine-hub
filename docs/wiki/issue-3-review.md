# issue #3 审查报告：重叠与过时

**2026-11-16 复核**，对象是 **issue #3「文档与决策审查：P0 九处模型硬伤，P1 十处规格缺口」**（`needs-triage` + `docs`，仍 OPEN）。

**这一页不搬运 #3 正文。** #3 自己是权威来源，用 `gh issue view 3` 读。这里只记 wiki 需要的三件事：**九条 P0 一句话是什么**、**哪些与 [contract-gaps](contract-gaps.md) 是同一件事**、**#3 自己哪几处已经过时**。

相关页：[index](index.md) · [contract-gaps](contract-gaps.md) · [open-loops](open-loops.md) · [stages](stages.md) · [decisions](decisions.md)

## 为什么现在要读它

**2026-11-16**：owner 拍板先补契约再开阶段 1。补契约时发现**两处改不动**——限购字段该是 boolean 还是数字、失格态怎么表达——答案都在 #3 的 P0-7 与 P0-9 里。

[open-loops](open-loops.md) 旧版记的是「本次侦察没有逐条核实那九处，只确认了 issue 状态与标签」。**2026-11-16 已逐条读过，那条限定已被本页取代。**

## 九条 P0（一句话版，详情读 #3）

| # | 一句话 | 与抢购页契约的关系 |
| --- | --- | --- |
| **P0-1** | `sku.stock` / `allocation.total` / `product.total_limit` 三个真相源无换算关系，同一 Sku 可被双路径并发售卖 | **相邻不重叠** |
| **P0-2** | `total_limit` 只做单场校验，首发 5000 + 回流 5000 各自合法、商品卖出 10000 | **相邻不重叠** |
| **P0-3** | Redis 是扣减真相源但没有重建路径，重启/淘汰后 `stock` 与 `pool` 从哪来无定义 | **相邻不重叠** |
| **P0-4** | 折扣价取 `sku.price` 还是 `campaign.discount_price` 全篇无落点 | **无关** |
| **P0-5** | 订单状态机缺 `CLOSED → REFUNDED` 出边，与 ADR-0007 的全额退款规则打架 | **无关** |
| **P0-6** | 混合订单里虚拟履约单永不可退，数学上到不了 `REFUNDED` | **无关** |
| **P0-7** | `limit:{productId}:{hash}` 被要求同时永久存在与 24h 过期；「永久失格」两个键都存不下；`miss` 用 string 做不了滑动窗口 | **强重叠** |
| **P0-8** | `t_unit` 只有 `owner_purchaser_hash`，没有 `owner_account_id`，`/me/items` 按账号查不出来 | **无关** |
| **P0-9** | `uk_purchase (purchaser_hash, product_id, limit_flag)` 的表达力上限是 1 件，与 `purchase_limit` 的数字语义不匹配 | **强重叠** |

## 强重叠：同一件事，不要修两次

### P0-7 ＝ 第五个禁用态

**2026-11-16 判定**：[contract-gaps](contract-gaps.md) 推导出的第五态「失格 / 冷却」，**就是 P0-7 后半句「永久失格无处安放」**。同一个缺口，两个入口发现。

- 契约侧的症状：`ErrorCode` 枚举（`api/openapi.yaml:1085-1112`）没有失格码，Lua（#2:209）只查 `EXISTS limitKey`，失格用户拿到 `-1 已购`、文案「这件商品你已经买过了」（`ErrorCode.java:29`）——他没付过钱。
- 模型侧的病因：P0-7 说的键生存期矛盾。**键设计不定，错误码就定不下来**——分不清「已购」与「失格」是因为两者共用一个键。

**所以顺序是：先 triage P0-7 → 定键结构 → 再定错误码与契约字段。** 反过来做会先把一个表达错的字段写进契约，然后返工。

P0-7 建议拆 `rate` / `miss`(ZSET) / `ban` 三个键。**wiki 不背书这个方案**，只记录它是 #3 的提案，待 owner 拍。相关: [ADR-0002](../adr/0002-purchase-limit-on-real-name.md):5 已否掉客服申诉通道，所以 `ban` 的人工解封入口是否进首版是个真问题（见 [contract-gaps](contract-gaps.md) 拍板问题 4）。

### P0-9 决定限购字段的类型

**2026-11-16 判定**：缺口 2 要新增的字段，**类型由 P0-9 决定，不是由前端偏好决定**。

- P0-9 成立（索引只能表达 1 件）→ FLASH 实际恒为 1 件 → `purchased: [boolean,'null']` 够用。
- P0-9 按 #3 的改法修掉（允许同一人多行、靠 `SUM(quantity)` 校验）→ `purchase_limit > 1` 成为可能 → **必须用 `remainingQuota: [integer,'null']`**，boolean 会表达错。

**先拍 P0-9，再写 schema。** 这条已记进 [open-loops](open-loops.md) 的阻塞项。

## 相邻但不重叠：别合并成一个 ticket

| #3 条目 | 契约缺口 | 为什么是两件事 |
| --- | --- | --- |
| **P0-3** Redis 无重建 | 缺口 1 `UNIT_POOL_INCONSISTENT` 无 5xx 出口 | 重建缺失**正是**编号池不同步的成因，但契约出口可以先补——补出口不依赖重建方案定稿。另：#3 的 **P2-1**（Lua 把键缺失合并成 `-2 售罄`，与 `-3` 要告警的原则自相矛盾）是**脚本语义**问题，也不是契约出口问题 |
| **P0-1 / P0-2** 库存守恒 | 缺口 3 `allocation` 非必填 | 那两条是**数量对不对**，缺口 3 是**schema 必不必填**。守恒没定也能先把 `oneOf` 拆出来 |
| **P1-7** `t_reserve` 无唯一索引 | 缺口 4 匿名 `reserved` 语义 | 那影响 `reserved` 的**正确性**，缺口 4 影响它的**可空语义** |

## 无关：不在抢购页链路上

**P0-4**（定价）、**P0-5 / P0-6**（订单状态机两条边）、**P0-8**（`t_unit` 归属）落在**下单、支付、退款、道具库**，不在抢购页。

它们仍然是 P0，仍然该修——但**不构成「先补契约」的前置**。把它们混进契约 ticket 会让那个 ticket 无限膨胀。

## #3 自己已经过时的地方（2026-11-16 复核）

**读 #3 时要带着这几条更正读，否则会照着已修的东西再修一遍。**

| #3 的位置 | 旧断言 | 复核结果 |
| --- | --- | --- |
| **审查范围**（正文第 5 行）、优点 1 | 范围是 `docs/adr/0001`–`0007`，「7 篇 ADR 里 6 篇有 Considered Options」 | **superseded**：现在是 **11 份**（见 [decisions](decisions.md)）。**0008–0011 从未被 #3 审查过**——会话/CSRF、实名后置、限购两维度、无地域库存这四条决策不在它的覆盖面里 |
| **P3-2** + 优点 4 | 「AGENTS.md 说 spec 存 Issues，但源文件在仓库」；「spec 在 issue 里做单向镜像，逐字 diff 完全一致」 | **方向反了**：`docs/specs/` 已在 commit `54c42a6`（PR #8）移出仓库。现在 **AGENTS.md 是对的**，而 **#2 正文第 1 行的「规格源文件」链接是死链**。镜像无从比对 |
| **P1-3** | 「接口契约只有路径，没有字段定义」，与 `ready-for-agent` 冲突 | **已解决**：阶段 0（`8736a1e` / PR #19）产出 `api/openapi.yaml`，31 个 schema（见 [stages](stages.md) 的更正条）。**但语义缺口仍在**——正是 [contract-gaps](contract-gaps.md) 那五处 |
| **P3-13** | 「两张模型图都没画 `Unit`」 | **已修**：`docs/images/model-order-fulfillment.svg` 现有 `Unit 物件 / 限量商品的唯一实例` 节点。同条附带的 `stroke="context-stroke"` 渲染兼容性问题**未复核** |

**仍然成立的**（2026-11-16 抽查）：P3-1（#2 正文第 9 行仍写「状态：草案」而标签是 `ready-for-agent`）、P3-3（11 份 ADR 都没有 `Status` / `Date` / `Superseded by`）、P3-4（ADR-0003 确实没有 `Considered Options` 小节）、P3-8（仓库仍无 `README.md`）、P3-5（`module:*` 标签仍一个都没建，见 [stages](stages.md)）。

## 给 triage 的建议顺序

**2026-11-16 建议，不是结论**：

1. **P0-7 + P0-9** —— 它们阻塞契约修复，是「先补契约」这条路径的真实前置。
2. **P0-1 / P0-2 / P0-3** —— #3 自己也把这三条排第一（「不解决，抢购链路的任何实现都是沙上建塔」）。它们阻塞**阶段 2**，不阻塞契约。
3. **P0-4 / P0-5 / P0-6 / P0-8** —— 阻塞下单与退款实现，按模块边界拆 ticket 时再处理。
4. **过时四条** —— triage 时直接在 #3 上标注，别让下一个 agent 照着已修的再修一遍。

**本次复核是只读的，没有改 #3、没有评论、没有动标签。**