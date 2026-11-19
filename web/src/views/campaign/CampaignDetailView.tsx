import type { FlashCampaignDetail } from '@/api/campaign'
import type { Claimability } from './claimability'
import type { ClaimState } from './useCampaignClaim'
import { CampaignClaimButton } from './CampaignClaimButton'
import { CampaignClaimResult } from './CampaignClaimResult'
import { CampaignCountdown } from './CampaignCountdown'

interface CampaignDetailViewProps {
  readonly detail: FlashCampaignDetail
  readonly offsetMs: number
  readonly claimability: Claimability
  readonly claim: ClaimState
  readonly onClaim: () => void
}

/** 按当前状态选倒计时目标：未开售对开售时刻，冷却中对冷却到期时刻，进行中对结束时刻。 */
function countdownTarget(
  detail: FlashCampaignDetail,
  reason: Claimability['reason'],
): { target: string | null; label: string } {
  if (reason === 'NOT_STARTED') return { target: detail.startAt, label: '距开售' }
  if (reason === 'COOLDOWN') return { target: detail.cooldownUntil, label: '冷却剩余' }
  if (detail.endAt != null) return { target: detail.endAt, label: '距结束' }
  return { target: null, label: '' }
}

/** 有数据时的展示：场次名、剩余份数（配额口径）、倒计时、抢购按钮区 / 成功结果面板。 */
export function CampaignDetailView({
  detail,
  offsetMs,
  claimability,
  claim,
  onClaim,
}: CampaignDetailViewProps) {
  const countdown = countdownTarget(detail, claimability.reason)

  return (
    <section className="flex flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-center text-2xl font-medium tracking-tight">{detail.name}</h1>
      <p className="text-sm text-neutral-400">
        剩余份数：<span className="text-neutral-100">{detail.allocation.available}</span> 份
      </p>
      <CampaignCountdown target={countdown.target} offsetMs={offsetMs} label={countdown.label} />
      {claim.phase === 'success' ? (
        <CampaignClaimResult result={claim.result} offsetMs={claim.offsetMs} />
      ) : (
        <CampaignClaimButton
          clickable={claimability.clickable}
          reason={claimability.reason}
          detail={detail}
          claim={claim}
          onClaim={onClaim}
        />
      )}
    </section>
  )
}
