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
