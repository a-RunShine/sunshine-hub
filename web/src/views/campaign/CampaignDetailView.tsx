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
  /** 未开售；开售后预约入口消失。 */
  readonly beforeStart?: boolean
  /** 预约 / 取消请求在途。 */
  readonly reserving?: boolean
  /** 预约 / 取消失败的提示；null 表示无错误。 */
  readonly reserveError?: string | null
  readonly onReserve?: () => void
  readonly onCancelReserve?: () => void
  readonly onRequireLogin?: () => void
}

/** 有数据时的展示：场次名、剩余份数（配额口径）、倒计时、预约入口区、抢购按钮区 / 成功结果面板。 */
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
    <section className="flex flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-center text-2xl font-medium tracking-tight text-foreground">{detail.name}</h1>
      <p className="text-sm text-muted">
        剩余份数：<span className="text-foreground">{detail.allocation.available}</span> 份
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
