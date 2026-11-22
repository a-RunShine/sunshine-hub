import type { FlashCampaignDetail } from '@/api/campaign'
import { countdownTargetFor, type Claimability } from './claimability'
import type { ClaimState } from './useCampaignClaim'
import { CampaignClaimButton } from './CampaignClaimButton'
import { CampaignClaimResult } from './CampaignClaimResult'
import { CampaignCountdown } from './CampaignCountdown'
import { CampaignReserveButton } from './CampaignReserveButton'

interface CampaignDetailViewProps {
  readonly detail: FlashCampaignDetail
  readonly offsetMs: number
  readonly claimability: Claimability
  readonly claim: ClaimState
  readonly onClaim: () => void
  readonly beforeStart?: boolean
  readonly reserving?: boolean
  readonly reserveError?: string | null
  readonly onReserve?: () => void
  readonly onCancelReserve?: () => void
  readonly onRequireLogin?: () => void
}

export function CampaignDetailView({
  detail,
  offsetMs,
  claimability,
  claim,
  onClaim,
  beforeStart = false,
  reserving = false,
  reserveError = null,
  onReserve,
  onCancelReserve,
  onRequireLogin,
}: CampaignDetailViewProps) {
  const countdown = countdownTargetFor(detail, claimability.reason)

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">{detail.name}</h1>
      <p className="text-[15px] text-[#c4cac6]">
        剩余份数：<span className="font-mono font-semibold text-foreground">{detail.allocation.available}</span> 份
      </p>
      <CampaignCountdown target={countdown.target} offsetMs={offsetMs} label={countdown.label} />
      <CampaignReserveButton
        detail={detail}
        beforeStart={beforeStart}
        reserving={reserving}
        reserveError={reserveError}
        onReserve={onReserve}
        onCancelReserve={onCancelReserve}
        onRequireLogin={onRequireLogin}
      />
      {claim.phase === 'success' ? (
        <CampaignClaimResult result={claim.result} offsetMs={claim.offsetMs} />
      ) : (
        <CampaignClaimButton
          clickable={claimability.clickable}
          reason={claimability.reason}
          claim={claim}
          onClaim={onClaim}
        />
      )}
    </section>
  )
}
