import type { FlashCampaignDetail } from '@/api/campaign'

/**
 * 不可点原因。本票落五种只读态；#52 失败路径会往这个联合类型里补点击后的失败态。
 * 原因一律走这里的枚举取值，不在组件里散落字符串比较。
 *
 * - `NOT_STARTED` 未开售：`status = UPCOMING`，倒计时指向 `startAt`
 * - `ENDED` 已结束：`status = ENDED`
 * - `SOLD_OUT` 售罄：`allocation.available = 0`（配额态，不是场次终态，回流回升后可恢复）
 * - `CAMPAIGN_LIMIT_REACHED` 剩余本场额度用尽：`remainingCampaignLimit = 0`（仅实名购买人可见）
 * - `COOLDOWN` 购买冷却：`cooldownUntil` 为未来时刻（商品级、跨场生效）
 */
export type ClaimBlockReason =
  | 'NOT_STARTED'
  | 'ENDED'
  | 'SOLD_OUT'
  | 'CAMPAIGN_LIMIT_REACHED'
  | 'COOLDOWN'

/** 按钮可用性判定结果。`clickable` 为 true 时 `reason` 必为 null。 */
export interface Claimability {
  readonly clickable: boolean
  readonly reason: ClaimBlockReason | null
}

/** 人能看懂的原因文案，用词对齐 GLOSSARY。展示层只取这张表，不在别处另写一份。 */
export const CLAIM_BLOCK_REASON_LABEL: Record<ClaimBlockReason, string> = {
  NOT_STARTED: '未开售',
  ENDED: '已结束',
  SOLD_OUT: '售罄',
  CAMPAIGN_LIMIT_REACHED: '剩余本场额度已用尽',
  COOLDOWN: '购买冷却中',
}

/**
 * 是否属于可自行恢复的不可点态：售罄配额回流、冷却到期。
 * 详情轮询与失败 overlay 解除都按这一处判定；新增可恢复态只在这里登记。
 */
export function isRecoverableBlock(reason: ClaimBlockReason | null): boolean {
  return reason === 'SOLD_OUT' || reason === 'COOLDOWN'
}

/** 按不可点原因选倒计时目标：未开售对开售时刻，冷却中对冷却到期时刻，进行中对结束时刻。 */
export function countdownTargetFor(
  detail: FlashCampaignDetail,
  reason: ClaimBlockReason | null,
): { target: string | null; label: string } {
  if (reason === 'NOT_STARTED') return { target: detail.startAt, label: '距开售' }
  if (reason === 'COOLDOWN') return { target: detail.cooldownUntil, label: '冷却剩余' }
  if (detail.endAt != null) return { target: detail.endAt, label: '距结束' }
  return { target: null, label: '' }
}

/** 冷却到期时刻是否还在未来；null（匿名或不在冷却中）一律视为否。 */
function isFutureInstant(instant: string | null, now: number): boolean {
  if (instant === null) return false
  const epoch = Date.parse(instant)
  return !Number.isNaN(epoch) && epoch > now
}

/**
 * 按详情与服务端口径当前时刻判定按钮能不能点、为什么不能点。
 *
 * 匿名口径：`remainingCampaignLimit` 与 `cooldownUntil` 为 null 表示「不知道」，
 * 跳过这两个态，按钮保持可点；拦截发生在点击之后（#53，ADR-0009）。
 *
 * 判定优先级：场次时间轴（未开售 / 已结束）→ 配额售罄 → 剩余本场额度 → 商品级冷却。
 * 售罄只读配额、不写进 `status`；配额回流回升后重新取数即可恢复可点。
 */
export function evaluateClaimability(
  detail: FlashCampaignDetail,
  now: number,
): Claimability {
  if (detail.status === 'ENDED') return { clickable: false, reason: 'ENDED' }
  if (detail.status === 'UPCOMING') return { clickable: false, reason: 'NOT_STARTED' }
  if (detail.allocation.available === 0) return { clickable: false, reason: 'SOLD_OUT' }
  if (detail.remainingCampaignLimit === 0) {
    return { clickable: false, reason: 'CAMPAIGN_LIMIT_REACHED' }
  }
  if (isFutureInstant(detail.cooldownUntil, now)) {
    return { clickable: false, reason: 'COOLDOWN' }
  }
  return { clickable: true, reason: null }
}
