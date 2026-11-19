import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { ClaimResult, FlashCampaignDetail } from '@/api/campaign'
import { createHandlers } from '@/mocks/handlers'
import { useAuth } from '@/stores/auth'
import CampaignPage from './CampaignPage'

/**
 * #53 未登录 / 未实名的可点拦截与实名后自动重放：打在 MSW HTTP 边界与可见行为上。
 * - 匿名点抢购：走既有登录回跳，不带本场次路径，不发抢购请求；
 * - 本地预判未实名：先弹表单，此阶段不发抢购请求；提交成功后自动重放一条 claim；
 * - 服务端 403 `REAL_NAME_REQUIRED`：与本地预判进同一个表单，成功后同一条路径重放；
 * - 放弃填写：按钮回可点，无残留弹窗与 loading。
 */

const server = setupServer(...createHandlers())

const claimRequests: string[] = []
const realNameRequests: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname.endsWith('/claim')) claimRequests.push(request.method)
    if (url.pathname === '/api/me/real-name') realNameRequests.push(request.method)
  })
})

afterEach(() => {
  server.resetHandlers()
  claimRequests.length = 0
  realNameRequests.length = 0
  // store 是模块单例：每个用例回到未登录初始态，不把上一个用例的购买人带进来
  useAuth.setState({ me: null, status: 'uninitialized' })
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

const getClaimButton = () => screen.getByRole('button', { name: '立即抢购' })

/** 进行中、可点的场次详情：配额有余量、本场额度剩 1、不在冷却中。 */
function ongoingDetail(): FlashCampaignDetail {
  return {
    id: 301,
    name: '实名测试场（进行中）',
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
  }
}

/** 抢购成功响应，形状照 ClaimResult 契约。 */
const successClaim: ClaimResult = {
  orderNo: 'SO1001',
  collectibleNumber: '0427',
  payDeadline: new Date(Date.now() + 900_000).toISOString(),
  serverTime: new Date().toISOString(),
}

/** 实名提交成功回写的购买人档案：`realNameVerified` 翻成 true。 */
const verifiedMe = { id: 1, username: 'demo', realNameVerified: true, realName: '张三', idNumberTail: '1234' }

function loginUnverified() {
  useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
  useAuth.getState().setStatus('ready')
}

function loginVerified() {
  useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: true })
  useAuth.getState().setStatus('ready')
}

function fillAndSubmitRealName() {
  fireEvent.change(screen.getByLabelText('购买人姓名'), { target: { value: '张三' } })
  fireEvent.change(screen.getByLabelText('证件号'), { target: { value: '11010119900101123X' } })
  fireEvent.click(screen.getByRole('button', { name: '提交并继续抢购' }))
}

describe('未登录点抢购', () => {
  it('走既有登录回跳，URL 带当前场次路径；不发抢购请求', async () => {
    server.use(http.get('/api/campaigns/4', () => HttpResponse.json(ongoingDetail())))
    renderPageWithProbe('4')

    expect(await screen.findByRole('heading', { name: '实名测试场（进行中）' })).toBeInTheDocument()
    expect(getClaimButton()).toBeEnabled()

    fireEvent.click(getClaimButton())

    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fcampaigns%2F4')
    })
    // 拦截发生在点击之后：此阶段没有误发抢购请求
    expect(claimRequests).toHaveLength(0)
  })
})

describe('本地预判未实名', () => {
  it('点击后弹出实名表单；按钮不是抢购中，此阶段不发抢购请求', async () => {
    loginUnverified()
    server.use(http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())))
    renderPage('301')

    expect(await screen.findByRole('heading', { name: '实名测试场（进行中）' })).toBeInTheDocument()
    fireEvent.click(getClaimButton())

    // 表单出现；底层抢购按钮仍在可点态，没有卡在「抢购中」
    expect(await screen.findByRole('dialog', { name: '完成实名认证' })).toBeInTheDocument()
    expect(getClaimButton()).toBeEnabled()
    expect(screen.queryByRole('button', { name: '抢购中…' })).not.toBeInTheDocument()
    expect(claimRequests).toHaveLength(0)
  })

  it('表单校验不过时不提交：内联提示出现，实名请求数为 0', async () => {
    loginUnverified()
    server.use(http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())))
    renderPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fireEvent.click(screen.getByRole('button', { name: '提交并继续抢购' }))

    expect(screen.getByText('请填写购买人姓名')).toBeInTheDocument()
    expect(screen.getByText('请填写 18 位证件号（末位可为 X）')).toBeInTheDocument()
    expect(realNameRequests).toHaveLength(0)
    expect(claimRequests).toHaveLength(0)
  })
})

describe('实名提交成功后自动重放抢购', () => {
  it('PUT /me/real-name 成功后自动重放一条 claim，结果面板出现；无需二次点击', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.put('/api/me/real-name', () => HttpResponse.json(verifiedMe, { status: 200 })),
      http.post('/api/campaigns/301/claim', () => HttpResponse.json(successClaim, { status: 201 })),
    )
    renderPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fillAndSubmitRealName()

    // 实名请求成功后，重放走同一条抢购路径：claim 计数从 0 涨到 1
    await waitFor(() => expect(claimRequests).toHaveLength(1))
    expect(realNameRequests).toEqual(['PUT'])
    expect(await screen.findByText('0427')).toBeInTheDocument()
  })

  it('实名成功后 store 的实名态更新为已实名', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.put('/api/me/real-name', () => HttpResponse.json(verifiedMe, { status: 200 })),
      http.post('/api/campaigns/301/claim', () => HttpResponse.json(successClaim, { status: 201 })),
    )
    renderPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })
    fillAndSubmitRealName()
    await screen.findByText('0427')

    // 回写走 store 既有 setter：当前购买人实名态翻成 true，后续不会再重复弹表单
    expect(useAuth.getState().me?.realNameVerified).toBe(true)
  })
})

describe('已实名购买人点抢购', () => {
  it('不弹实名表单，直接发抢购请求并出结果面板', async () => {
    loginVerified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () => HttpResponse.json(successClaim, { status: 201 })),
    )
    renderPage('301')

    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    await waitFor(() => expect(claimRequests).toHaveLength(1))
    expect(screen.queryByRole('dialog', { name: '完成实名认证' })).not.toBeInTheDocument()
    expect(await screen.findByText('0427')).toBeInTheDocument()
  })
})

describe('放弃填写', () => {
  it('关掉表单后按钮回到可点态，无残留弹窗与 loading，不发请求', async () => {
    loginUnverified()
    server.use(http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())))
    renderPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fireEvent.click(screen.getByRole('button', { name: '放弃' }))

    expect(screen.queryByRole('dialog', { name: '完成实名认证' })).not.toBeInTheDocument()
    expect(getClaimButton()).toBeEnabled()
    expect(screen.queryByRole('button', { name: '抢购中…' })).not.toBeInTheDocument()
    expect(claimRequests).toHaveLength(0)
    expect(realNameRequests).toHaveLength(0)
  })
})

describe('服务端 403 REAL_NAME_REQUIRED', () => {
  it('本地以为已实名、服务端回 403：进入同一套实名表单，成功后重放抢购', async () => {
    // 本地会话态标记已实名，但服务端判定未实名：走服务端错误分支，不另起一套实现。
    loginVerified()
    let claimCalls = 0
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () => {
        claimCalls += 1
        // 第一次：服务端判定未实名回 403；实名补齐后重放的第二次：正常成交
        if (claimCalls === 1) {
          return HttpResponse.json(
            { code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' },
            { status: 403 },
          )
        }
        return HttpResponse.json(successClaim, { status: 201 })
      }),
      http.put('/api/me/real-name', () => HttpResponse.json(verifiedMe, { status: 200 })),
    )
    renderPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    // 403 回来后打开实名表单；第一次 claim 已发出过一次
    expect(await screen.findByRole('dialog', { name: '完成实名认证' })).toBeInTheDocument()
    expect(claimRequests).toHaveLength(1)

    fillAndSubmitRealName()

    // 实名成功后重放：claim 计数涨到 2，结果面板出现
    await waitFor(() => expect(claimRequests).toHaveLength(2))
    expect(await screen.findByText('0427')).toBeInTheDocument()
  })
})

describe('实名提交失败', () => {
  it('给出可理解提示，表单不关闭、按钮可重试，不把购买人卡在表单里', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.put('/api/me/real-name', () =>
        HttpResponse.json({ code: 'REAL_NAME_ALREADY_SET', message: '已实名，不允许覆盖' }, { status: 409 }),
      ),
    )
    renderPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fillAndSubmitRealName()

    expect(await screen.findByText('已实名，不允许覆盖')).toBeInTheDocument()
    // 失败后表单仍在，提交按钮回到可点态，可重试或放弃
    expect(screen.getByRole('dialog', { name: '完成实名认证' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交并继续抢购' })).toBeEnabled()
    expect(claimRequests).toHaveLength(0)
  })
})
