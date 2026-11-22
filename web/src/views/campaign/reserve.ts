import type { FlashCampaignDetail } from '@/api/campaign'

export type ReserveState = 'anonymous' | 'not-reserved' | 'reserved'

export function evaluateReserveState(reserved: boolean | null): ReserveState {
  if (reserved === null) return 'anonymous'
  return reserved ? 'reserved' : 'not-reserved'
}

export function isBeforeStart(detail: FlashCampaignDetail, now: number): boolean {
  if (detail.status !== 'UPCOMING') return false
  const startEpoch = Date.parse(detail.startAt)
  if (Number.isNaN(startEpoch)) return false
  return startEpoch > now
}
