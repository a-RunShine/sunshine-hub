import { Link, useParams } from 'react-router-dom'
import { useCampaignDetail } from './useCampaignDetail'
import { CampaignDetailView } from './CampaignDetailView'

/**
 * 抢购页路由入口。只负责取数状态分支（加载中 / 不存在 / 错误 / 有数据），
 * 具体展示交给 CampaignDetailView，按钮区交给 CampaignClaimButton。
 */
export default function CampaignPage() {
  const { campaignId = '' } = useParams<{ campaignId: string }>()
  const { state, reload } = useCampaignDetail(campaignId)

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
      />
    </main>
  )
}
