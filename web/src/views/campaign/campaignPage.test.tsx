import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { client } from '@/api/client'
import { createHandlers } from '@/mocks/handlers'
import { MOCK_SCENARIO_HEADER, scenarios } from '@/mocks/scenarios'
import CampaignPage from './CampaignPage'
import { CampaignDetailView } from './CampaignDetailView'
import { useCampaignDetail } from './useCampaignDetail'

/**
 * 抢购页只读态测试：打在 MSW HTTP 边界与组件可见行为上——
 * 断言按钮可点 / 不可点、原因文案、倒计时数字，不断言内部函数。
 * 场景数据复用 scenarios 注册表；时间通过注入的 now / 冻结 Date.now 控制，不靠真跑 1 秒。
 */

const server = setupServer(...createHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  delete client.defaults.headers.common[MOCK_SCENARIO_HEADER]
})
afterAll(() => server.close())

function renderPage(campaignId: string) {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** 选中开发期场景：与 DevScenarioPanel 走同一个请求头协议。 */
function setScenario(id: string) {
  client.defaults.headers.common[MOCK_SCENARIO_HEADER] = id
}

const getButton = () => screen.getByRole('button', { name: '立即抢购' })

describe('五种不可点态', () => {
  it('未开售：UPCOMING，按钮禁用并给出「未开售」原因，倒计时指向开售时刻', async () => {
    setScenario('detail-upcoming')
    renderPage('101')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 首发（未开售）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('未开售')).toBeInTheDocument()
    expect(screen.getByText(/距开售/)).toBeInTheDocument()
  })

  it('已结束：ENDED，按钮禁用并给出「已结束」原因', async () => {
    setScenario('detail-ended')
    renderPage('102')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 收官场（已结束）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('已结束')).toBeInTheDocument()
  })

  it('售罄：allocation.available 为 0，按钮禁用并给出「售罄」原因', async () => {
    setScenario('detail-sold-out')
    renderPage('103')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 加场（售罄）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('售罄')).toBeInTheDocument()
  })

  it('剩余本场额度用尽：remainingCampaignLimit 为 0，按钮禁用；不出现冷却文案', async () => {
    setScenario('detail-limit-reached')
    renderPage('104')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 返场（额度用尽）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('剩余本场额度已用尽')).toBeInTheDocument()
    expect(screen.queryByText('购买冷却中')).not.toBeInTheDocument()
  })

  it('购买冷却：cooldownUntil 为未来时刻，按钮禁用并给出「购买冷却中」原因', async () => {
    setScenario('detail-cooldown')
    renderPage('106')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 返场（冷却演示）' })).toBeInTheDocument()
    expect(getButton()).toBeDisabled()
    expect(screen.getByText('购买冷却中')).toBeInTheDocument()
  })
})

describe('匿名访问', () => {
  it('按钮保持可点，且不显示「剩余本场额度用尽」与「购买冷却中」', async () => {
    // 匿名形状：购买人专属字段一律 null；配额有余量、场次进行中。
    server.use(
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

    renderPage('4')

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
    server.use(
      http.get('/api/campaigns/103', () => {
        requests += 1
        // 首次售罄；之后配额回流回升，剩余份数恢复
        if (requests === 1) return HttpResponse.json(soldOut)
        return HttpResponse.json({
          ...soldOut,
          allocation: { ...soldOut.allocation, available: 300 },
        })
      }),
    )

    function RecoveryHarness() {
      // 测试用短间隔驱动重取；生产默认 15 秒，见 useCampaignDetail 注释
      const { state } = useCampaignDetail('103', { soldOutRefetchIntervalMs: 200 })
      if (state.status === 'loading') return <p>加载中</p>
      if (state.status === 'error') return <p>{state.message}</p>
      if (state.status === 'not-found') return <p>场次不存在</p>
      return (
        <CampaignDetailView
          detail={state.detail}
          offsetMs={state.offsetMs}
          claimability={state.claimability}
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
    renderPage('999')

    expect(await screen.findByRole('heading', { name: '场次不存在' })).toBeInTheDocument()
    expect(screen.getByText('你要找的限时抢购场次可能已经下线，或链接有误。')).toBeInTheDocument()
  })
})

describe('倒计时服务端校准', () => {
  it('本机时间被调快时，倒计时按 serverTime 偏移后的口径计算', async () => {
    // 本机被拨快 2 小时：本机视角已越过开售时刻 1 小时；服务端视角距开售还有 1 小时。
    const localClock = new Date('2026-01-01T12:00:00.000Z').getTime()
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(localClock)
    server.use(
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
      renderPage('777')
      expect(await screen.findByText('01:00:00')).toBeInTheDocument()
    } finally {
      dateNowSpy.mockRestore()
    }
  })
})
