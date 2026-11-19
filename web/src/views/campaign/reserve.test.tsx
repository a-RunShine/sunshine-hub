import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { createHandlers } from '@/mocks/handlers'
import CampaignPage from './CampaignPage'
import { CampaignDetailView } from './CampaignDetailView'
import { useCampaignDetail } from './useCampaignDetail'

/**
 * #54 预约 / 取消预约测试：打在 MSW HTTP 边界与可见行为上。
 * 三态（匿名 null / 未预约 false / 已预约 true）分开断言；预约与取消都走 204 空体，
 * 成功后重拉详情刷新 `reserved`；开售后入口消失；预约不动配额与抢购按钮可点性。
 */

const server = setupServer(...createHandlers())

const reserveRequests: { method: string; path: string }[] = []
const detailRequests: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname.endsWith('/reserve')) {
      reserveRequests.push({ method: request.method, path: url.pathname })
    }
    if (/^\/api\/campaigns\/\d+$/.test(url.pathname)) {
      detailRequests.push(url.pathname)
    }
  })
})

afterEach(() => {
  server.resetHandlers()
  reserveRequests.length = 0
  detailRequests.length = 0
})

afterAll(() => {
  server.close()
})

function renderPage(campaignId: string) {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function ProbeLocation() {
  const location = useLocation()
  return <div data-testid="probe">{location.pathname}{location.search}</div>
}

function renderPageWithProbe(campaignId: string) {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <ProbeLocation />
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const getReserveButton = () => screen.getByRole('button', { name: '预约' })
const queryCancelButton = () => screen.queryByRole('button', { name: '取消预约' })
const getClaimButton = () => screen.getByRole('button', { name: '立即抢购' })

/**
 * 测试本地预约态桩：GET 读本地标记，POST 置 true、DELETE 置 false，
 * 与 handlers.ts 闭包口径一致；handler 闭包不外泄到其它用例。
 */
function reserveScenarioHandlers(campaignId: number) {
  let reserved = false
  return [
    http.get(`/api/campaigns/${campaignId}`, () =>
      HttpResponse.json({ ...notReservedDetail(), reserved }),
    ),
    http.post(`/api/campaigns/${campaignId}/reserve`, () => {
      reserved = true
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete(`/api/campaigns/${campaignId}/reserve`, () => {
      reserved = false
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}

/** 已登录未预约、未开售的内联详情；配额中性可售。 */
function notReservedDetail() {
  return {
    id: 41,
    name: '预约测试场（未预约）',
    type: 'FLASH' as const,
    productId: 1,
    startAt: new Date(Date.now() + 3600_000).toISOString(),
    endAt: null,
    status: 'UPCOMING' as const,
    serverTime: new Date().toISOString(),
    allocation: { total: 5000, available: 4817, occupied: 183, pendingRepool: 0, sold: 0 },
    campaignLimit: 2,
    remainingCampaignLimit: 1,
    cooldownUntil: null,
    reserved: false,
  }
}

describe('预约三态', () => {
  it('匿名（reserved === null）：显示预约入口，不显示已预约态；点击走登录回跳，不发预约请求', async () => {
    renderPageWithProbe('4')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 加场' })).toBeInTheDocument()
    expect(getReserveButton()).toBeEnabled()
    expect(queryCancelButton()).not.toBeInTheDocument()

    fireEvent.click(getReserveButton())

    // 与 RequireAuth / 401 拦截器同一套口径：带 next 回到本场次
    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fcampaigns%2F4')
    })
    expect(reserveRequests).toHaveLength(0)
  })

  it('已登录未预约（reserved === false）：显示预约入口', async () => {
    server.use(http.get('/api/campaigns/41', () => HttpResponse.json(notReservedDetail())))
    renderPage('41')

    expect(await screen.findByRole('heading', { name: '预约测试场（未预约）' })).toBeInTheDocument()
    expect(getReserveButton()).toBeEnabled()
    expect(queryCancelButton()).not.toBeInTheDocument()
  })

  it('已预约（reserved === true）：显示取消预约入口，不显示预约入口', async () => {
    renderPage('1')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 首发' })).toBeInTheDocument()
    expect(queryCancelButton()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '预约' })).not.toBeInTheDocument()
  })
})

describe('预约成功', () => {
  it('POST /reserve 返回 204 空体：不解析响应体，重拉详情后 reserved 翻成 true', async () => {
    server.use(...reserveScenarioHandlers(41))
    renderPage('41')

    expect(await screen.findByRole('heading', { name: '预约测试场（未预约）' })).toBeInTheDocument()
    const getCountBefore = detailRequests.length

    fireEvent.click(getReserveButton())

    await waitFor(() => expect(queryCancelButton()).toBeInTheDocument())
    // 请求方法与路径钉住：POST /api/campaigns/41/reserve
    expect(reserveRequests).toEqual([{ method: 'POST', path: '/api/campaigns/41/reserve' }])
    // 成功后重拉了详情，reserved 以服务端最新值为准
    expect(detailRequests.length).toBeGreaterThan(getCountBefore)
  })

  it('预约不改变剩余份数，也不改变抢购按钮的可点性（未开售仍禁用并给出未开售原因）', async () => {
    server.use(...reserveScenarioHandlers(41))
    renderPage('41')

    expect(await screen.findByText('4817')).toBeInTheDocument()
    expect(getClaimButton()).toBeDisabled()
    expect(screen.getByText('未开售')).toBeInTheDocument()

    fireEvent.click(getReserveButton())
    await waitFor(() => expect(queryCancelButton()).toBeInTheDocument())

    // 配额与按钮可点性都不随预约变化
    expect(screen.getByText('4817')).toBeInTheDocument()
    expect(getClaimButton()).toBeDisabled()
    expect(screen.getByText('未开售')).toBeInTheDocument()
  })
})

describe('取消预约成功', () => {
  it('DELETE /reserve 返回 204：重拉详情后回到未预约入口，份数与抢购按钮不变', async () => {
    renderPage('1')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 首发' })).toBeInTheDocument()
    expect(screen.getByText('4817')).toBeInTheDocument()

    fireEvent.click(queryCancelButton()!)
    await waitFor(() => expect(getReserveButton()).toBeInTheDocument())

    expect(reserveRequests).toEqual([{ method: 'DELETE', path: '/api/campaigns/1/reserve' }])
    expect(screen.getByText('4817')).toBeInTheDocument()
    expect(getClaimButton()).toBeDisabled()
  })
})

describe('开售后预约入口消失', () => {
  it('status 已离开 UPCOMING（ONGOING）：预约与取消入口都不出现', async () => {
    renderPage('3')

    expect(await screen.findByRole('heading', { name: '暗夜猎手 返场抢购' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '预约' })).not.toBeInTheDocument()
    expect(queryCancelButton()).not.toBeInTheDocument()
  })

  it('status 仍是 UPCOMING，但服务端口径时间已越过开售时刻：入口消失（走服务端时间偏移，不用裸 Date.now）', async () => {
    const localClock = Date.parse('2026-01-01T12:00:00.000Z')
    // 稳定引用：hook 的取数回调按 now 引用收窄依赖，内联箭头会触发无限重取
    const frozenNow = () => localClock
    server.use(
      http.get('/api/campaigns/777', () =>
        HttpResponse.json({
          id: 777,
          name: '已开售校准场',
          type: 'FLASH',
          productId: 1,
          startAt: '2026-01-01T11:00:00.000Z',
          endAt: null,
          status: 'UPCOMING',
          serverTime: '2026-01-01T12:30:00.000Z',
          allocation: { total: 100, available: 90, occupied: 10, pendingRepool: 0, sold: 0 },
          campaignLimit: 2,
          remainingCampaignLimit: 1,
          cooldownUntil: null,
          reserved: false,
        }),
      ),
    )

    function ClockHarness() {
      const { state } = useCampaignDetail('777', { now: frozenNow })
      if (state.status !== 'ready') return <p>加载中</p>
      return (
        <CampaignDetailView
          detail={state.detail}
          offsetMs={state.offsetMs}
          claimability={state.claimability}
          beforeStart={state.beforeStart}
        />
      )
    }

    render(<ClockHarness />)
    expect(await screen.findByRole('heading', { name: '已开售校准场' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '预约' })).not.toBeInTheDocument()
    expect(queryCancelButton()).not.toBeInTheDocument()
  })
})

describe('预约 / 取消失败', () => {
  it('预约失败：给出可理解提示，入口仍在，reserved 不被乐观改掉', async () => {
    server.use(
      http.get('/api/campaigns/41', () => HttpResponse.json(notReservedDetail())),
      http.post('/api/campaigns/41/reserve', () =>
        HttpResponse.json({ code: 'CAMPAIGN_ENDED', message: '本场已经结束' }, { status: 409 }),
      ),
    )
    renderPage('41')

    expect(await screen.findByRole('heading', { name: '预约测试场（未预约）' })).toBeInTheDocument()
    fireEvent.click(getReserveButton())

    await waitFor(() => expect(screen.getByText('本场已经结束')).toBeInTheDocument())
    // 失败后仍停留在预约入口，界面不与服务端脱节
    expect(getReserveButton()).toBeEnabled()
    expect(queryCancelButton()).not.toBeInTheDocument()
  })
})

describe('mock 边界：预约态在 handler 闭包内翻转', () => {
  it('POST 置 true、DELETE 置 false，GET 详情反映翻转；两条都回 204 空体', async () => {
    const origin = 'http://localhost:3000'

    const created = await fetch(`${origin}/api/campaigns/1/reserve`, { method: 'POST' })
    expect(created.status).toBe(204)
    expect(await created.text()).toBe('')

    const afterPost = await fetch(`${origin}/api/campaigns/1`)
    const afterPostBody = await afterPost.json()
    expect(afterPostBody.reserved).toBe(true)

    const cancelled = await fetch(`${origin}/api/campaigns/1/reserve`, { method: 'DELETE' })
    expect(cancelled.status).toBe(204)
    expect(await cancelled.text()).toBe('')

    const afterDelete = await fetch(`${origin}/api/campaigns/1`)
    const afterDeleteBody = await afterDelete.json()
    expect(afterDeleteBody.reserved).toBe(false)
  })
})
