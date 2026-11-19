import type { FlashCampaignDetail } from '@/api/campaign'
import { CLAIM_BLOCK_REASON_LABEL, type ClaimBlockReason } from './claimability'
import type { ClaimState } from './useCampaignClaim'

interface CampaignClaimButtonProps {
  /** 按钮是否可点；false 时必然带 reason。 */
  readonly clickable: boolean
  /** 不可点原因；可点时为 null。 */
  readonly reason: ClaimBlockReason | null
  /** 当前场次数据；#53（未登录、未实名拦截）在这个组件里取用。 */
  readonly detail: FlashCampaignDetail
  /** 抢购提交状态：在途时按钮进入「抢购中」，失败时回到可点并给兜底提示。 */
  readonly claim: ClaimState
  /** 点击抢购。 */
  readonly onClaim: () => void
}

/**
 * 抢购按钮区，独立成组件：上层只传「能不能点 + 原因 + 当前场次数据 + 提交状态」。
 * 在途期间按钮禁用，连点不会触发第二次提交（真正的防重闸口在 useCampaignClaim 的在途标记）。
 */
export function CampaignClaimButton({ clickable, reason, claim, onClaim }: CampaignClaimButtonProps) {
  const pending = claim.phase === 'pending'
  const disabled = !clickable || pending
  const message =
    claim.phase === 'failed'
      ? claim.message
      : reason !== null
        ? CLAIM_BLOCK_REASON_LABEL[reason]
        : null

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : onClaim}
        className="rounded-md bg-accent px-10 py-3 text-base font-medium text-ink-950 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '抢购中…' : '立即抢购'}
      </button>
      {message !== null && <p className="text-sm text-neutral-400">{message}</p>}
    </div>
  )
}
