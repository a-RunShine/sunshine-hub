import { useCallback, useEffect, useRef, useState } from 'react'
import { postCampaignClaim, type ClaimResult } from '@/api/campaign'
import { ApiError } from '@/api/client'
import { computeOffsetMs } from './serverClock'

/**
 * 抢购提交状态机（页面内状态，不进全局 store：刷新页面就该丢掉）。
 *
 * - `idle` 未提交：按钮按只读态口径可点 / 不可点
 * - `pending` 请求在途：按钮「抢购中」且不可重复触发
 * - `success` 抢到：带响应结果与按响应 `serverTime` 重算的时间偏移，供结果展示
 * - `failed` 未抢到：回到可点，只给一句兜底提示；错误码文案分流是后续票的范围
 */
export type ClaimState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'pending' }
  | { readonly phase: 'success'; readonly result: ClaimResult; readonly offsetMs: number }
  | { readonly phase: 'failed'; readonly message: string }

/** 失败兜底提示：本票不按错误码做文案映射，统一给一句可读默认文案。 */
const CLAIM_FAILED_FALLBACK_MESSAGE = '抢购未成功，请稍后再试'

export interface UseCampaignClaimOptions {
  /** 注入当前时刻；默认 Date.now，测试里用来冻结本机时间。 */
  readonly now?: () => number
  /** 抢购成功后回调（页面据此重新拉详情，刷新份数 / 剩余本场额度）。 */
  readonly onClaimed?: () => void
  /** 服务端回 403 `REAL_NAME_REQUIRED`（本地以为已实名但其实没有）：回到空闲态，由上层开实名表单。 */
  readonly onRealNameRequired?: () => void
}

export interface UseCampaignClaimResult {
  readonly state: ClaimState
  readonly claim: () => void
}

/**
 * 抢购提交：在途标记是防重复提交的真正闸口——请求没回来之前，第二次进入直接返回，
 * 不会发出第二个抢购请求；按钮 disabled 只是表层防线。成功后用响应自带的 `serverTime`
 * 重算服务端时间偏移，付款倒计时与只读态共用同一套校准逻辑。
 */
export function useCampaignClaim(
  campaignId: string,
  options: UseCampaignClaimOptions = {},
): UseCampaignClaimResult {
  const { now = Date.now, onClaimed, onRealNameRequired } = options
  const [state, setState] = useState<ClaimState>({ phase: 'idle' })
  const inFlightRef = useRef(false)

  // 场次 id 切换时清掉上一场的提交残留，避免带着旧结果渲染新场次
  useEffect(() => {
    inFlightRef.current = false
    setState({ phase: 'idle' })
  }, [campaignId])

  const claim = useCallback(() => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setState({ phase: 'pending' })

    void (async () => {
      try {
        const result = await postCampaignClaim(campaignId)
        const offsetMs = computeOffsetMs(result.serverTime, now())
        setState({ phase: 'success', result, offsetMs })
        onClaimed?.()
      } catch (error) {
        if (error instanceof ApiError && error.code === 'REAL_NAME_REQUIRED') {
          // 本地会话态与服务端脱节：回到空闲态（不留在失败兜底文案上），上层开实名表单；
          // 实名成功后的重放仍走本 hook 的 claim()，防重闸口与状态机同一条路径。
          setState({ phase: 'idle' })
          onRealNameRequired?.()
          return
        }
        // 不读错误码、不做文案分流：统一回到可点 + 兜底提示（#52 再按码映射）。
        setState({ phase: 'failed', message: CLAIM_FAILED_FALLBACK_MESSAGE })
      } finally {
        inFlightRef.current = false
      }
    })()
  }, [campaignId, now, onClaimed, onRealNameRequired])

  return { state, claim }
}
