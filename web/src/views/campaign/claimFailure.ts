import { ApiError } from '@/api/client'

export type ClaimFailureCode =
  | 'ALREADY_PURCHASED'
  | 'SOLD_OUT'
  | 'CAMPAIGN_NOT_STARTED'
  | 'CAMPAIGN_ENDED'
  | 'PURCHASE_COOLDOWN'
  | 'UNIT_POOL_INCONSISTENT'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN'

export interface ClaimFailureDisposition {
  readonly summary: string
  readonly nextStep: string
  readonly clickableAfter: boolean
  readonly recoverable: boolean
  readonly preserveServerMessage: boolean
}

const DISPOSITIONS: Record<ClaimFailureCode, ClaimFailureDisposition> = {
  ALREADY_PURCHASED: {
    summary: '本场额度已用尽',
    nextStep: '这件商品你已经买过了，本场不能重复下单',
    clickableAfter: false,
    recoverable: false,
    preserveServerMessage: false,
  },
  SOLD_OUT: {
    summary: '售罄',
    nextStep: '回流可能让份数回升，稍后可再试',
    clickableAfter: false,
    recoverable: true,
    preserveServerMessage: false,
  },
  CAMPAIGN_NOT_STARTED: {
    summary: '还没开售',
    nextStep: '请等开售倒计时结束后再来',
    clickableAfter: false,
    recoverable: false,
    preserveServerMessage: false,
  },
  CAMPAIGN_ENDED: {
    summary: '本场已结束',
    nextStep: '本场售卖已结束，可以留意后续场次',
    clickableAfter: false,
    recoverable: false,
    preserveServerMessage: false,
  },
  PURCHASE_COOLDOWN: {
    summary: '购买冷却中',
    nextStep: '冷却到期后自动恢复可购，无需手动操作',
    clickableAfter: false,
    recoverable: true,
    preserveServerMessage: false,
  },
  UNIT_POOL_INCONSISTENT: {
    summary: '编号池与配额不同步',
    nextStep: '服务端状态不一致，不是你的操作问题，请稍后再试',
    clickableAfter: true,
    recoverable: false,
    preserveServerMessage: true,
  },
  INTERNAL_ERROR: {
    summary: '服务异常',
    nextStep: '请稍后再试',
    clickableAfter: true,
    recoverable: false,
    preserveServerMessage: true,
  },
  RATE_LIMITED: {
    summary: '操作太快',
    nextStep: '请稍后再试',
    clickableAfter: true,
    recoverable: false,
    preserveServerMessage: true,
  },
  UNKNOWN: {
    summary: '抢购未成功',
    nextStep: '请稍后再试',
    clickableAfter: true,
    recoverable: false,
    preserveServerMessage: false,
  },
}

export interface ClaimFailure {
  readonly code: ClaimFailureCode
  readonly summary: string
  readonly nextStep: string
  readonly clickableAfter: boolean
  readonly recoverable: boolean
}

export function classifyClaimError(error: unknown): ClaimFailure {
  const disposition = (code: ClaimFailureCode): ClaimFailureDisposition => DISPOSITIONS[code]

  if (error instanceof ApiError) {
    const known = (Object.keys(DISPOSITIONS) as ClaimFailureCode[]).includes(
      error.code as ClaimFailureCode,
    )
    const code: ClaimFailureCode = known ? (error.code as ClaimFailureCode) : 'UNKNOWN'
    const entry = disposition(code)
    const summary = entry.preserveServerMessage && error.message !== '' ? error.message : entry.summary
    return {
      code,
      summary,
      nextStep: entry.nextStep,
      clickableAfter: entry.clickableAfter,
      recoverable: entry.recoverable,
    }
  }

  const entry = DISPOSITIONS.UNKNOWN
  return {
    code: 'UNKNOWN',
    summary: entry.summary,
    nextStep: entry.nextStep,
    clickableAfter: entry.clickableAfter,
    recoverable: entry.recoverable,
  }
}
