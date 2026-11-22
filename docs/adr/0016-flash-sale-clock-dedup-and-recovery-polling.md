# 限时抢购前端统一服务端校时、在途防重与可恢复态轮询

限时抢购页面的时序判定、防重复提交、可恢复态刷新与收藏编号展示遵循以下机制：

1. **统一服务端时钟偏移校准**：`useCampaignDetail` 每次成功拉取详情、以及 `useCampaignClaim` 抢购成功时，均用响应携带的 `serverTime` 与取数瞬间本机时刻计算偏移 `offsetMs = Date.parse(serverTime) - localNow`（`serverTime` 解析失败时回落为 `0`，避免 `NaN` 污染计算）。页面所有时刻比较与倒计时——开售倒计时、结束倒计时、冷却倒计时、`isBeforeStart` 预约入口隐藏判定以及付款截止倒计时——统一基于 `serverNow(localNow, offsetMs)` 计算，不直接信任本机时钟；详情 Hook 另以递增 `requestSeq` 丢弃乱序返回的过期响应。
2. **内存 `inFlightRef` 作为真实防重闸口**：`useCampaignClaim` 用 `inFlightRef` 在同步入口处拦住在途重复触发（请求未归前再次调用 `claim()` 直接返回，在 `finally` 及 `campaignId` 切换时复位）。按钮 `disabled` 仅是表层反馈，不充当防重依据；提交状态留在页面内 `useState`，不进全局 store。
3. **仅对可自动恢复态开启可见性感知轮询**：`useVisibilityPolling` 只在详情态为 `SOLD_OUT` / `COOLDOWN` 或抢购失败态为可恢复码（`SOLD_OUT` / `PURCHASE_COOLDOWN`）时启动 `15_000 ms` 定时重拉。标签页切到后台（`document.hidden`）暂停定时器，切回前台时立即补拉一轮再继续计时；不可恢复态不挂常驻定时器，也不注册 `visibilitychange` 监听。
4. **恢复解除绑定失败后的新详情轮次（`loadEpoch` 屏障）**：`useCampaignDetail` 每次成功响应推进 `loadEpoch`。`useRecoverableFailureReset` 在进入可恢复失败态时记下当前 `failureEpochRef`，只有后续到达的新详情满足 `status === 'ready' && claimability.clickable && loadEpoch > failureEpochRef` 时才清除失败状态，避免失败前拿到的旧详情提前抹掉刚返回的 `SOLD_OUT` 或 `PURCHASE_COOLDOWN` 失败提示。
5. **收藏编号原样保留字符串展示**：`CampaignClaimResult` 按契约字符串原样渲染 `collectibleNumber`（如 `0427`），不做数值解析或前导零裁剪。

## 与既有 ADR 的关系

- **[ADR-0001](0001-claim-binds-collectible-number.md)**：抢占成功即绑定并展示收藏编号，要求前端原样保留字符串前导零，并按响应 `serverTime` 校准付款截止倒计时。
- **[ADR-0003](0003-repool-as-delayed-release.md)**：待回流配额延迟 30 分钟释放且共享缓存允许约 2 秒滞后，「售罄」不是终态。本 ADR 的可恢复态可见性轮询与 `loadEpoch` 解除屏障，既避免把售罄画成终态，也防止滞后旧详情误消除刚返回的 `SOLD_OUT` 失败态。
- **[ADR-0009](0009-real-name-at-purchase.md)**：未登录（`401`）与未实名（`403 REAL_NAME_REQUIRED`）不落入失败提示，而是回 `idle` 触发登录回跳或实名表单；提交实名后的自动重放仍走 `useCampaignClaim` 的同一 `claim()` 与 `inFlightRef` 闸口。
- **[ADR-0013](0013-two-tier-cooldown.md)**：购买冷却到期自动恢复，与售罄回流复用同一套可恢复态轮询、`serverClock` 冷却倒计时与 `loadEpoch` 解除屏障。

## Considered Options

- **直接读取本机 `Date.now()` 做倒计时与开售判断**：本机时钟被拨快或存在偏差时，会出现预约入口提前消失、未开售或冷却倒计时失准。
- **仅靠按钮 `disabled` 防连点**：React 状态更新跨渲染帧异步生效，同帧双击或实名重放回调仍可能并发发出多个抢购请求。
- **所有失败态常驻短轮询，或引入 WebSocket / SSE 推送**：对已结束、本场额度用尽等终态轮询纯属无效流量；为延迟 30 分钟的回流与定时冷却另建推送长连接基础设施则超出当前复杂度收益比。
- **不校验 `loadEpoch`，详情一可点就清失败态**：缓存滞后或请求竞态下，抢购前拿到的详情可能仍显示可点，导致刚失败的 `SOLD_OUT` / `PURCHASE_COOLDOWN` 提示瞬间被旧快照冲掉。
- **把 `collectibleNumber` 转成整数存储或格式化**：会丢掉固定位宽前导零，破坏收藏编号展示语义。

## Consequences

- 抢购页新增任何基于当前时刻的展示或判定都必须经由 `serverClock` 偏移计算，不得直接消费裸 `Date.now()`；`serverTime` 异常时退化为 `offsetMs = 0`，优先保证页面不出现 `NaN` 倒计时。
- 配额回流或冷却到期后，若标签页持续停留且不刷新，页面恢复可点最多存在一个 `15s` 轮询周期的延迟（切回前台会立即补拉）。
- 恢复解除强依赖 `useCampaignDetail` 的单调 `loadEpoch` 与 `useCampaignClaim` 的 `phase` 生命周期，调整任一侧状态流转时必须同步检查 `useRecoverableFailureReset`。
- **可逆性**：属于前端页面层状态机与轮询策略（双向门），但修改轮询条件、`loadEpoch` 屏障或 `inFlightRef` 闸口会影响缓存滞后容错与防重提交不变量，变更前需同步复核 ADR-0003 与 ADR-0009 对应测试。
