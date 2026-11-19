import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { cancelReserveCampaign, reserveCampaign } from '@/api/campaign'
import { buildLoginUrl } from '@/lib/redirect'
import { useCampaignDetail } from './useCampaignDetail'
import { useCampaignClaim } from './useCampaignClaim'
import { useVisibilityPolling, RECOVERABLE_REFETCH_INTERVAL_MS } from './polling'
import { useRecoverableFailureReset } from './useClaimRecovery'
import { CampaignDetailView } from './CampaignDetailView'

/**
 * 抢购页路由入口。只负责取数状态分支（加载中 / 不存在 / 错误 / 有数据），
 * 具体展示交给 CampaignDetailView，按钮区交给 CampaignClaimButton。
 */
export default function CampaignPage() {
  const { campaignId = '' } = useParams<{ campaignId: string }>()
  const { state, reload } = useCampaignDetail(campaignId)
  // 抢购成功后重新拉一次详情，刷新剩余份数 / 剩余本场额度；提交状态留在页面内，不进全局 store。
  const { state: claim, claim: onClaim, clearFailure } = useCampaignClaim(campaignId, {
    onClaimed: reload,
  })

  // 可恢复态（售罄配额回流 / 冷却到期）统一挂一套可见性轮询：详情口径与抢购失败口径任一命中即开启，
  // 配额回升 / 到期后按钮自行恢复可点；轮询只在可恢复态运行，页面不可见时暂停，卸载时清理。
  const detailReason = state.status === 'ready' ? state.claimability.reason : null
  const claimRecoverable = claim.phase === 'failed' && claim.failure.recoverable
  useVisibilityPolling({
    active: detailReason === 'SOLD_OUT' || detailReason === 'COOLDOWN' || claimRecoverable,
    intervalMs: RECOVERABLE_REFETCH_INTERVAL_MS,
    onTick: reload,
  })

  // 可恢复失败态解除：失败后新一轮详情回到可点口径时，清掉失败 overlay（门槛与判定见共享 hook）。
  useRecoverableFailureReset(claim, state, clearFailure)

  const [reserving, setReserving] = useState(false)
  const [reserveError, setReserveError] = useState<string | null>(null)

  /**
   * 预约 / 取消预约：204 无响应体，成功后重拉详情把 `reserved` 刷成新值；
   * 失败时给一句可理解的提示，界面状态不与服务端脱节（不做乐观更新）。
   */
  const runReserveAction = useCallback(
    async (action: () => Promise<void>) => {
      setReserving(true)
      setReserveError(null)
      try {
        await action()
        await reload()
      } catch (error) {
        setReserveError(error instanceof ApiError ? error.message : '网络出了点问题')
      } finally {
        setReserving(false)
      }
    },
    [reload],
  )

  const onReserve = useCallback(
    () => void runReserveAction(() => reserveCampaign(campaignId)),
    [campaignId, runReserveAction],
  )
  const onCancelReserve = useCallback(
    () => void runReserveAction(() => cancelReserveCampaign(campaignId)),
    [campaignId, runReserveAction],
  )

  // 匿名点预约：与 401 拦截器、RequireAuth 同一套回跳口径，登录后回到本场次；
  // 本票不做未实名拦截（#53）。
  const navigate = useNavigate()
  const location = useLocation()
  const onRequireLogin = useCallback(() => {
    navigate(buildLoginUrl(location))
  }, [navigate, location])

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-sm text-neutral-400">
        正在加载场次…
      </main>
    )
  }

  if (state.status === 'not-found') {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-medium">场次不存在</h1>
        <p className="text-sm text-neutral-400">你要找的限时抢购场次可能已经下线，或链接有误。</p>
        <Link to="/" className="text-sm text-accent hover:underline">
          返回首页
        </Link>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-medium">暂时看不到这场抢购</h1>
        <p className="text-sm text-neutral-400">{state.message}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-md border border-neutral-700 px-4 py-2 text-neutral-200 hover:border-neutral-500"
        >
          重试
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl">
      <CampaignDetailView
        detail={state.detail}
        offsetMs={state.offsetMs}
        claimability={state.claimability}
        claim={claim}
        onClaim={onClaim}
        beforeStart={state.beforeStart}
        reserving={reserving}
        reserveError={reserveError}
        onReserve={onReserve}
        onCancelReserve={onCancelReserve}
        onRequireLogin={onRequireLogin}
      />
    </main>
  )
}
