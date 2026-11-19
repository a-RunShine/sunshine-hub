import { render } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { client } from '@/api/client'
import { createHandlers } from '@/mocks/handlers'
import { MOCK_SCENARIO_HEADER } from '@/mocks/scenarios'
import { useAuth } from '@/stores/auth'
import CampaignPage from './CampaignPage'

/**
 * 抢购页三份测试（页面 / 实名 / 预约）共用的脚手架：MSW server 起停与复位、
 * 路由渲染、位置探针、分路径请求计数、auth store 复位。
 * 测试专用，不进生产代码路径；可见行为断言仍留在各测试文件里。
 */

/** 分路径请求计数：claim / 实名 / 预约 / 详情各自成列，用例间由 afterEach 清空。 */
export interface CampaignRequestCounters {
  /** POST .../claim 方法序列。 */
  readonly claim: string[]
  /** PUT /me/real-name 方法序列。 */
  readonly realName: string[]
  /** POST / DELETE .../reserve 方法与路径序列。 */
  readonly reserve: { method: string; path: string }[]
  /** GET /api/campaigns/:id 路径序列。 */
  readonly detail: string[]
}

/** 建 MSW server 与计数列；配合 `registerCampaignTestServer` 注册生命周期钩子。 */
export function createCampaignTestServer() {
  const server = setupServer(...createHandlers())
  const counters: CampaignRequestCounters = { claim: [], realName: [], reserve: [], detail: [] }
  return { server, counters }
}

/** 注册 beforeAll / afterEach / afterAll：server 监听、请求计数收集、用例间复位。 */
export function registerCampaignTestServer(
  server: ReturnType<typeof setupServer>,
  counters: CampaignRequestCounters,
): void {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.endsWith('/claim')) counters.claim.push(request.method)
      if (url.pathname === '/api/me/real-name') counters.realName.push(request.method)
      if (url.pathname.endsWith('/reserve')) {
        counters.reserve.push({ method: request.method, path: url.pathname })
      }
      if (/^\/api\/campaigns\/\d+$/.test(url.pathname)) counters.detail.push(url.pathname)
    })
  })

  afterEach(() => {
    server.resetHandlers()
    counters.claim.length = 0
    counters.realName.length = 0
    counters.reserve.length = 0
    counters.detail.length = 0
    delete client.defaults.headers.common[MOCK_SCENARIO_HEADER]
    // store 是模块单例：每个用例回到未登录初始态，不带上一个用例的购买人
    useAuth.setState({ me: null, status: 'uninitialized' })
  })

  afterAll(() => {
    server.close()
  })
}

/** 渲染抢购页，路由钉在 /campaigns/:campaignId。 */
export function renderCampaignPage(campaignId: string) {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** 路由位置探针：把当前 pathname + search 写到 testid 节点上，供登录回跳断言读取。 */
export function ProbeLocation() {
  const location = useLocation()
  return <div data-testid="probe">{location.pathname}{location.search}</div>
}

/** 渲染抢购页并挂上位置探针，供登录回跳断言读取。 */
export function renderCampaignPageWithProbe(campaignId: string) {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <ProbeLocation />
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** 选中开发期场景：与 DevScenarioPanel 走同一个请求头协议。 */
export function setScenario(id: string) {
  client.defaults.headers.common[MOCK_SCENARIO_HEADER] = id
}
