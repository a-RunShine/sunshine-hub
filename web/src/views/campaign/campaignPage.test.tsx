import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { ClaimResult, FlashCampaignDetail } from '@/api/campaign'
import { scenarios } from '@/mocks/scenarios'
import { useAuth } from '@/stores/auth'
import { CampaignDetailView } from './CampaignDetailView'
import { useCampaignDetail } from './useCampaignDetail'
import { useCampaignClaim } from './useCampaignClaim'
import { useRecoverableFailureReset } from './useClaimRecovery'
import { useVisibilityPolling } from './polling'
import { isRecoverableBlock } from './claimability'
import {
  createCampaignTestServer,
  registerCampaignTestServer,
  renderCampaignPage,
  setScenario,
} from './campaignTestHarness'

const testServer = createCampaignTestServer()
registerCampaignTestServer(testServer.server, testServer.counters)

function loginVerified() {
  useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: true })
  useAuth.getState().setStatus('ready')
}

const getButton = () => screen.getByRole('button', { name: '立即抢购' })

function ongoingDetail(overrides: Partial<FlashCampaignDetail> = {}): FlashCampaignDetail {
  return {
    id: 201,
    name: '暗夜猎手 加场（进行中）',
    type: 'FLASH',
    productId: 1,
    startAt: new Date(Date.now() - 1800_000).toISOString(),
    endAt: null,
    status: 'ONGOING',
    serverTime: new Date().toISOString(),
    allocation: { total: 2000, available: 1200, occupied: 800, pendingRepool: 0, sold: 0 },
    campaignLimit: 2,
    remainingCampaignLimit: 1,
    cooldownUntil: null,
    reserved: false,
    ...overrides,
  }
}

const successClaim: ClaimResult = {
  orderNo: 'SO1001',
  collectibleNumber: '0427',
  payDeadline: new Date(Date.now() + 900_000).toISOString(),
  serverTime: new Date().toISOString(),
}

describe('五种不可点态', () => {
  it('未开售：UPCOMING，按钮禁用并给出「未开售」原因，倒计时指向开售时刻', async () => {
    setScenario('detail-upcoming')
    renderCampaignPage('101')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 首发（未开售）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('未开售')).toBeInTheDocument()
    expect(screen.getByText(/距开售/)).toBeInTheDocument()
  })

  it('已结束：ENDED，按钮禁用并给出「已结束」原因', async () => {
    setScenario('detail-ended')
    renderCampaignPage('102')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 收官场（已结束）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('已结束')).toBeInTheDocument()
  })

  it('售罄：allocation.available 为 0，按钮禁用并给出「售罄」原因', async () => {
    setScenario('detail-sold-out')
    renderCampaignPage('103')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 加场（售罄）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('售罄')).toBeInTheDocument()
  })

  it('剩余本场额度用尽：remainingCampaignLimit 为 0，按钮禁用；不出现冷却文案', async () => {
    setScenario('detail-limit-reached')
    renderCampaignPage('104')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 返场（额度用尽）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('剩余本场额度已用尽')).toBeInTheDocument()
    expect(screen.queryByText('购买冷却中')).not.toBeInTheDocument()
  })

  it('购买冷却：cooldownUntil 为未来时刻，按钮禁用并给出「购买冷却中」原因', async () => {
    setScenario('detail-cooldown')
    renderCampaignPage('106')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 返场（冷却演示）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('购买冷却中')).toBeInTheDocument()
  })
})

describe('匿名访问', () => {
  it('按钮保持可点，且不显示「剩余本场额度用尽」与「购买冷却中」', async () => {
    testServer.server.use(
      http.get('/api/campaigns/4', () =>
        HttpResponse.json({
          id: 4,
          name: '暗夜猎手 加场',
          type: 'FLASH',
          productId: 1,
          startAt: new Date(Date.now() - 1800_000).toISOString(),
          endAt: null,
          status: 'ONGOING',
          serverTime: new Date().toISOString(),
          allocation: { total: 3000, available: 2960, occupied: 40, pendingRepool: 0, sold: 0 },
          campaignLimit: 2,
          remainingCampaignLimit: null,
          cooldownUntil: null,
          reserved: null,
        }),
      ),
    )

    renderCampaignPage('4')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 加场' })).toBeInTheDocument()
    expect(getButton()).toBeEnabled()
    expect(screen.queryByText('剩余本场额度已用尽')).not.toBeInTheDocument()
    expect(screen.queryByText('购买冷却中')).not.toBeInTheDocument()
  })
})

describe('售罄恢复', () => {
  it('配额回升后重新取数，按钮从禁用恢复为可点', async () => {
    const soldOut = scenarios.find((item) => item.id === 'detail-sold-out')!.campaignDetail!
    let requests = 0
    testServer.server.use(
      http.get('/api/campaigns/103', () => {
        requests += 1
        if (requests === 1) return HttpResponse.json(soldOut)
        return HttpResponse.json({
          ...soldOut,
          allocation: { ...soldOut.allocation, available: 300 },
        })
      }),
    )

    function RecoveryHarness() {
      const { state, reload } = useCampaignDetail('103')
      const reason = state.status === 'ready' ? state.claimability.reason : null
      useVisibilityPolling({
        active: isRecoverableBlock(reason),
        intervalMs: 200,
        onTick: reload,
      })
      if (state.status === 'loading') return <p>加载中</p>
      if (state.status === 'error') return <p>{state.message}</p>
      if (state.status === 'not-found') return <p>场次不存在</p>
      return (
        <CampaignDetailView
          detail={state.detail}
          offsetMs={state.offsetMs}
          claimability={state.claimability}
          claim={{ phase: 'idle' }}
          onClaim={() => {}}
        />
      )
    }

    render(<RecoveryHarness />)

    expect(await screen.findByText('售罄')).toBeInTheDocument()
    expect(getButton()).toBeDisabled()

    await waitFor(() => expect(getButton()).toBeEnabled(), { timeout: 1500 })
  })
})

describe('场次不存在', () => {
  it('404 CAMPAIGN_NOT_FOUND 显示可理解的提示，不白屏不崩', async () => {
    renderCampaignPage('999')

    expect(await screen.findByRole('heading', { name: '场次不存在' })).toBeInTheDocument()
    expect(screen.getByText('你要找的限时抢购场次可能已经下线，或链接有误。')).toBeInTheDocument()
  })
})

describe('倒计时服务端校准', () => {
  it('本机时间被调快时，倒计时按 serverTime 偏移后的口径计算', async () => {
    const localClock = new Date('2026-01-01T12:00:00.000Z').getTime()
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(localClock)
    testServer.server.use(
      http.get('/api/campaigns/777', () =>
        HttpResponse.json({
          id: 777,
          name: '校准场次',
          type: 'FLASH',
          productId: 1,
          startAt: '2026-01-01T11:00:00.000Z',
          endAt: null,
          status: 'UPCOMING',
          serverTime: '2026-01-01T10:00:00.000Z',
          allocation: { total: 100, available: 90, occupied: 10, pendingRepool: 0, sold: 0 },
          campaignLimit: 2,
          remainingCampaignLimit: 1,
          cooldownUntil: null,
          reserved: null,
        }),
      ),
    )

    try {
      renderCampaignPage('777')
      expect(await screen.findByText('01:00:00')).toBeInTheDocument()
    } finally {
      dateNowSpy.mockRestore()
    }
  })
})

describe('抢购防重复提交', () => {
  it('在途期间连点三次只发出一个抢购请求，按钮显示进行中且禁用', async () => {
    let claimCalls = 0
    const resolveClaimRef: { current: ((response: Response) => void) | null } = { current: null }
    const claimPending = new Promise<Response>((resolve) => {
      resolveClaimRef.current = resolve
    })

    testServer.server.use(
      http.get('/api/campaigns/201', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/201/claim', () => {
        claimCalls += 1
        return claimPending
      }),
    )

    loginVerified()
    renderCampaignPage('201')
    const button = await screen.findByRole('button', { name: '立即抢购' })
    expect(button).toBeEnabled()

    fireEvent.click(button)
    const pendingButton = await screen.findByRole('button', { name: '抢购中…' })
    expect(pendingButton).toBeDisabled()

    fireEvent.click(pendingButton)
    fireEvent.click(pendingButton)
    expect(claimCalls).toBe(1)

    resolveClaimRef.current?.(HttpResponse.json(successClaim, { status: 201 }))
    expect(await screen.findByText('0427')).toBeInTheDocument()
    expect(claimCalls).toBe(1)
  })
})

describe('抢购成功展示', () => {
  it('收藏编号逐字展示保留前导零，给出订单详情入口且 href 正确，付款倒计时在走', async () => {
    testServer.server.use(
      http.get('/api/campaigns/202', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/202/claim', () =>
        HttpResponse.json(successClaim, { status: 201 }),
      ),
    )

    loginVerified()
    renderCampaignPage('202')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    expect(await screen.findByText('0427')).toBeInTheDocument()
    expect(screen.queryByText('427')).not.toBeInTheDocument()

    const orderLink = screen.getByRole('link', { name: '去订单详情付款' })
    expect(orderLink).toHaveAttribute('href', '/orders/SO1001')
    expect(screen.getByText(/付款剩余/)).toBeInTheDocument()
  })

  it('付款倒计时按响应 serverTime 偏移后的服务端口径计算，不读裸本机时间', async () => {
    const localClock = new Date('2026-01-01T12:00:00.000Z').getTime()
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(localClock)
    const serverTime = '2026-01-01T10:00:00.000Z'
    const payDeadline = '2026-01-01T11:00:00.000Z'

    testServer.server.use(
      http.get('/api/campaigns/203', () =>
        HttpResponse.json(ongoingDetail({ serverTime })),
      ),
      http.post('/api/campaigns/203/claim', () =>
        HttpResponse.json(
          { orderNo: 'SO1001', collectibleNumber: '0427', payDeadline, serverTime },
          { status: 201 },
        ),
      ),
    )

    try {
      loginVerified()
      renderCampaignPage('203')
      fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
      expect(await screen.findByText('01:00:00')).toBeInTheDocument()
    } finally {
      dateNowSpy.mockRestore()
    }
  })
})

interface FailureCase {
  readonly code: string
  readonly status: number
  readonly message: string
  readonly summary: string
  readonly enabled: boolean
  readonly keepServerMessage?: boolean
}

const failureCases: readonly FailureCase[] = [
  { code: 'ALREADY_PURCHASED', status: 409, message: '这件商品你已经买过了', summary: '本场额度已用尽', enabled: false },
  { code: 'SOLD_OUT', status: 410, message: '已经抢完了', summary: '售罄', enabled: false },
  { code: 'CAMPAIGN_NOT_STARTED', status: 409, message: '还没到开售时间', summary: '还没开售', enabled: false },
  { code: 'CAMPAIGN_ENDED', status: 409, message: '本场已经结束', summary: '本场已结束', enabled: false },
  { code: 'PURCHASE_COOLDOWN', status: 409, message: '这件商品处于购买冷却期，到期后自动恢复可购', summary: '购买冷却中', enabled: false },
  { code: 'UNIT_POOL_INCONSISTENT', status: 500, message: '编号池与配额不同步', summary: '编号池与配额不同步', enabled: true, keepServerMessage: true },
  { code: 'INTERNAL_ERROR', status: 500, message: '服务出了点问题', summary: '服务出了点问题', enabled: true, keepServerMessage: true },
  { code: 'RATE_LIMITED', status: 429, message: '操作太快了，歇一下再试', summary: '操作太快了，歇一下再试', enabled: true, keepServerMessage: true },
]

describe('抢购失败按错误码分流', () => {
  it.each(failureCases)(
    '$code：按码分流展示对应处置，按钮可点口径正确',
    async ({ status, code, message, summary, enabled, keepServerMessage }) => {
      const campaignId = `fail-${code}`
      testServer.server.use(
        http.get(`/api/campaigns/${campaignId}`, () => HttpResponse.json(ongoingDetail())),
        http.post(`/api/campaigns/${campaignId}/claim`, () =>
          HttpResponse.json({ code, message }, { status }),
        ),
      )

      loginVerified()
      renderCampaignPage(campaignId)
      fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

      const retryButton = await screen.findByRole('button', { name: '立即抢购' })
      if (enabled) {
        expect(retryButton).toBeEnabled()
      } else {
        expect(retryButton).toBeDisabled()
      }
      expect(screen.getByText(summary)).toBeInTheDocument()
      if (keepServerMessage) {
        expect(screen.getByText(message)).toBeInTheDocument()
      }
    },
  )

  it('限流失败后再次点击能发出第二次抢购请求，前一次失败提示被新操作清掉', async () => {
    let claimCalls = 0
    testServer.server.use(
      http.get('/api/campaigns/321', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/321/claim', () => {
        claimCalls += 1
        return HttpResponse.json(
          { code: 'RATE_LIMITED', message: '操作太快了，歇一下再试' },
          { status: 429 },
        )
      }),
    )

    loginVerified()
    renderCampaignPage('321')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    const retryButton = await screen.findByRole('button', { name: '立即抢购' })
    expect(retryButton).toBeEnabled()
    expect(screen.getByText('操作太快了，歇一下再试')).toBeInTheDocument()

    fireEvent.click(retryButton)
    await waitFor(() => expect(claimCalls).toBe(2))
  })
})

function RecoveryHarness({ campaignId }: { campaignId: string }) {
  const { state, reload } = useCampaignDetail(campaignId)
  const { state: claim, claim: onClaim, clearFailure } = useCampaignClaim(campaignId, {
    onClaimed: reload,
  })
  const reason = state.status === 'ready' ? state.claimability.reason : null
  const claimRecoverable = claim.phase === 'failed' && claim.failure.recoverable
  useVisibilityPolling({
    active: isRecoverableBlock(reason) || claimRecoverable,
    intervalMs: 200,
    onTick: reload,
  })
  useRecoverableFailureReset(claim, state, clearFailure)
  if (state.status === 'loading') return <p>加载中</p>
  if (state.status === 'error') return <p>{state.message}</p>
  if (state.status === 'not-found') return <p>场次不存在</p>
  return (
    <CampaignDetailView
      detail={state.detail}
      offsetMs={state.offsetMs}
      claimability={state.claimability}
      claim={claim}
      onClaim={onClaim}
    />
  )
}

describe('可恢复态自行恢复', () => {
  it('抢购回 SOLD_OUT：进入售罄态，重取详情后配额回升，按钮自行恢复可点', async () => {
    let detailRequests = 0
    testServer.server.use(
      http.get('/api/campaigns/301', () => {
        detailRequests += 1
        return HttpResponse.json(
          detailRequests === 1
            ? ongoingDetail()
            : ongoingDetail({
                allocation: { total: 2000, available: 300, occupied: 1700, pendingRepool: 0, sold: 0 },
              }),
        )
      }),
      http.post('/api/campaigns/301/claim', () =>
        HttpResponse.json({ code: 'SOLD_OUT', message: '已经抢完了' }, { status: 410 }),
      ),
    )

    render(<RecoveryHarness campaignId="301" />)
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    expect(await screen.findByText('售罄')).toBeInTheDocument()
    expect(getButton()).toBeDisabled()

    await waitFor(() => expect(getButton()).toBeEnabled(), { timeout: 1500 })
  })

  it('抢购回 PURCHASE_COOLDOWN：进入冷却态，冷却到期后按钮自行恢复可点', async () => {
    const futureCooldown = new Date(Date.now() + 3 * 24 * 3600_000).toISOString()
    const pastCooldown = new Date(Date.now() - 3600_000).toISOString()
    let detailRequests = 0
    testServer.server.use(
      http.get('/api/campaigns/302', () => {
        detailRequests += 1
        return HttpResponse.json(
          ongoingDetail({ cooldownUntil: detailRequests === 1 ? futureCooldown : pastCooldown }),
        )
      }),
      http.post('/api/campaigns/302/claim', () =>
        HttpResponse.json(
          { code: 'PURCHASE_COOLDOWN', message: '这件商品处于购买冷却期，到期后自动恢复可购' },
          { status: 409 },
        ),
      ),
    )

    render(<RecoveryHarness campaignId="302" />)
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    expect(await screen.findByText('购买冷却中')).toBeInTheDocument()
    expect(getButton()).toBeDisabled()

    await waitFor(() => expect(getButton()).toBeEnabled(), { timeout: 1500 })
  })
})

describe('轮询可见性暂停与卸载清理', () => {
  it('页面不可见期间不增加详情请求；回前台先拉一轮；卸载后不再发请求', async () => {
    let detailRequests = 0
    testServer.server.use(
      http.get('/api/campaigns/303', () => {
        detailRequests += 1
        return HttpResponse.json(
          ongoingDetail({ allocation: { total: 2000, available: 0, occupied: 2000, pendingRepool: 0, sold: 0 } }),
        )
      }),
    )

    const { unmount } = render(<RecoveryHarness campaignId="303" />)
    expect(await screen.findByText('售罄')).toBeInTheDocument()
    const baseline = detailRequests

    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(detailRequests).toBe(baseline)

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(detailRequests).toBe(baseline + 1))

    unmount()
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(detailRequests).toBe(baseline + 1)
  })
})

describe('成功后详情刷新', () => {
  it('抢购成功后重新拉一次场次详情，剩余份数按新响应刷新', async () => {
    let detailRequests = 0
    testServer.server.use(
      http.get('/api/campaigns/205', () => {
        detailRequests += 1
        const refreshed = detailRequests > 1
        return HttpResponse.json(
          ongoingDetail({
            allocation: refreshed
              ? { total: 2000, available: 1199, occupied: 801, pendingRepool: 0, sold: 0 }
              : { total: 2000, available: 1200, occupied: 800, pendingRepool: 0, sold: 0 },
          }),
        )
      }),
      http.post('/api/campaigns/205/claim', () =>
        HttpResponse.json(successClaim, { status: 201 }),
      ),
    )

    loginVerified()
    renderCampaignPage('205')
    expect(await screen.findByText('1200')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '立即抢购' }))
    expect(await screen.findByText('0427')).toBeInTheDocument()

    await waitFor(() => expect(detailRequests).toBe(2))
    expect(await screen.findByText('1199')).toBeInTheDocument()
  })
})
