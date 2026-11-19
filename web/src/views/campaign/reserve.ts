import type { FlashCampaignDetail } from '@/api/campaign'

/**
 * 预约三态。`reserved` 是购买人专属字段，契约口径（openapi.yaml CampaignDetail 描述）：
 * - `null` 匿名（不知道），不能当成 `false`；
 * - `false` 已登录且未预约；
 * - `true` 已预约。
 * 类型上用联合类型把三者分开，展示层不许把 `null` 与 `false` 混成同一个「未预约」。
 */
export type ReserveState = 'anonymous' | 'not-reserved' | 'reserved'

/** 把 `reserved: boolean | null` 收窄成三态联合类型。 */
export function evaluateReserveState(reserved: boolean | null): ReserveState {
  if (reserved === null) return 'anonymous'
  return reserved ? 'reserved' : 'not-reserved'
}

/**
 * 预约入口是否还该出现：只在未开售时存在，开售后消失，不能和抢购按钮同时出现。
 *
 * 判定走服务端口径时刻（`now` 由 serverClock 偏移校准后传入，不用裸 `Date.now()`）：
 * - `status` 已离开 `UPCOMING`（ONGOING / ENDED）→ 已开售，入口消失；
 * - 仍是 `UPCOMING` 但服务端口径时间已越过 `startAt`（详情滞后或本机被拨快）→ 同样视为已开售。
 * `startAt` 解析失败时保守地隐藏入口，不把非法时刻当成未来。
 */
export function isBeforeStart(detail: FlashCampaignDetail, now: number): boolean {
  if (detail.status !== 'UPCOMING') return false
  const startEpoch = Date.parse(detail.startAt)
  if (Number.isNaN(startEpoch)) return false
  return startEpoch > now
}
