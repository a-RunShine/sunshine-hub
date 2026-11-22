import { useCallback, useEffect, useRef, useState } from 'react'
import { postCampaignClaim, type ClaimResult } from '@/api/campaign'
import { ApiError } from '@/api/client'
import { computeOffsetMs } from './serverClock'
import { classifyClaimError, type ClaimFailure } from './claimFailure'

export type ClaimState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'pending' }
  | { readonly phase: 'success'; readonly result: ClaimResult; readonly offsetMs: number }
  | { readonly phase: 'failed'; readonly failure: ClaimFailure }

export interface UseCampaignClaimOptions {
  readonly now?: () => number
  readonly onClaimed?: () => void
  readonly onRealNameRequired?: () => void
  readonly onRequireLogin?: () => void
}

export interface UseCampaignClaimResult {
  readonly state: ClaimState
  readonly claim: () => void
  readonly clearFailure: () => void
}

export function useCampaignClaim(
  campaignId: string,
  options: UseCampaignClaimOptions = {},
): UseCampaignClaimResult {
  const { now = Date.now, onClaimed, onRealNameRequired, onRequireLogin } = options
  const [state, setState] = useState<ClaimState>({ phase: 'idle' })
  const inFlightRef = useRef(false)

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
          setState({ phase: 'idle' })
          onRealNameRequired?.()
          return
        }
        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
          setState({ phase: 'idle' })
          onRequireLogin?.()
          return
        }
        const failure = classifyClaimError(error)
        setState({ phase: 'failed', failure })
      } finally {
        inFlightRef.current = false
      }
    })()
  }, [campaignId, now, onClaimed, onRealNameRequired, onRequireLogin])

  const clearFailure = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  return { state, claim, clearFailure }
}
