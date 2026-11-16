# 契约缺口：抢购页

**2026-11-16 复核（`main` = `c5b5508`）**，全部行号指 `api/openapi.yaml`，除非另注。

这一页是**阶段 1 抢购页的前置**。缺口不补，页面写出来就是错的——不是写不完，是写完了对着契约一核发现表达不了。

相关页：[index](index.md) · [stages](stages.md) · [open-loops](open-loops.md) · [decisions](decisions.md)

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

## 缺口 1：失败第三因在契约里不可达

**页面需要**：失败三因之一是「编号池异常」。issue #2 第 228 行写明 Lua 返回 `-3` = 编号池与配额不同步，**属于配置错误，要告警，不能当成普通售罄咽下去**。

**契约提供**：`UNIT_POOL_INCONSISTENT` 只出现在 `ErrorCode` 枚举里（`:1099`），**全文再无第二处**。后端 `src/main/java/com/sunshinefps/shared/ErrorCode.java:31` 把它映射到 `HttpStatus.INTERNAL_SERVER_ERROR`（500）。

而 `POST /campaigns/{campaignId}/claim`（`:238`）声明的响应只有 **201 / 401 / 403 / 409 / 410 / 429**（`:246`、`:252`、`:254`、`:260`、`:266`、`:272`）——**没有任何 5xx**。

**为什么卡**：契约没给这个错误留出口。前端按契约生成类型、按声明的响应写分支，就写不出第三因的处理；MSW 也造不出这个响应。`web/src/api/client.ts` 的 5xx 分支会把 message 统一兜底成「服务出了点问题」，`code` 虽然保留，但**契约没承诺 500 会带 `UNIT_POOL_INCONSISTENT`**，前端不能依赖一个没写下来的行为。

告警语义（「不能当普通售罄」）在契约里完全没有落点。

## 缺口 2：点击前拿不到「已购 / 限购」状态

**页面需要**：按钮禁用态要在**点击前**就渲染出来。已购的人不该看到一个能点的「立即抢购」。

**契约提供**：`CampaignDetail`（`:1267`）的字段是 `id / name / type / productId / startAt / endAt / status / serverTime / allocation / discountPrice / reserved`。**没有 `purchased`、没有 `alreadyPurchased`、没有 `purchaseLimit`、没有 `totalLimit`**。

限购数字只在 `ProductDetail` 上（`totalLimit:1179`、`purchaseLimit:1182`，两者都是 `[integer, 'null']` 且**不在 required 里**，`:1164`）。而且那是**商品级**的静态配置，不是「当前用户买过没有」。

**为什么卡**：判断「已购」的唯一途径是**真的 POST 一次 claim，吃一个 409**。这意味着：

- 禁用态渲染不出来，只能渲染成可点，点了再报错。
- 想预取状态就得发一次有副作用的请求——claim 会扣配额、建订单（`:242`）。**不能拿它当查询用。**
- 跨 Campaign 累计限购（[ADR-0002](../adr/0002-purchase-limit-on-real-name.md)、[ADR-0010](../adr/0010-two-purchase-limits.md)）在点击前完全不可见。

## 缺口 3：`allocation` 不是必填，售罄态可缺

**页面需要**：剩余份数展示 + 售罄禁用态。

**契约提供**：`CampaignDetail.required` = `[id, name, type, productId, startAt, status, serverTime]`（`:1269`）——**`allocation` 不在里面**（`:1294`）。`Allocation` 自身五个字段倒是全 required（`:1326`），恒等式 `available + occupied + pendingRepool + sold = total` 写在 `:1325`。

**为什么卡**：契约允许 200 响应不带 `allocation`。前端生成的类型里它是可选的，于是每个用到剩余份数的地方都得写一遍「没有 allocation 怎么办」。**售罄禁用态失去可靠依据**——`status` 只有 `UPCOMING / ONGOING / ENDED`（`:1287`），**没有 `SOLD_OUT`**，所以售罄只能从 `allocation.available` 推，而它可以不存在。

要么把 `allocation` 提进 required，要么给 `status` 加终态。两条都是契约改动，不是前端能绕的。

## 缺口 4：匿名接口返回用户专属字段

**页面需要**：未登录也能看抢购页（浏览不该强制登录）。

**契约提供**：`GET /campaigns/{campaignId}` 标了 `security: []`（`:222`），即**不需要认证**；但同一响应里的 `reserved` 描述是「**当前用户**是否已预约」（`:1299-1301`）。

**为什么卡**：匿名请求时 `reserved` 该是什么？`false`、`null`、还是省略？契约没说，而它是 `boolean` 非 nullable。**前端与后端会各自猜一个**，这正是 issue #7 风险段说的「契约不准导致返工」。

对照：`/campaigns/upcoming` 同样 `security: []`（`:198`），但返回的 `CampaignSummary` 没有用户专属字段，所以没这个问题。

## 缺口 5：五种禁用态没有任何权威清单

**页面需要**：issue #7 与交接记录都说抢购页有「**五种按钮禁用态**」。

**契约提供**：**没有这份清单。** 不在 issue #7，不在 issue #2，不在 `api/openapi.yaml`，不在任何 ADR。issue #2 第 228 行只给了 Lua 层的 `0 / -1 / -2 / -3`——那是**后端脚本返回码**，不是前端按钮状态，两者不是一一对应（`-3` 是配置错误，不该表现为一个禁用态）。

**为什么卡**：五这个数字没有可核对的来源。按契约能推出来的候选是：未开售（`status=UPCOMING`）、已结束（`ENDED`）、售罄（`allocation.available=0`，受缺口 3 影响）、已购/限购（**受缺口 2 影响，推不出来**）、未实名（`Me.realNameVerified`）。**这只是推断，不是权威定义**，凑够五个不代表凑对了。

实现前必须先把这五态写下来并逐态标注数据来源，否则「五种」会在不同 agent 手里变成不同的五种。

## 附带：MSW 造不出失败态

**2026-11-16 复核**：`web/src/mocks/handlers.ts:109-119` 的 claim handler **无条件返回 201**。七个 handler 里没有任何一个返回 409 / 410 / 500。

所以即使契约补齐了，**当前 mock 也演示不了三种失败因**。这与 [open-loops](open-loops.md) 里「MSW handler 只有骨架用的几条」是同一件事的两面。

## 结论

五处缺口里，**缺口 1、2、3、4 都要改 `api/openapi.yaml`**，缺口 5 要先有一份人写的定义。全部属于阶段 0 的产物范围，**不是阶段 1 的实现细节**。

按 issue #7 的依赖图，阶段 0 的契约是阶段 1 与阶段 2 的**唯一硬依赖**。这几处不补，两个阶段都会照着不足的契约往下写。