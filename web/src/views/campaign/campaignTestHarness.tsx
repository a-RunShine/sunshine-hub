import { render } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { client } from '@/api/client'
import { createHandlers } from '@/mocks/handlers'
import { MOCK_SCENARIO_HEADER } from '@/mocks/scenarios'
import { useAuth } from '@/stores/auth'
import CampaignPage from './CampaignPage'

export interface CampaignRequestCounters {
  readonly claim: string[]
  readonly realName: string[]
  readonly reserve: { method: string; path: string }[]
  readonly detail: string[]
}

export function createCampaignTestServer() {
  const server = setupServer(...createHandlers())
  const counters: CampaignRequestCounters = { claim: [], realName: [], reserve: [], detail: [] }
  return { server, counters }
}

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
    useAuth.setState({ me: null, status: 'uninitialized' })
  })

  afterAll(() => {
    server.close()
  })
}

export function renderCampaignPage(campaignId: string) {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

export function ProbeLocation() {
  const location = useLocation()
  return <div data-testid="probe">{location.pathname}{location.search}</div>
}

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

export function setScenario(id: string) {
  client.defaults.headers.common[MOCK_SCENARIO_HEADER] = id
}
