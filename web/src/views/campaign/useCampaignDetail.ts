import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { getCampaignDetail, type FlashCampaignDetail } from '@/api/campaign'
import { evaluateClaimability, type Claimability } from './claimability'
import { isBeforeStart } from './reserve'
import { computeOffsetMs, serverNow } from './serverClock'

/** 页面取数状态分支：加载中 / 场次不存在 / 错误 / 有数据。 */
export type CampaignPageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      detail: FlashCampaignDetail
      offsetMs: number
      claimability: Claimability
      /** 未开售（服务端口径）；开售后预约入口消失。 */
      beforeStart: boolean
      /** 成功取数轮次号：每次详情回包自增，供页面判断「失败之后是否有新详情回来」。 */
      loadEpoch: number
    }

export interface UseCampaignDetailOptions {
  /** 注入当前时刻；默认 Date.now，测试里用来冻结或偏移本机时间。 */
  readonly now?: () => number
}

export interface UseCampaignDetailResult {
  readonly state: CampaignPageState
  /** 手动重新取数（错误态的重试按钮用）。 */
  readonly reload: () => void
}

/**
 * 抢购页数据获取：拉详情、错误映射、服务端时间偏移校准。
 * 展示层只拿 `state` 渲染，不在这里发请求之外的渲染决策；
 * 可恢复态（售罄回流 / 冷却到期）的轮询由页面层经 `useVisibilityPolling` 统一挂。
 */
export function useCampaignDetail(
  campaignId: string,
  options: UseCampaignDetailOptions = {},
): UseCampaignDetailResult {
  const { now = Date.now } = options
  const [state, setState] = useState<CampaignPageState>({ status: 'loading' })
  const requestSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++requestSeq.current
    try {
      const raw = await getCampaignDetail(campaignId)
      // 取数途中场次 id 已切换，过期响应不许覆盖新状态
      if (seq !== requestSeq.current) return
      if (raw.type !== 'FLASH') {
        setState({ status: 'error', message: '该场次不是限时抢购' })
        return
      }
      // 每次取数成功都用最新响应重算服务端时间偏移
      const offsetMs = computeOffsetMs(raw.serverTime, now())
      const serverNowMs = serverNow(now(), offsetMs)
      const claimability = evaluateClaimability(raw, serverNowMs)
      const beforeStart = isBeforeStart(raw, serverNowMs)
      setState({ status: 'ready', detail: raw, offsetMs, claimability, beforeStart, loadEpoch: seq })
    } catch (error) {
      if (seq !== requestSeq.current) return
      if (error instanceof ApiError && error.code === 'CAMPAIGN_NOT_FOUND') {
        setState({ status: 'not-found' })
        return
      }
      const message = error instanceof ApiError ? error.message : '网络出了点问题'
      setState({ status: 'error', message })
    }
  }, [campaignId, now])

  // 场次 id 变化时先回加载态，再重新取数
  useEffect(() => {
    setState({ status: 'loading' })
    void load()
  }, [load])

  return { state, reload: load }
}
