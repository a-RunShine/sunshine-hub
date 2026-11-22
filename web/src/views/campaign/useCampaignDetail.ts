import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { getCampaignDetail, type FlashCampaignDetail } from '@/api/campaign'
import { evaluateClaimability, type Claimability } from './claimability'
import { isBeforeStart } from './reserve'
import { computeOffsetMs, serverNow } from './serverClock'

export type CampaignPageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      detail: FlashCampaignDetail
      offsetMs: number
      claimability: Claimability
      beforeStart: boolean
      loadEpoch: number
    }

export interface UseCampaignDetailOptions {
  readonly now?: () => number
}

export interface UseCampaignDetailResult {
  readonly state: CampaignPageState
  readonly reload: () => void
}

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
      if (seq !== requestSeq.current) return
      if (raw.type !== 'FLASH') {
        setState({ status: 'error', message: '该场次不是限时抢购' })
        return
      }
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
      setState({ status: 'error', message: errorMessage(error) })
    }
  }, [campaignId, now])

  useEffect(() => {
    setState({ status: 'loading' })
    void load()
  }, [load])

  return { state, reload: load }
}
