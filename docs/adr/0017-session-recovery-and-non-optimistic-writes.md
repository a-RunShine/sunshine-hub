# 前端会话恢复区分 401 与网络故障，204 写操作不做乐观更新

前端启动时的会话恢复、受保护入口的鉴权跳转分流以及 `204` / 会话变更类写操作遵循三项边界：

1. **会话恢复区分 `401` 与故障**：应用启动时由 `useAuth.restoreSession()` 调用 `getMe()`（传入 `{ skipAuthRedirect: true }`），以四态 `AuthStatus`（`uninitialized` / `loading` / `ready` / `error`）追踪进度，并在 `loading` 或 `ready` 时跳过重复请求（兼容 React `StrictMode`）。只有服务端明确返回 **`401`** 时才判定为未登录（`me = null, status = 'ready'`）；遇到 **`5xx`、超时或网络异常** 时进入 `status = 'error'`，由 `RequireAuth` 展示带重试按钮的故障态，不把无法确认状态的账号按匿名踢回登录页。`useAuth` 仅存放客户端登录态，不存放服务端业务数据。
2. **`POST /campaigns/:id/claim` 的 `401` 交由页面层回跳**：Axios 全局响应拦截器默认在 `401` 时通过 `window.location.href` 跳转到 `/login?next=...`；`postCampaignClaim` 显式传入 `{ skipAuthRedirect: true }` 关闭全局抢跳。`useCampaignClaim` 捕获 `UNAUTHORIZED` 后先把提交状态复位为 `idle`（不在按钮区滞留错误文案），再回调页面层 `onRequireLogin` 走 React Router `navigate(buildLoginUrl(location))`，与匿名点击预约/抢购及 `RequireAuth` 共用同一套 `next` 回跳口径。
3. **`204` 与会话变更写操作不做乐观更新**：`POST /campaigns/:id/reserve`、`DELETE /campaigns/:id/reserve` 与 `POST /auth/logout` 均返回 `204` 空体。客户端不解析响应体，也不在请求完成前乐观改写本地状态：预约与取消预约等待 `204` 返回后再调用 `reload()` 重拉详情刷新 `reserved`（失败时仅更新 `reserveError`）；登出等待 `logout()` 成功后才在 `AppShell` 清空 `me` 与 `status`；`PUT /me/real-name` 同样在 `200` 返回最新 `Me` 后再回写 `useAuth` 并重放抢购。

## 与既有 ADR 的关系

- **[ADR-0008](0008-session-over-jwt.md)**：系统用 Redis 存 Session 并以 HttpOnly Cookie 承载会话凭证。前端脚本无法直接检查 Cookie 是否过期，因此启动必须请求 `/me`；同理，登出必须等待服务端删除 Redis 会话并返回 `204` 后再清本地 `useAuth`，否则服务端会话仍存活，页面刷新后会重新进入已登录态。
- **[ADR-0009](0009-real-name-at-purchase.md)**：允许未登录与未实名访问者浏览限时抢购页并在点击后拦截。`getMe()` 与 `postCampaignClaim()` 通过 `skipAuthRedirect: true` 配合该策略，避免公开页面启动拉 `/me` 吃 `401` 被全局拦截器跳走，也让抢购 `401` 在复位本地状态后走统一 SPA 回跳。

## Considered Options

- **启动 `/me` 任何失败（含 `5xx` 与断网）一律置为 `me = null`**：后端抖动或短暂断网时，停留在受保护页的已登录访问者会被直接重定向到 `/login`，体验割裂且回跳后仍可能重复失败。
- **所有 `401` 统一在 Axios 全局拦截器里执行 `window.location.href` 整页跳转**：公开页面挂载调用 `/me` 会被直接跳去登录；抢购 `401` 也会绕过组件内 `inFlightRef` / `idle` 复位而触发整页刷新。
- **对预约、取消预约或登出先做乐观 UI 更新，失败再回滚**：在网络失败或服务端拒绝时，界面会短暂甚至持续展示与服务端不一致的预约态或已登出假象；尤其登出失败却清空本地状态，会在刷新页面后「重新登录回来」。

## Consequences

- 凡允许匿名访问的探测接口或需由页面层控制跳转的请求，调用时必须显式传入 `{ skipAuthRedirect: true }`；未传入的受保护接口继续依赖全局拦截器处理 `401`。
- 路由守卫必须在 `AuthStatus === 'error'` 时阻断受保护页渲染并提供重试，不得降级为匿名跳转。
- 非乐观写操作会在请求在途期间禁用触发按钮（`reserving` / `loggingOut`），并在预约成功多承担一次详情重拉往返，换取界面状态与服务端真相一致。
- **可逆性**：属于前端会话状态机与请求拦截边界约定（双向门）。后续若出现局部草稿类低风险写操作可单独评估乐观更新，但身份会话、预约与交易写入应维持服务端确认后再更新的边界。
