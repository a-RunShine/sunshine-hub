import type { FlashCampaignDetail } from '@/api/campaign'
import { ActionButton } from '@/components/common/ActionButton'
import { evaluateReserveState } from './reserve'

interface CampaignReserveButtonProps {
  readonly detail: FlashCampaignDetail
  readonly beforeStart: boolean
  readonly reserving: boolean
  readonly reserveError: string | null
  readonly onReserve?: () => void
  readonly onCancelReserve?: () => void
  readonly onRequireLogin?: () => void
}

export function CampaignReserveButton({
  detail,
  beforeStart,
  reserving,
  reserveError,
  onReserve,
  onCancelReserve,
  onRequireLogin,
}: CampaignReserveButtonProps) {
  if (!beforeStart) return null

  const state = evaluateReserveState(detail.reserved)

  return (
    <div className="flex flex-col items-center gap-2">
      {state === 'reserved' ? (
        <ActionButton intent="secondary" disabled={reserving} onClick={onCancelReserve}>
          取消预约
        </ActionButton>
      ) : (
        <ActionButton
          intent="secondary"
          disabled={reserving}
          onClick={state === 'anonymous' ? onRequireLogin : onReserve}
        >
          预约
        </ActionButton>
      )}
      {reserveError !== null && <p className="text-sm text-red-400">{reserveError}</p>}
    </div>
  )
}
