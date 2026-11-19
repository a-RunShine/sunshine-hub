import { useEffect, useRef } from 'react'
import type { ClaimState } from './useCampaignClaim'
import type { CampaignPageState } from './useCampaignDetail'

/**
 * 可恢复失败态自动解除：失败之后又有一轮新详情回来、且按钮口径回到可点时，清掉失败 overlay。
 * 解除门槛是「失败后的新详情轮次」：失败前的旧详情不能提前解除，避免服务端仍售罄 / 冷却而
 * 前端误判可点。页面层与测试 harness 共用这一套判定。
 */
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
