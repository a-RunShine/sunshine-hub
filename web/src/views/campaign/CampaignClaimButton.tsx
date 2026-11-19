import type { FlashCampaignDetail } from '@/api/campaign'
import { CLAIM_BLOCK_REASON_LABEL, type ClaimBlockReason } from './claimability'

interface CampaignClaimButtonProps {
  /** 按钮是否可点；false 时必然带 reason。 */
  readonly clickable: boolean
  /** 不可点原因；可点时为 null。 */
  readonly reason: ClaimBlockReason | null
  /** 当前场次数据；#51（成功路径）/ #53（未登录、未实名拦截）只在这个组件里取用。 */
  readonly detail: FlashCampaignDetail
  /** #51 接入点击抢购；本票不传，按钮不产生任何动作。 */
  readonly onClaim?: () => void
}

/**
 * 抢购按钮区，独立成组件：上层只传「能不能点 + 原因 + 当前场次数据」。
 * 点击行为本票留空（不写半截抢购逻辑），后续成功路径与登录 / 实名拦截都只改这里。
 */
export function CampaignClaimButton({ clickable, reason, onClaim }: CampaignClaimButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={!clickable}
        onClick={clickable ? onClaim : undefined}
        className="rounded-md bg-accent px-10 py-3 text-base font-medium text-ink-950 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        立即抢购
      </button>
      {reason !== null && (
        <p className="text-sm text-neutral-400">{CLAIM_BLOCK_REASON_LABEL[reason]}</p>
      )}
    </div>
  )
}
