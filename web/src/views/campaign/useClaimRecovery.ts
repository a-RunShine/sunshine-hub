import { useEffect, useRef } from 'react'
import type { ClaimState } from './useCampaignClaim'
import type { CampaignPageState } from './useCampaignDetail'

export function useRecoverableFailureReset(
  claim: ClaimState,
  detailState: CampaignPageState,
  clearFailure: () => void,
): void {
  const failureEpochRef = useRef(0)
  const previousPhaseRef = useRef(claim.phase)

  useEffect(() => {
    if (
      previousPhaseRef.current !== 'failed' &&
      claim.phase === 'failed' &&
      claim.failure.recoverable
    ) {
      failureEpochRef.current = detailState.status === 'ready' ? detailState.loadEpoch : 0
    }
    previousPhaseRef.current = claim.phase
  }, [claim, detailState])

  useEffect(() => {
    if (
      claim.phase === 'failed' &&
      claim.failure.recoverable &&
      detailState.status === 'ready' &&
      detailState.claimability.clickable &&
      detailState.loadEpoch > failureEpochRef.current
    ) {
      clearFailure()
    }
  }, [claim, detailState, clearFailure])
}
