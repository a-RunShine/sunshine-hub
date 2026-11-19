import { useCallback, useEffect, useRef, useState } from 'react'
import { postCampaignClaim, type ClaimResult } from '@/api/campaign'
import { computeOffsetMs } from './serverClock'
import { classifyClaimError, type ClaimFailure } from './claimFailure'

/**
 * 抢购提交状态机（页面内状态，不进全局 store：刷新页面就该丢掉）。
 *
 * - `idle` 未提交：按钮按只读态口径可点 / 不可点
 * - `pending` 请求在途：按钮「抢购中」且不可重复触发
 * - `success` 抢到：带响应结果与按响应 `serverTime` 重算的时间偏移，供结果展示
 * - `failed` 未抢到：按错误码分流成 `ClaimFailure`；可恢复态（售罄 / 冷却）由详情轮询自行恢复，
 *   终态保持禁用，其余失败回到可点
 */
export type ClaimState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'pending' }
  | { readonly phase: 'success'; readonly result: ClaimResult; readonly offsetMs: number }
  | { readonly phase: 'failed'; readonly failure: ClaimFailure }

export interface UseCampaignClaimOptions {
  /** 注入当前时刻；默认 Date.now，测试里用来冻结本机时间。 */
  readonly now?: () => number
  /** 抢购成功后回调（页面据此重新拉详情，刷新份数 / 剩余本场额度）。 */
  readonly onClaimed?: () => void
  /** #53 接管口：未登录失败回调；本票不接登录跳转，状态里保留 `UNAUTHORIZED` 码供后续分支。 */
  readonly onRequireLogin?: () => void
  /** #53 接管口：未实名失败回调；本票不接实名流程，状态里保留 `REAL_NAME_REQUIRED` 码供后续分支。 */
  readonly onRequireRealName?: () => void
}

export interface UseCampaignClaimResult {
  readonly state: ClaimState
  readonly claim: () => void
  /** 清掉失败态：可恢复状态（售罄回流 / 冷却到期）经详情重取解除后，由页面调用回到可点口径。 */
  readonly clearFailure: () => void
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
  const { now = Date.now, onClaimed, onRequireLogin, onRequireRealName } = options
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
        // 按错误码分流：不读服务端 message 做判断，处置口径见 claimFailure.ts。
        const failure = classifyClaimError(error)
        setState({ phase: 'failed', failure })
        // 登录 / 实名拦截由 #53 接管；本票只留回调口子，不在这里跳转或弹表单。
        if (failure.code === 'UNAUTHORIZED') onRequireLogin?.()
        if (failure.code === 'REAL_NAME_REQUIRED') onRequireRealName?.()
      } finally {
        inFlightRef.current = false
      }
    })()
  }, [campaignId, now, onClaimed, onRequireLogin, onRequireRealName])

  const clearFailure = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  return { state, claim, clearFailure }
}
