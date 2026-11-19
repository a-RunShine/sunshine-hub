import type { FlashCampaignDetail } from '@/api/campaign'
import { evaluateReserveState } from './reserve'

interface CampaignReserveButtonProps {
  readonly detail: FlashCampaignDetail
  /** 未开售；false（已开售）时整个预约入口不渲染。 */
  readonly beforeStart: boolean
  /** 预约 / 取消请求在途，防止重复点击。 */
  readonly reserving: boolean
  /** 上一次预约 / 取消失败的可理解提示；null 表示无错误。 */
  readonly reserveError: string | null
  /** 已登录未预约时点击预约。 */
  readonly onReserve?: () => void
  /** 已预约时点击取消预约。 */
  readonly onCancelReserve?: () => void
  /** 匿名点击预约；由上层走登录回跳（与 401 拦截器、RequireAuth 同一套口径）。 */
  readonly onRequireLogin?: () => void
}

/**
 * 预约入口区，与抢购按钮区平行独立。三态按 `reserved` 分开呈现：
 * - 匿名（`null`）：显示预约入口，点击先走登录再回到本场次（不发预约请求）；
 * - 已登录未预约（`false`）：点击预约；
 * - 已预约（`true`）：点击取消预约。
 *
 * 开售后入口整体消失（`beforeStart === false`），不与抢购按钮同时出现。
 * 预约不占库存、不影响抢购按钮可点性，见契约与 #54 口径。
 */
export function CampaignReserveButton({
  detail,
  beforeStart,
  reserving,
  reserveError,
  onReserve,
  onCancelReserve,
  onRequireLogin,
}: CampaignReserveButtonProps) {
  // 已开售：预约入口不出现
  if (!beforeStart) return null

  const state = evaluateReserveState(detail.reserved)

  return (
    <div className="flex flex-col items-center gap-2">
      {state === 'reserved' ? (
        <button
          type="button"
          disabled={reserving}
          onClick={onCancelReserve}
          className="rounded-md border border-neutral-700 px-6 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          取消预约
        </button>
      ) : (
        <button
          type="button"
          disabled={reserving}
          onClick={state === 'anonymous' ? onRequireLogin : onReserve}
          className="rounded-md border border-neutral-700 px-6 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          预约
        </button>
      )}
      {reserveError !== null && <p className="text-sm text-red-400">{reserveError}</p>}
    </div>
  )
}
