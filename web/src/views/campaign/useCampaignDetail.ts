import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { getCampaignDetail, type FlashCampaignDetail } from '@/api/campaign'
import { evaluateClaimability, type Claimability } from './claimability'
import { computeOffsetMs, serverNow } from './serverClock'

/**
 * 售罄态重新取数间隔（毫秒）。回流释放是慢动作，15 秒一轮足够观察配额回升；
 * #52 会把这套间隔与可见性暂停抽成通用轮询，本票先在抢购页内闭环，
 * 至少保证页面不可见时不再狂拉详情。
 */
const SOLD_OUT_REFETCH_INTERVAL_MS = 15_000

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
    }

export interface UseCampaignDetailOptions {
  /** 注入当前时刻；默认 Date.now，测试里用来冻结或偏移本机时间。 */
  readonly now?: () => number
  /** 售罄重取间隔；测试可传短间隔，生产走默认值。 */
  readonly soldOutRefetchIntervalMs?: number
}

export interface UseCampaignDetailResult {
  readonly state: CampaignPageState
  /** 手动重新取数（错误态的重试按钮用）。 */
  readonly reload: () => void
}

/**
 * 抢购页数据获取：拉详情、错误映射、服务端时间偏移校准、售罄重取。
 * 展示层只拿 `state` 渲染，不在这里发请求之外的渲染决策。
 */
export function useCampaignDetail(
  campaignId: string,
  options: UseCampaignDetailOptions = {},
): UseCampaignDetailResult {
  const { now = Date.now, soldOutRefetchIntervalMs = SOLD_OUT_REFETCH_INTERVAL_MS } = options
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
      const claimability = evaluateClaimability(raw, serverNow(now(), offsetMs))
      setState({ status: 'ready', detail: raw, offsetMs, claimability })
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

  const isSoldOut = state.status === 'ready' && state.claimability.reason === 'SOLD_OUT'

  // 售罄重取：只在售罄态挂定时器；页面切到后台（不可见）暂停，回到前台先拉一轮再继续。
  useEffect(() => {
    if (!isSoldOut) return

    let timer: ReturnType<typeof setInterval> | null = null
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
    const start = () => {
      if (timer === null) timer = setInterval(() => void load(), soldOutRefetchIntervalMs)
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        void load()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isSoldOut, load, soldOutRefetchIntervalMs])

  return { state, reload: load }
}
