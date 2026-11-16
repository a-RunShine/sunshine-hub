# 契约缺口：抢购页

**2026-11-16 复核（`main` = `c5b5508`）**，全部行号指 `api/openapi.yaml`，除非另注。issue 行号指 `gh issue view <n> --json body -q .body` 的正文行号。

**2026-11-16 二次复核（本页已随 `23f89d9` 入库，PR #26）**：owner 已拍板**先补契约、再开阶段 1 抢购页**（见 [open-loops](open-loops.md)）。本页因此从「缺口清单」升级为**可决策页**：每处缺口给出具体改法、代价、以及会不会撞 ADR。

这一页是**阶段 1 抢购页的前置**。缺口不补，页面写出来就是错的——不是写不完，是写完了对着契约一核发现表达不了。

相关页：[index](index.md) · [stages](stages.md) · [open-loops](open-loops.md) · [decisions](decisions.md) · [issue-3-review](issue-3-review.md) · [guardrails](guardrails.md)

## 这件事验证了交接记录的判断

**2026-11-16 交接记录**建议「阶段 1 从抢购页开始」，理由是它交互最复杂，**早做能暴露契约缺口**。

**判断成立，而且比预期更早兑现**：下面五处缺口是**读契约读出来的，一行页面代码都还没写**。阶段 0 的完成标准里「OpenAPI 通过 Redocly 校验，无 `$ref` 断链」（issue #7）全绿——**结构合法不等于语义够用**。Redocly 拦不住「这个页面需要的字段不存在」。

## 已经够用的部分

| 页面需要 | 契约提供 | 位置 |
| --- | --- | --- |
| 开售倒计时（服务端校时） | `CampaignDetail.serverTime` + `startAt` | `:1290`、`:1281` |
| 付款倒计时 | `ClaimResult.payDeadline` + `serverTime` | `:1349`、`:1352` |
| 抢到即显示编号 | `ClaimResult.collectibleNumber`，形如 `0427` | `:1346` |
| 失败因·已购 | `ALREADY_PURCHASED` / 409 | `:260-265` |
| 失败因·售罄 | `SOLD_OUT` / 410 | `:266-271` |
| 未实名态 | `Me.realNameVerified`（required） | `:1634`、`:1641` |

`serverTime` 的存在直接回应了 issue #7 风险段那条「倒计时要用服务端时间，别用客户端时间」。编号即时可见对应 [ADR-0001](../adr/0001-claim-binds-collectible-number.md)。

## 五种禁用态：推导结果（2026-11-16）

「五种按钮禁用态」这个数字来自 issue #7 第 58 行与交接记录，**权威清单不存在**——不在 #7、不在 #2、不在契约、不在任何 ADR。下表是推导，**逐态标注依据强度**。

| 禁用态 | 依据强度 | 数据来源 | 契约现状 |
| --- | --- | --- | --- |
| 未开售 | **spec 有据** | `status=UPCOMING`（`:1287`）、`CAMPAIGN_NOT_STARTED`（`ErrorCode.java:24`） | 够用 |
| 已结束 | **spec 有据** | `status=ENDED`、`CAMPAIGN_ENDED`（`ErrorCode.java:25`） | 够用 |
| 售罄 | **spec 有据** | Lua `-2`（#2:214-216、228）→ `allocation.available=0` | 受缺口 3 阻 |
| 已购 / 限购 | **spec 有据** | Lua `-1`（#2:209-211）、[ADR-0002](../adr/0002-purchase-limit-on-real-name.md):16 跨场累计 | **字段不存在**，受缺口 2 阻 |
| 失格 / 冷却 | **spec 有据、契约无落点** | #2:196「24h 内累计 3 次未支付永久失格；不足 3 次的最后一次关闭后 24h 自动恢复」、#2:402 把它列为必测项 | **无错误码，Lua 也没实现** |

**「五」这个数字是推断，不是权威定义。** 前四态每一态都能在 spec 里指到句子；第五态（失格）能指到句子，但**契约与脚本两侧都没有它**：`ErrorCode` 枚举（`:1085-1112`）里没有对应码，Lua（#2:209）只查 `EXISTS limitKey`，失格用户会拿到 `-1 已购`，文案是「这件商品你已经买过了」（`ErrorCode.java:29`）——**他根本没付过钱**。这是 spec 自身的矛盾，不是契约漏写。

### 未实名与未登录**不是**禁用态

**2026-11-16 判定**：这两态必须是**可点的拦截态**，不能禁用。

[ADR-0009](../adr/0009-real-name-at-purchase.md):3 明写「点『立即抢购』时如果还没实名，弹录入表单，**填完自动继续原来的抢购动作，不让用户重新点一次**」。按钮禁用掉，这条路径就断了。未登录同理——跳登录再回跳，`web/src/lib/redirect.ts:10` 的 `buildLoginUrl` 已经是为此写的。

`Me.realNameVerified` 已在 required 里（`:1634`），`web/src/stores/auth.ts:57` 的 `needRealName()` 也已就位，**做可点拦截不需要改契约**。

「抢购中」的转圈是 in-flight 态，issue #7 第 58 行已把它与「按钮禁用态」并列单列，不占这五个名额。

> **2026-11-16 更正（superseded）**：本页旧版缺口 5 给的候选清单是「未开售、已结束、售罄、已购/限购、**未实名**」。**该清单已被上表取代**——把未实名算进禁用态违反 ADR-0009:3。旧清单保留在此处以显示它曾被误判：凑够五个不代表凑对了，第五个应当是**失格/冷却**。

## 缺口 1：失败第三因在契约里不可达

**页面需要**：失败三因之一是「编号池异常」。issue #2 第 228 行写明 Lua 返回 `-3` = 编号池与配额不同步，**属于配置错误，要告警，不能当成普通售罄咽下去**。

**契约提供**：`UNIT_POOL_INCONSISTENT` 只出现在 `ErrorCode` 枚举里（`:1099`），**全文再无第二处**。后端 `src/main/java/com/sunshinefps/shared/ErrorCode.java:31` 把它映射到 `HttpStatus.INTERNAL_SERVER_ERROR`（500）。

而 `POST /campaigns/{campaignId}/claim`（`:238`）声明的响应只有 **201 / 401 / 403 / 409 / 410 / 429**（`:246`、`:252`、`:254`、`:260`、`:266`、`:272`）——**没有任何 5xx**。

**为什么卡**：契约没给这个错误留出口。前端按契约生成类型、按声明的响应写分支，就写不出第三因的处理；MSW 也造不出这个响应。`web/src/api/client.ts:59-63` 的 5xx 分支会把 message 统一兜底成「服务出了点问题，稍后再试」，`code` 虽然保留（`:61`），但**契约没承诺 500 会带 `UNIT_POOL_INCONSISTENT`**，前端不能依赖一个没写下来的行为。

告警语义（「不能当普通售罄」）在契约里完全没有落点。

### 改法（2026-11-16 提案）

给 claim 补 `'500'` 响应，`$ref` 到 `Error`，description 列出 `UNIT_POOL_INCONSISTENT` 与 `INTERNAL_ERROR` 两个码。

- **撞不撞 ADR**：**不撞，反而是兑现**。[ADR-0001](../adr/0001-claim-binds-collectible-number.md):16 已要求「整个操作失败并抛出可识别的业务异常」，契约缺出口才是没落实 ADR。
- **代价**：`client.ts:59-63` 对所有 5xx 覆盖文案，所以用户看到的仍是通用兜底。**这是可接受的**——`code` 保留可供前端分支，告警是服务端职责，spec 要的是「要告警」而不是「给用户看不同文案」。若 owner 要区分文案，得改 `client.ts`，那属于代码改动、不在契约范围。
- **相邻但不同**：#3 的 P2-1 指出 Lua 把「键不存在」和「库存为 0」合并成 `-2 售罄`（#2:213 的 `or '-1'`），与 `-3` 要告警的原则自相矛盾。**那是脚本语义问题，本缺口是契约出口问题**，两件事，别合并成一个 ticket。见 [issue-3-review](issue-3-review.md)。

## 缺口 2：点击前拿不到「已购 / 限购」状态

**页面需要**：按钮禁用态要在**点击前**就渲染出来。已购的人不该看到一个能点的「立即抢购」。

**契约提供**：`CampaignDetail`（`:1267`）的字段是 `id / name / type / productId / startAt / endAt / status / serverTime / allocation / discountPrice / reserved`。**没有 `purchased`、没有 `alreadyPurchased`、没有 `purchaseLimit`、没有 `totalLimit`**。

限购数字只在 `ProductDetail` 上（`totalLimit:1179`、`purchaseLimit:1182`，两者都是 `[integer, 'null']` 且**不在 required 里**，`:1164`）。而且那是**商品级**的静态配置，不是「当前用户买过没有」。

**为什么卡**：判断「已购」的唯一途径是**真的 POST 一次 claim，吃一个 409**。这意味着：

- 禁用态渲染不出来，只能渲染成可点，点了再报错。
- 想预取状态就得发一次有副作用的请求——claim 会扣配额、建订单（`:242`）。**不能拿它当查询用。**
- 跨 Campaign 累计限购（[ADR-0002](../adr/0002-purchase-limit-on-real-name.md)、[ADR-0010](../adr/0010-two-purchase-limits.md)）在点击前完全不可见。

### 改法（2026-11-16 提案）

`CampaignDetail` 增加两个**可空**字段（null = 匿名，与缺口 4 同一套语义）：

- `purchased: [boolean, 'null']`——当前购买人是否已耗尽本商品额度
- `purchaseLimit: [integer, 'null']`——供「每人限购 N 件」文案，从商品级读模型冗余过来，让抢购页只发一个请求

**⚠️ 字段形态取决于 #3 的 P0-9，先拍它再动手。** `purchase_limit` 是个**数字**（#2:130、用户故事 32），而 `boolean` 只能表达「买过一次」。#3 P0-9 指出唯一索引 `uk_purchase (purchaser_hash, product_id, limit_flag)`（#2:177）的表达力上限就是 1 件。

- 若确认 **FLASH 恒为 1 件**（[ADR-0010](../adr/0010-two-purchase-limits.md):5「一个证件只能买一件」倾向这个），`purchased: boolean` 够用且更省。
- 若 `purchase_limit > 1` 也适用于 FLASH，**必须改成 `remainingQuota: [integer, 'null']`**（该购买人本商品还能拿几件），boolean 会表达错。

**代价**：冗余 `purchaseLimit` 到 `CampaignDetail` 意味着两处读模型要同源，否则商品改了限购、场次读模型没跟上。另见下方「共享缓存」一节——用户专属字段不能进缓存。

**阻塞关系**：本缺口与第五态（失格）都压在 #3 的 **P0-7 / P0-9** 上，见 [issue-3-review](issue-3-review.md) 与 [open-loops](open-loops.md)。**「先补契约」不能干净地绕过这两条。**

## 缺口 3：`allocation` 不是必填，售罄态可缺

**页面需要**：剩余份数展示 + 售罄禁用态。

**契约提供**：`CampaignDetail.required` = `[id, name, type, productId, startAt, status, serverTime]`（`:1269`）——**`allocation` 不在里面**（`:1294`）。`Allocation` 自身五个字段倒是全 required（`:1326`），恒等式 `available + occupied + pendingRepool + sold = total` 写在 `:1325`。

**为什么卡**：契约允许 200 响应不带 `allocation`。前端生成的类型里它是可选的，于是每个用到剩余份数的地方都得写一遍「没有 allocation 怎么办」。**售罄禁用态失去可靠依据**——`status` 只有 `UPCOMING / ONGOING / ENDED`（`:1287`），**没有 `SOLD_OUT`**，所以售罄只能从 `allocation.available` 推，而它可以不存在。

> **2026-11-16 更正（superseded）**：本页旧版在这里写「要么把 `allocation` 提进 required，要么给 `status` 加终态」。**这两条按字面做都会撞 ADR，已被下面的改法取代。** 旧说法保留以显示它曾被当成等价二选一——它们不是。

### 改法（2026-11-16 提案）

**⚠️ 护栏一：`allocation` 不能无条件塞进 required。** [ADR-0004](../adr/0004-product-and-campaign-separated.md) 把商品与售卖方式拆两层，只有 FLASH 有 Allocation；契约自己也写了「只有限时抢购需要配额」（`:781`）。NORMAL / DISCOUNT 场次没有配额，无条件 required 会让这两类场次的合法响应变成非法。

**⚠️ 护栏二：不要给 `status` 加 `SOLD_OUT`。** [ADR-0003](../adr/0003-repool-as-delayed-release.md):13 明写「待回流的配额在延迟窗口内对用户不可见……这意味着**『售罄』是可能被撤回的状态，前端不能把它画成终态**」。`status` 是**时间轴**（UPCOMING/ONGOING/ENDED），把售罄塞进去等于把两条轴混成一条，并诱导前端把它当终态画。

**推荐**：`CampaignDetail` 拆成 `oneOf` + `discriminator: type`——`FlashCampaignDetail`（`allocation` required）与 `SimpleCampaignDetail`（无 `allocation`，有 `discountPrice`）。`status` 保持纯时间轴。

**代价**：生成的 TS 类型变成联合，**所有消费点都要 narrow**，MSW handler 也要按 type 造数据。`if/then`（JSON Schema 2020-12，OpenAPI 3.1 允许）更轻，但 openapi-typescript 对它的支持差，实际不可用。

### 共享逻辑过期缓存的连带后果（2026-11-16）

**售罄数字可能滞后约 2 秒，禁用态必须能自己恢复。**

spec 的缓存策略是逻辑过期 + 返回旧值：`campaign:detail:{campaignId}` 是**一个共享缓存键**（#2:190），读到逻辑过期就返回旧值并异步重建（#2:263），且明写「宁可给用户一个 **2 秒前的库存数字**，也不能让他排队」（#2:265）。

两条后果：

1. **售罄禁用态不是终态**，与 ADR-0003:13 一致。回流释放后 `available` 会回升，页面必须靠**刷新按钮或短轮询**重新取数，否则用户被永久锁在一个已经撤回的售罄态外面。
2. **用户专属字段不能进这份缓存**。`reserved`（`:1299`）与新增的 `purchased` 是**按人**的，而缓存键只按 `campaignId`。把它们烘进缓存 JSON 会让 A 用户看到 B 用户的预约/已购状态。必须在**缓存读出之后叠加**，这一点要写进契约 description，否则后端会照着共享键直接序列化。

## 缺口 4：匿名接口返回用户专属字段

**页面需要**：未登录也能看抢购页（浏览不该强制登录）。

**契约提供**：`GET /campaigns/{campaignId}` 标了 `security: []`（`:222`），即**不需要认证**；但同一响应里的 `reserved` 描述是「**当前用户**是否已预约」（`:1299-1301`）。

**为什么卡**：匿名请求时 `reserved` 该是什么？`false`、`null`、还是省略？契约没说，而它是 `boolean` 非 nullable。**前端与后端会各自猜一个**，这正是 issue #7 风险段说的「契约不准导致返工」。

对照：`/campaigns/upcoming` 同样 `security: []`（`:198`），但返回的 `CampaignSummary` 没有用户专属字段，所以没这个问题。

### 改法（2026-11-16 提案）

**保留 `security: []`**（浏览不强制登录，与 ADR-0009 把实名后置到抢购前的思路一致），把用户专属字段改成**三态可空**：

- `reserved: [boolean, 'null']`，description 明写「未登录时为 null」
- 缺口 2 新增的 `purchased` 同样 `[boolean, 'null']`
- 并在 schema description 里声明这些字段**在缓存读出后叠加，不进缓存 JSON**（理由见缺口 3 的缓存一节）

**撞不撞 ADR**：不撞。ADR-0008 只管会话存储与 CSRF，不管匿名读语义。

**代价**：`null` 与 `false` 的区别要前端逐处判——`null` 是「不知道」，`false` 是「知道没预约」。把两者混同会让匿名用户看到「已预约」的反面文案，而不是「登录后可预约」。

**弱相关**：#3 的 P1-7 指出 `t_reserve` 无 `(campaign_id, account_id)` 唯一索引，重复预约会插多行。那影响 `reserved` 的**正确性**，不影响它的**可空语义**，两件事。

## 缺口 5：五种禁用态没有任何权威清单

**页面需要**：issue #7 与交接记录都说抢购页有「**五种按钮禁用态**」。

**契约提供**：**没有这份清单。** 不在 issue #7，不在 issue #2，不在 `api/openapi.yaml`，不在任何 ADR。issue #2 第 228 行只给了 Lua 层的 `0 / -1 / -2 / -3`——那是**后端脚本返回码**，不是前端按钮状态，两者不是一一对应（`-3` 是配置错误，不该表现为一个禁用态）。

**为什么卡**：五这个数字没有可核对的来源。**推导结果见本页上方「五种禁用态」一节**，含逐态依据强度与「未实名/未登录不是禁用态」的判定。

**改法**：这是**人写的定义**，不是 schema 改动。把上方那张表落进 issue #7 的抢购页段落，逐态标注数据来源。**在 owner 确认「五」的口径之前不要开工**——否则「五种」会在不同 agent 手里变成不同的五种。

**新增错误码的机器耦合（2026-11-16）**：第五态（失格/冷却）要落地就得新增错误码（例如 `PURCHASE_DISQUALIFIED`）。**必须同时改两处**：`src/main/java/com/sunshinefps/shared/ErrorCode.java` 与 `api/openapi.yaml` 的 `ErrorCode` 枚举（`:1085`）。`src/test/java/com/sunshinefps/ErrorCodeContractTest.java:29-46` 直接比对两边成员，**漏一边就红**，而且它只比常量名，不比文案与状态码（`:22` 注释）。这条是 blocking，不是 advisory——与术语检查不同，见 [guardrails](guardrails.md)。

## 附带：MSW 造不出失败态

**2026-11-16 复核**：`web/src/mocks/handlers.ts:109-119` 的 claim handler **无条件返回 201**。七个 handler 里没有任何一个返回 409 / 410 / 500。

所以即使契约补齐了，**当前 mock 也演示不了三种失败因**。这与 [open-loops](open-loops.md) 里「MSW handler 只有骨架用的几条」是同一件事的两面。

## 结论

五处缺口里，**缺口 1、2、3、4 都要改 `api/openapi.yaml`**，缺口 5 要先有一份人写的定义。全部属于阶段 0 的产物范围，**不是阶段 1 的实现细节**。

按 issue #7 的依赖图，阶段 0 的契约是阶段 1 与阶段 2 的**唯一硬依赖**。这几处不补，两个阶段都会照着不足的契约往下写。

**2026-11-16 补充：补契约本身也有前置。** 缺口 2 的字段形态与第五态的语义压在 #3 的 **P0-7（限购键生存期矛盾、永久失格无处安放）与 P0-9（唯一索引只能表达 1 件）** 上。这两条不 triage，契约改出来的字段类型可能是错的。逐条重叠分析见 [issue-3-review](issue-3-review.md)。

## 需要 owner 拍板的四个问题（2026-11-16）

1. **「五」的口径**：第五态是失格/冷却吗？**推荐是**，并明文排除未实名与未登录（否则违反 ADR-0009:3）。
2. **限购字段形态**：`purchased: boolean` 还是 `remainingQuota: integer`？**推荐先拍 P0-9**；若确认 FLASH 恒 1 件，boolean 更省。
3. **`CampaignDetail` 拆分方式**：**推荐 `oneOf` + `discriminator(type)`**，代价是前端全量 narrow。
4. **永久失格是否进首版**：**推荐只做 24h 冷却档**，永久失格 + 人工解封显式记为范围外——[ADR-0002](../adr/0002-purchase-limit-on-real-name.md):5 已否掉客服申诉通道，做永久就得配解封入口，超出阶段 1。