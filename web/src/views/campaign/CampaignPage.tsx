import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { cancelReserveCampaign, reserveCampaign } from '@/api/campaign'
import { buildLoginUrl } from '@/lib/redirect'
import { useCampaignDetail } from './useCampaignDetail'
import { CampaignDetailView } from './CampaignDetailView'

/**
 * 抢购页路由入口。只负责取数状态分支（加载中 / 不存在 / 错误 / 有数据），
 * 具体展示交给 CampaignDetailView，按钮区交给 CampaignClaimButton。
 */
export default function CampaignPage() {
  const { campaignId = '' } = useParams<{ campaignId: string }>()
  const { state, reload } = useCampaignDetail(campaignId)

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
