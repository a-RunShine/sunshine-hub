/**
 * 服务端时间校准（纯函数，不碰时钟副作用）。
 *
 * 详情响应带 `serverTime`（服务端当前时刻），取数瞬间再读一次本机时间，两者之差即偏移：
 *
 *     offsetMs = serverTimeEpoch - localNowAtFetch
 *
 * 之后任意时刻的服务端口径时间：`serverNow = 本机当前时刻 + offsetMs`。
 * 开售 / 结束 / 冷却到期的倒计时共用这一个偏移，不各算一套；本机被调快或调慢，
 * 误差被偏移吸收，倒计时仍然正确。重新取数成功后要用新响应重算偏移。
 */

/** 用一次取数的两端时刻算偏移；serverTime 解析失败时返回 0（不校准，避免 NaN 带进倒计时）。 */
export function computeOffsetMs(serverTime: string, localNow: number): number {
  const serverEpoch = Date.parse(serverTime)
  if (Number.isNaN(serverEpoch)) return 0
  return serverEpoch - localNow
}

/** 偏移后的服务端口径当前时刻。 */
export function serverNow(localNow: number, offsetMs: number): number {
  return localNow + offsetMs
}

/** 距目标时刻还剩多少毫秒；已过或目标非法返回 0。 */
export function remainingMs(target: string, now: number): number {
  const targetEpoch = Date.parse(target)
  if (Number.isNaN(targetEpoch)) return 0
  return Math.max(0, targetEpoch - now)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 倒计时格式：超过 1 小时显示 HH:mm:ss，否则 mm:ss；入参为毫秒。 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  return `${pad2(minutes)}:${pad2(seconds)}`
}
