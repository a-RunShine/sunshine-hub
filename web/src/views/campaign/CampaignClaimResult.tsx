import type { ClaimResult } from '@/api/campaign'
import { ActionLink } from '@/components/common/ActionButton'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { CampaignCountdown } from './CampaignCountdown'

interface CampaignClaimResultProps {
  /** 抢购成功响应：编号、订单号、付款截止时间、服务端时间。 */
  readonly result: ClaimResult
  /** 按抢购响应 `serverTime` 重算的服务端时间偏移（毫秒），与只读态同一套校准。 */
  readonly offsetMs: number
  /** 注入当前时刻；默认 Date.now，测试可冻结时间。 */
  readonly now?: () => number
}

/**
 * 抢购成功结果面板：收藏编号按契约字符串原样展示（前导零有意义，不做数字化处理），
 * 付款截止倒计时走服务端时间偏移，入口指向既有订单详情路由。
 */
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
