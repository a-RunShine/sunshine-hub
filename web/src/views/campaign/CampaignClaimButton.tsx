import { ActionButton } from '@/components/common/ActionButton'
import { CLAIM_BLOCK_REASON_LABEL, type ClaimBlockReason } from './claimability'
import type { ClaimState } from './useCampaignClaim'

interface CampaignClaimButtonProps {
  /** 按钮是否可点；false 时必然带 reason。 */
  readonly clickable: boolean
  /** 不可点原因；可点时为 null。 */
  readonly reason: ClaimBlockReason | null
  /** 抢购提交状态：在途时按钮进入「抢购中」，失败时按错误码分流给处置提示。 */
  readonly claim: ClaimState
  /** 点击抢购。 */
  readonly onClaim: () => void
}

/**
 * 抢购按钮区，独立成组件：上层只传「能不能点 + 原因 + 提交状态」。
 * 在途期间按钮禁用，连点不会触发第二次提交（真正的防重闸口在 useCampaignClaim 的在途标记）。
 * 失败后除不可恢复终态外按钮回到可点；可恢复态（售罄 / 冷却）由详情轮询自行恢复。
 */
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
