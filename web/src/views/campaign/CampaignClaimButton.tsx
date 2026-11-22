import { ActionButton } from '@/components/common/ActionButton'
import { CLAIM_BLOCK_REASON_LABEL, type ClaimBlockReason } from './claimability'
import type { ClaimState } from './useCampaignClaim'

interface CampaignClaimButtonProps {
  readonly clickable: boolean
  readonly reason: ClaimBlockReason | null
  readonly claim: ClaimState
  readonly onClaim: () => void
}

export function CampaignClaimButton({ clickable, reason, claim, onClaim }: CampaignClaimButtonProps) {
  const pending = claim.phase === 'pending'
  const failure = claim.phase === 'failed' ? claim.failure : null
  const disabled = !clickable || pending || (failure !== null && !failure.clickableAfter)

  return (
    <div className="flex flex-col items-center gap-3">
      <ActionButton
        intent="primary"
        disabled={disabled}
        onClick={disabled ? undefined : onClaim}
        className="px-10 py-3 text-base"
      >
        {pending ? '抢购中…' : '立即抢购'}
      </ActionButton>
      {failure !== null ? (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted">{failure.summary}</p>
          <p className="text-xs text-faint">{failure.nextStep}</p>
        </div>
      ) : reason !== null ? (
        <p className="text-sm text-muted">{CLAIM_BLOCK_REASON_LABEL[reason]}</p>
      ) : null}
    </div>
  )
}
