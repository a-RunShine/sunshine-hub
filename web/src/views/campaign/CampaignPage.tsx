import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { cancelReserveCampaign, reserveCampaign } from '@/api/campaign'
import { submitRealName, type RealNameInput } from '@/api/identity'
import { buildLoginUrl } from '@/lib/redirect'
import { useAuth } from '@/stores/auth'
import { useCampaignDetail } from './useCampaignDetail'
import { useCampaignClaim } from './useCampaignClaim'
import { CampaignDetailView } from './CampaignDetailView'
import { CampaignRealNameDialog } from './CampaignRealNameDialog'

/**
 * 抢购页路由入口。只负责取数状态分支（加载中 / 不存在 / 错误 / 有数据），
 * 具体展示交给 CampaignDetailView，按钮区交给 CampaignClaimButton。
 */
export default function CampaignPage() {
  const { campaignId = '' } = useParams<{ campaignId: string }>()
  const { state, reload } = useCampaignDetail(campaignId)

  // 实名弹窗状态：页面内状态，刷新就该丢掉；实名态本身留在 auth store。
  const [realNameOpen, setRealNameOpen] = useState(false)
  const [realNameSubmitting, setRealNameSubmitting] = useState(false)
  const [realNameError, setRealNameError] = useState<string | null>(null)

  const setMe = useAuth((state) => state.setMe)
  const isLoggedIn = useAuth((state) => state.isLoggedIn)
  const needRealName = useAuth((state) => state.needRealName)

  // 抢购成功后重新拉一次详情，刷新剩余份数 / 剩余本场额度；提交状态留在页面内，不进全局 store。
  const { state: claim, claim: runClaim } = useCampaignClaim(campaignId, {
    onClaimed: reload,
    // 本地会话态与服务端脱节：服务端回 403 未实名，与本地预判走同一个开表单入口。
    onRealNameRequired: () => setRealNameOpen(true),
  })

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

  // 匿名点预约 / 抢购：与 401 拦截器、RequireAuth 同一套回跳口径，登录后回到本场次。
  const navigate = useNavigate()
  const location = useLocation()
  const onRequireLogin = useCallback(() => {
    navigate(buildLoginUrl(location))
  }, [navigate, location])

  // 点击抢购的拦截闸口：匿名先走登录回跳；未实名先弹表单；都满足才真正发抢购请求。
  // 按钮全程可点，拦截发生在点击之后（ADR-0009）。
  const handleClaimClick = useCallback(() => {
    if (!isLoggedIn()) {
      onRequireLogin()
      return
    }
    if (needRealName()) {
      setRealNameError(null)
      setRealNameOpen(true)
      return
    }
    runClaim()
  }, [isLoggedIn, needRealName, onRequireLogin, runClaim])

  // 实名提交成功：用回写的最新购买人档案更新 store 实名态，关掉表单后重放抢购；
  // 重放仍走 useCampaignClaim 的同一条 claim()，防重闸口与状态机不绕开。
  const handleRealNameSubmit = useCallback(
    async (input: RealNameInput) => {
      setRealNameSubmitting(true)
      setRealNameError(null)
      try {
        const updated = await submitRealName(input)
        setMe(updated)
        setRealNameOpen(false)
        runClaim()
      } catch (error) {
        setRealNameError(error instanceof ApiError ? error.message : '网络出了点问题')
      } finally {
        setRealNameSubmitting(false)
      }
    },
    [setMe, runClaim],
  )

  // 放弃填写：关掉表单并清掉错误，按钮回到可点态，不留半开弹窗或卡住的 loading。
  const handleRealNameCancel = useCallback(() => {
    setRealNameOpen(false)
    setRealNameError(null)
  }, [])

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
        onClaim={handleClaimClick}
        beforeStart={state.beforeStart}
        reserving={reserving}
        reserveError={reserveError}
        onReserve={onReserve}
        onCancelReserve={onCancelReserve}
        onRequireLogin={onRequireLogin}
      />
      <CampaignRealNameDialog
        open={realNameOpen}
        submitting={realNameSubmitting}
        error={realNameError}
        onSubmit={(input) => void handleRealNameSubmit(input)}
        onCancel={handleRealNameCancel}
      />
    </main>
  )
}
