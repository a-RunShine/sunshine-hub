import { ApiError } from '@/api/client'

/**
 * 抢购失败错误码。取值对齐契约 ErrorCode 枚举（openapi.yaml），只收录 claim 出口会出现的码；
 * 分流一律按 `ApiError.code` 判断，绝不按服务端 message 文案分支——文案由服务端决定、随时可能改。
 *
 * - `ALREADY_PURCHASED` 已购过本场商品：本场额度已用尽，终态提示
 * - `SOLD_OUT`（410）售罄：配额回流可能回升，可恢复，挂通用轮询
 * - `CAMPAIGN_NOT_STARTED` 场次未开售：回到倒计时口径
 * - `CAMPAIGN_ENDED` 场次已结束：终态提示
 * - `PURCHASE_COOLDOWN` 购买冷却：到期自动恢复，可恢复，挂通用轮询
 * - `UNIT_POOL_INCONSISTENT` 编号池与配额不同步：服务异常，不是用户的错
 * - `INTERNAL_ERROR` 服务内部错误兜底
 * - `RATE_LIMITED`（429）操作太快：限流，稍后再试
 * - `UNKNOWN` 兜底：非 ApiError 或契约外码
 *
 * `REAL_NAME_REQUIRED`（403）与 `UNAUTHORIZED`（401）不进失败态：在状态机里直接回 idle 并
 * 回调上层（实名弹窗 / 登录回跳），不经过本处置表。
 */
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

/** 单个错误码的处置口径：主提示、下一步、失败后按钮是否回可点、是否可自行恢复。 */
export interface ClaimFailureDisposition {
  /** 主提示（对齐 GLOSSARY 术语）。 */
  readonly summary: string
  /** 下一步说明。 */
  readonly nextStep: string
  /** 失败后按钮是否回到可点；不可恢复的终态保持禁用。 */
  readonly clickableAfter: boolean
  /** 是否属于可自行恢复（售罄回流 / 冷却到期），期间由通用轮询重新取数。 */
  readonly recoverable: boolean
  /** 是否保留并展示服务端 message 原文（500 / 429），不用前端兜底文案盖掉。 */
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

/** 分流后的失败结果：状态机只持有这份不可变快照，展示层据此渲染。 */
export interface ClaimFailure {
  readonly code: ClaimFailureCode
  /** 主提示文案。 */
  readonly summary: string
  /** 下一步说明。 */
  readonly nextStep: string
  /** 失败后按钮是否回到可点。 */
  readonly clickableAfter: boolean
  /** 是否可自行恢复（售罄回流 / 冷却到期）。 */
  readonly recoverable: boolean
}

/** 把请求层抛出的错误归类成失败处置；不读 message 做分支，message 只在允许保留原文的码上透传。 */
export function classifyClaimError(error: unknown): ClaimFailure {
  const disposition = (code: ClaimFailureCode): ClaimFailureDisposition => DISPOSITIONS[code]

  if (error instanceof ApiError) {
    const known = (Object.keys(DISPOSITIONS) as ClaimFailureCode[]).includes(
      error.code as ClaimFailureCode,
    )
    const code: ClaimFailureCode = known ? (error.code as ClaimFailureCode) : 'UNKNOWN'
    const entry = disposition(code)
    // 500 / 429 保留服务端 message 原文；其余码按处置表给可读提示，不拿服务端文案做判断。
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
