# 会话存在 Redis 里，不用 JWT

登录态用 Spring Session 存 Redis，浏览器只拿一个 sessionId cookie。

JWT 是这类项目更常见的选择，但它的无状态特性在这里是负担：签发之后服务端无法主动作废。运营要封禁一个账号，封了之后那个人的 token 还能一直用到过期为止。

用 Session，封号和登出都是一次 `DEL`，立刻生效。

## Considered Options

- **JWT 加 Redis 黑名单**：保留了 JWT 跨服务可验证的能力，但每次请求仍要查一次 Redis 判断是否在黑名单里，等于把 Session 的成本又付了一遍，还多一层逻辑。
- **JWT 短过期加 refresh token**：不用黑名单，但封号仍然要等 access token 过期，最长半小时。而且多一套刷新流程和并发刷新处理。

## Consequences

每次请求多一次 Redis 读。以本项目的量级，这是毫秒以下的开销。

Session 与 Redis 强绑定，Redis 挂了这个系统的所有人都登不上。这个代价可以接受：Redis 挂的时候抢购本来也用不了。

Cookie 会被浏览器自动携带，所以 Session 天然暴露在 CSRF 下。JWT 放在 `Authorization` 头里不会自动携带，这是选 Session 容易漏掉的第三项代价，防起来分三层，都不需要新依赖：

- Cookie 设 `SameSite=Lax`，跨站发起的 POST 不会带上它
- 所有写请求必须带自定义头 `X-Requested-With`，跨站表单发不出自定义头
- 支付与退款回调白名单跳过以上检查。它们没有用户会话，安全性由签名保证——回调本来就必须验签，否则任何人都能伪造「支付成功」

这套方案成立的前提是**前后端同源部署**。哪天分到不同域名，`SameSite=Lax` 会让 Cookie 根本不发送，那时必须换成 Double Submit Cookie：服务端下发非 HttpOnly 的 `XSRF-TOKEN`，前端读出来放进请求头，服务端比对两者。同源时不用，跨域时不可省。
