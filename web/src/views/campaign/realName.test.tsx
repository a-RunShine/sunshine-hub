import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ClaimResult, FlashCampaignDetail } from '@/api/campaign'
import { useAuth } from '@/stores/auth'
import {
  createCampaignTestServer,
  registerCampaignTestServer,
  renderCampaignPage,
  renderCampaignPageWithProbe,
} from './campaignTestHarness'

const { server, counters } = createCampaignTestServer()
registerCampaignTestServer(server, counters)

const getClaimButton = () => screen.getByRole('button', { name: '立即抢购' })

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

const successClaim: ClaimResult = {
  orderNo: 'SO1001',
  collectibleNumber: '0427',
  payDeadline: new Date(Date.now() + 900_000).toISOString(),
  serverTime: new Date().toISOString(),
}

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
  it('服务端回 401：走既有登录回跳，URL 带当前场次路径；抢购请求已发出一次', async () => {
    server.use(
      http.get('/api/campaigns/4', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/4/claim', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: '没登录或会话已过期' }, { status: 401 }),
      ),
    )
    renderCampaignPageWithProbe('4')

    expect(await screen.findByRole('heading', { name: '实名测试场（进行中）' })).toBeInTheDocument()
    expect(getClaimButton()).toBeEnabled()

    fireEvent.click(getClaimButton())

    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fcampaigns%2F4')
    })
    expect(counters.claim).toHaveLength(1)
  })
})

describe('服务端 403 REAL_NAME_REQUIRED 触发实名表单', () => {
  it('点击后服务端回 403：弹出实名表单；按钮不是抢购中，抢购请求已发出一次', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () =>
        HttpResponse.json({ code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' }, { status: 403 }),
      ),
    )
    renderCampaignPage('301')

    expect(await screen.findByRole('heading', { name: '实名测试场（进行中）' })).toBeInTheDocument()
    fireEvent.click(getClaimButton())

    expect(await screen.findByRole('dialog', { name: '完成实名认证' })).toBeInTheDocument()
    expect(getClaimButton()).toBeEnabled()
    expect(screen.queryByRole('button', { name: '抢购中…' })).not.toBeInTheDocument()
    expect(counters.claim).toHaveLength(1)
  })

  it('表单校验不过时不提交：内联提示出现，实名请求数为 0，抢购请求只有首次那一次', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () =>
        HttpResponse.json({ code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' }, { status: 403 }),
      ),
    )
    renderCampaignPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fireEvent.click(screen.getByRole('button', { name: '提交并继续抢购' }))

    expect(screen.getByText('请填写购买人姓名')).toBeInTheDocument()
    expect(screen.getByText('请填写 18 位证件号（末位可为 X）')).toBeInTheDocument()
    expect(counters.realName).toHaveLength(0)
    expect(counters.claim).toHaveLength(1)
  })
})

describe('实名提交成功后自动重放抢购', () => {
  it('PUT /me/real-name 成功后自动重放一条 claim，结果面板出现；无需二次点击', async () => {
    loginUnverified()
    let claimCalls = 0
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.put('/api/me/real-name', () => HttpResponse.json(verifiedMe, { status: 200 })),
      http.post('/api/campaigns/301/claim', () => {
        claimCalls += 1
        if (claimCalls === 1) {
          return HttpResponse.json(
            { code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' },
            { status: 403 },
          )
        }
        return HttpResponse.json(successClaim, { status: 201 })
      }),
    )
    renderCampaignPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fillAndSubmitRealName()

    await waitFor(() => expect(counters.claim).toHaveLength(2))
    expect(counters.realName).toEqual(['PUT'])
    expect(await screen.findByText('0427')).toBeInTheDocument()
  })

  it('实名成功后 store 的实名态更新为已实名', async () => {
    loginUnverified()
    let claimCalls = 0
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.put('/api/me/real-name', () => HttpResponse.json(verifiedMe, { status: 200 })),
      http.post('/api/campaigns/301/claim', () => {
        claimCalls += 1
        if (claimCalls === 1) {
          return HttpResponse.json(
            { code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' },
            { status: 403 },
          )
        }
        return HttpResponse.json(successClaim, { status: 201 })
      }),
    )
    renderCampaignPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })
    fillAndSubmitRealName()
    await screen.findByText('0427')

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
    renderCampaignPage('301')

    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    await waitFor(() => expect(counters.claim).toHaveLength(1))
    expect(screen.queryByRole('dialog', { name: '完成实名认证' })).not.toBeInTheDocument()
    expect(await screen.findByText('0427')).toBeInTheDocument()
  })
})

describe('放弃填写', () => {
  it('关掉表单后按钮回到可点态，无残留弹窗与 loading，不发实名请求', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () =>
        HttpResponse.json({ code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' }, { status: 403 }),
      ),
    )
    renderCampaignPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fireEvent.click(screen.getByRole('button', { name: '放弃' }))

    expect(screen.queryByRole('dialog', { name: '完成实名认证' })).not.toBeInTheDocument()
    expect(getClaimButton()).toBeEnabled()
    expect(screen.queryByRole('button', { name: '抢购中…' })).not.toBeInTheDocument()
    expect(counters.claim).toHaveLength(1)
    expect(counters.realName).toHaveLength(0)
  })
})

describe('服务端 403 REAL_NAME_REQUIRED', () => {
  it('本地以为已实名、服务端回 403：进入同一套实名表单，成功后重放抢购', async () => {
    loginVerified()
    let claimCalls = 0
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () => {
        claimCalls += 1
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
    renderCampaignPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))

    expect(await screen.findByRole('dialog', { name: '完成实名认证' })).toBeInTheDocument()
    expect(counters.claim).toHaveLength(1)

    fillAndSubmitRealName()

    await waitFor(() => expect(counters.claim).toHaveLength(2))
    expect(await screen.findByText('0427')).toBeInTheDocument()
  })
})

describe('实名提交失败', () => {
  it('给出可理解提示，表单不关闭、按钮可重试，不把购买人卡在表单里', async () => {
    loginUnverified()
    server.use(
      http.get('/api/campaigns/301', () => HttpResponse.json(ongoingDetail())),
      http.post('/api/campaigns/301/claim', () =>
        HttpResponse.json({ code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' }, { status: 403 }),
      ),
      http.put('/api/me/real-name', () =>
        HttpResponse.json({ code: 'REAL_NAME_ALREADY_SET', message: '已实名，不允许覆盖' }, { status: 409 }),
      ),
    )
    renderCampaignPage('301')
    fireEvent.click(await screen.findByRole('button', { name: '立即抢购' }))
    await screen.findByRole('dialog', { name: '完成实名认证' })

    fillAndSubmitRealName()

    expect(await screen.findByText('已实名，不允许覆盖')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '完成实名认证' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交并继续抢购' })).toBeEnabled()
    expect(counters.claim).toHaveLength(1)
  })
})
