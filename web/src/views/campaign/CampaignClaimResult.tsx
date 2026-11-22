import type { ClaimResult } from '@/api/campaign'
import { ActionLink } from '@/components/common/ActionButton'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { CampaignCountdown } from './CampaignCountdown'

interface CampaignClaimResultProps {
  readonly result: ClaimResult
  readonly offsetMs: number
  readonly now?: () => number
}

export function CampaignClaimResult({ result, offsetMs, now }: CampaignClaimResultProps) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[2px] border border-accent/35 border-t-2 border-t-accent bg-[#111513] px-8 py-6">
      <DiagonalSurface variant="band" />
      <p className="relative z-[2] text-base font-semibold text-foreground">抢到了</p>
      <p className="relative z-[2] text-sm text-muted">
        收藏编号：<span className="font-mono text-lg text-accent">{result.collectibleNumber}</span>
      </p>
      <div className="relative z-[2]">
        <CampaignCountdown
          target={result.payDeadline}
          offsetMs={offsetMs}
          label="付款剩余"
          now={now}
        />
      </div>
      <ActionLink
        to={`/orders/${encodeURIComponent(result.orderNo)}`}
        intent="link"
        className="relative z-[2] text-accent"
      >
        去订单详情付款
      </ActionLink>
    </div>
  )
}
