import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { cancelReserveCampaign, reserveCampaign } from '@/api/campaign'
import { errorMessage } from '@/api/errors'
import { submitRealName, type RealNameInput } from '@/api/identity'
import { ActionButton, ActionLink } from '@/components/common/ActionButton'
import { buildLoginUrl } from '@/lib/redirect'
import { useAuth } from '@/stores/auth'
import { useCampaignDetail } from './useCampaignDetail'
import { useCampaignClaim } from './useCampaignClaim'
import { useVisibilityPolling, RECOVERABLE_REFETCH_INTERVAL_MS } from './polling'
import { useRecoverableFailureReset } from './useClaimRecovery'
import { isRecoverableBlock } from './claimability'
import { CampaignDetailView } from './CampaignDetailView'
import { CampaignRealNameDialog } from './CampaignRealNameDialog'

export default function CampaignPage() {
  const { campaignId = '' } = useParams<{ campaignId: string }>()
  const { state, reload } = useCampaignDetail(campaignId)

  const [realNameOpen, setRealNameOpen] = useState(false)
  const [realNameSubmitting, setRealNameSubmitting] = useState(false)
  const [realNameError, setRealNameError] = useState<string | null>(null)

  const setMe = useAuth((state) => state.setMe)

  const navigate = useNavigate()
  const location = useLocation()
  const onRequireLogin = useCallback(() => {
    navigate(buildLoginUrl(location))
  }, [navigate, location])

  const { state: claim, claim: runClaim, clearFailure } = useCampaignClaim(campaignId, {
    onClaimed: reload,
    onRealNameRequired: () => setRealNameOpen(true),
    onRequireLogin,
  })

  const detailReason = state.status === 'ready' ? state.claimability.reason : null
  const claimRecoverable = claim.phase === 'failed' && claim.failure.recoverable
  useVisibilityPolling({
    active: isRecoverableBlock(detailReason) || claimRecoverable,
    intervalMs: RECOVERABLE_REFETCH_INTERVAL_MS,
    onTick: reload,
  })

  useRecoverableFailureReset(claim, state, clearFailure)

  const [reserving, setReserving] = useState(false)
  const [reserveError, setReserveError] = useState<string | null>(null)

  const runReserveAction = useCallback(
    async (action: () => Promise<void>) => {
      setReserving(true)
      setReserveError(null)
      try {
        await action()
        await reload()
      } catch (error) {
        setReserveError(errorMessage(error))
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

  const handleClaimClick = useCallback(() => {
    runClaim()
  }, [runClaim])

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
        setRealNameError(errorMessage(error))
      } finally {
        setRealNameSubmitting(false)
      }
    },
    [setMe, runClaim],
  )

  const handleRealNameCancel = useCallback(() => {
    setRealNameOpen(false)
    setRealNameError(null)
  }, [])

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-sm text-muted">
        正在加载场次…
      </main>
    )
  }

  if (state.status === 'not-found') {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-medium text-foreground">场次不存在</h1>
        <p className="text-sm text-muted">你要找的限时抢购场次可能已经下线，或链接有误。</p>
        <ActionLink to="/" intent="link">
          返回首页
        </ActionLink>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-medium text-foreground">暂时看不到这场抢购</h1>
        <p className="text-sm text-danger">{state.message}</p>
        <ActionButton intent="secondary" onClick={() => void reload()}>
          重试
        </ActionButton>
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
