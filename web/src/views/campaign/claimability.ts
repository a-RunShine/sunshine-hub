import type { FlashCampaignDetail } from '@/api/campaign'

export type ClaimBlockReason =
  | 'NOT_STARTED'
  | 'ENDED'
  | 'SOLD_OUT'
  | 'CAMPAIGN_LIMIT_REACHED'
  | 'COOLDOWN'

export interface Claimability {
  readonly clickable: boolean
  readonly reason: ClaimBlockReason | null
}

export const CLAIM_BLOCK_REASON_LABEL: Record<ClaimBlockReason, string> = {
  NOT_STARTED: '未开售',
  ENDED: '已结束',
  SOLD_OUT: '售罄',
  CAMPAIGN_LIMIT_REACHED: '剩余本场额度已用尽',
  COOLDOWN: '购买冷却中',
}

export function isRecoverableBlock(reason: ClaimBlockReason | null): boolean {
  return reason === 'SOLD_OUT' || reason === 'COOLDOWN'
}

export function countdownTargetFor(
  detail: FlashCampaignDetail,
  reason: ClaimBlockReason | null,
): { target: string | null; label: string } {
  if (reason === 'NOT_STARTED') return { target: detail.startAt, label: '距开售' }
  if (reason === 'COOLDOWN') return { target: detail.cooldownUntil, label: '冷却剩余' }
  if (detail.endAt != null) return { target: detail.endAt, label: '距结束' }
  return { target: null, label: '' }
}

function isFutureInstant(instant: string | null, now: number): boolean {
  if (instant === null) return false
  const epoch = Date.parse(instant)
  return !Number.isNaN(epoch) && epoch > now
}

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
