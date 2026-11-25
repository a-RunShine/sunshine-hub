import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createHandlers } from './handlers'
import { DEFAULT_SCENARIO_ID, scenarios } from './scenarios'

const ORIGIN = 'http://localhost:3000'

const FROZEN_SCENARIO_IDS = [
  'happy',
  'detail-upcoming',
  'detail-ended',
  'detail-sold-out',
  'detail-limit-reached',
  'claim-already-purchased',
  'claim-not-started',
  'claim-ended',
  'claim-cooldown',
  'claim-sold-out',
  'claim-real-name-required',
  'claim-unauthorized',
  'claim-rate-limited',
  'claim-unit-pool-inconsistent',
  'claim-internal-error',
  'order-bad-request',
  'order-address-required',
  'order-unauthorized',
  'order-stock-insufficient',
  'order-cooldown',
] as const

const server = setupServer(...createHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function scenarioHeaders(scenarioId?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (scenarioId) headers['X-Mock-Scenario'] = scenarioId
  return headers
}

function postClaim(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/campaigns/1/claim`, {
    method: 'POST',
    headers: scenarioHeaders(scenarioId),
    body: '{}',
  })
}

function postOrder(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify({ items: [{ skuId: 10, quantity: 1 }] }),
  })
}

function putRealName(payload: Record<string, unknown>): Promise<Response> {
  return fetch(`${ORIGIN}/api/me/real-name`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

function getDetail(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/campaigns/1`, { headers: scenarioHeaders(scenarioId) })
}

function getDetailById(campaignId: number): Promise<Response> {
  return fetch(`${ORIGIN}/api/campaigns/${campaignId}`)
}

function deleteCategory(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/admin/categories/1`, {
    method: 'DELETE',
    headers: scenarioHeaders(scenarioId),
  })
}

function postAddress(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/addresses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify({
      receiver: 'x',
      phone: '13800000000',
      province: '四川省',
      city: '成都市',
      district: '武侯区',
      detail: '天府三街 1 号',
    }),
  })
}

function putAddress(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/addresses/1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify({
      receiver: 'x',
      phone: '13800000000',
      province: '四川省',
      city: '成都市',
      district: '武侯区',
      detail: '天府三街 1 号',
    }),
  })
}

function deleteAddress(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/addresses/1`, {
    method: 'DELETE',
    headers: scenarioHeaders(scenarioId),
  })
}

function putAddressDefault(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/addresses/1/default`, {
    method: 'PUT',
    headers: scenarioHeaders(scenarioId),
  })
}

function signFulfillment(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/fulfillments/1/sign`, {
    method: 'POST',
    headers: scenarioHeaders(scenarioId),
  })
}

function postRegister(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify({ username: 'demo', password: 'password1' }),
  })
}

function postLogin(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify({ username: 'demo', password: 'wrong-password' }),
  })
}

function postLogout(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/auth/logout`, {
    method: 'POST',
    headers: scenarioHeaders(scenarioId),
  })
}

function putPassword(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/me/password`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'newpassword1' }),
  })
}

describe('场景注册表：逐场景走 HTTP 边界', () => {
  it.each(scenarios)('$id：按声明产出失败响应或详情形状', async (scenario) => {
    if (scenario.claimFailure) {
      const res = await postClaim(scenario.id)
      expect(res.status).toBe(scenario.claimFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.claimFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.orderFailure) {
      const res = await postOrder(scenario.id)
      expect(res.status).toBe(scenario.orderFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.orderFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.categoryFailure) {
      const res = await deleteCategory(scenario.id)
      expect(res.status).toBe(scenario.categoryFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.categoryFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.addressCreateFailure) {
      const res = await postAddress(scenario.id)
      expect(res.status).toBe(scenario.addressCreateFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.addressCreateFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.addressUpdateFailure) {
      const res = await putAddress(scenario.id)
      expect(res.status).toBe(scenario.addressUpdateFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.addressUpdateFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.addressDeleteFailure) {
      const res = await deleteAddress(scenario.id)
      expect(res.status).toBe(scenario.addressDeleteFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.addressDeleteFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.addressDefaultFailure) {
      const res = await putAddressDefault(scenario.id)
      expect(res.status).toBe(scenario.addressDefaultFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.addressDefaultFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.signFailure) {
      const res = await signFulfillment(scenario.id)
      expect(res.status).toBe(scenario.signFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.signFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.registerFailure) {
      const res = await postRegister(scenario.id)
      expect(res.status).toBe(scenario.registerFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.registerFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.loginFailure) {
      const res = await postLogin(scenario.id)
      expect(res.status).toBe(scenario.loginFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.loginFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.logoutFailure) {
      const res = await postLogout(scenario.id)
      expect(res.status).toBe(scenario.logoutFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.logoutFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.passwordFailure) {
      const res = await putPassword(scenario.id)
      expect(res.status).toBe(scenario.passwordFailure.status)
      const body = await res.json()
      expect(body.code).toBe(scenario.passwordFailure.code)
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    }

    if (scenario.campaignDetail) {
      const res = await getDetail(scenario.id)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject(scenario.campaignDetail)
    }
  })
})

describe('默认 happy path（不带场景头）', () => {
  it('claim 返回 201、Content-Type 为 json，响应键集合恰好为 ClaimResult 四字段且取值对齐基线', async () => {
    const res = await postClaim()
    expect(res.status).toBe(201)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual([
      'collectibleNumber',
      'orderNo',
      'payDeadline',
      'serverTime',
    ])
    expect(body.collectibleNumber).toBe('0427')
    expect(body.orderNo).toMatch(/^SO\d+$/)
    const payDeadline = Date.parse(body.payDeadline)
    const serverTime = Date.parse(body.serverTime)
    expect(Number.isNaN(payDeadline)).toBe(false)
    expect(Number.isNaN(serverTime)).toBe(false)
    expect(payDeadline - Date.now()).toBeGreaterThan(890_000)
    expect(payDeadline - Date.now()).toBeLessThan(910_000)
    expect(payDeadline - serverTime).toBeGreaterThan(0)
  })

  it('GET /campaigns/1 返回与今日数据等价的场次详情形状', async () => {
    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(['FLASH', 'NORMAL', 'DISCOUNT']).toContain(body.type)
    expect(['UPCOMING', 'ONGOING', 'ENDED']).toContain(body.status)
    expect(typeof body.serverTime).toBe('string')
  })
})

describe('未知场景显式失败', () => {
  const unknownId = 'no-such-scenario'

  async function expectUnknownBadRequest(res: Response): Promise<void> {
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('BAD_REQUEST')
    expect(body.message).toContain(unknownId)
  }

  it('claim 接口回 400 BAD_REQUEST 并带上未知 id', async () => {
    await expectUnknownBadRequest(await postClaim(unknownId))
  })

  it('orders 接口回 400 BAD_REQUEST 并带上未知 id', async () => {
    await expectUnknownBadRequest(await postOrder(unknownId))
  })

  it('详情接口回 400 BAD_REQUEST 并带上未知 id', async () => {
    await expectUnknownBadRequest(await getDetail(unknownId))
  })
})

describe('五种禁用态形状', () => {
  it('UPCOMING：detail-upcoming 状态为未开售', async () => {
    const body = await (await getDetail('detail-upcoming')).json()
    expect(body.status).toBe('UPCOMING')
  })

  it('ENDED：detail-ended 状态为已结束', async () => {
    const body = await (await getDetail('detail-ended')).json()
    expect(body.status).toBe('ENDED')
  })

  it('售罄：detail-sold-out 的 allocation.available 为 0，且状态不是 SOLD_OUT', async () => {
    const body = await (await getDetail('detail-sold-out')).json()
    expect(body.allocation.available).toBe(0)
    expect(body.status).not.toBe('SOLD_OUT')
    expect(['UPCOMING', 'ONGOING', 'ENDED']).toContain(body.status)
  })

  it('额度用尽：详情为额度用尽形状（remainingCampaignLimit=0、allocation.available>0）、不在冷却中（cooldownUntil 为 null）；抢购买回 409 ALREADY_PURCHASED', async () => {
    const detailRes = await getDetail('detail-limit-reached')
    expect(detailRes.status).toBe(200)
    const detailBody = await detailRes.json()
    expect(detailBody.remainingCampaignLimit).toBe(0)
    expect(detailBody.allocation.available).toBeGreaterThan(0)
    expect(detailBody.cooldownUntil).toBeNull()

    const claimRes = await postClaim('detail-limit-reached')
    expect(claimRes.status).toBe(409)
    const claimBody = await claimRes.json()
    expect(claimBody.code).toBe('ALREADY_PURCHASED')
  })

  it('冷却：claim-cooldown 抢购回 409 PURCHASE_COOLDOWN，详情同口径下发未来时刻的 cooldownUntil，不再互相矛盾', async () => {
    const claimRes = await postClaim('claim-cooldown')
    expect(claimRes.status).toBe(409)
    const claimBody = await claimRes.json()
    expect(claimBody.code).toBe('PURCHASE_COOLDOWN')

    const detailBody = await (await getDetail('claim-cooldown')).json()
    expect(detailBody.cooldownUntil).not.toBeNull()
    expect(Date.parse(detailBody.cooldownUntil as string)).toBeGreaterThan(Date.now())
  })
})

describe('冷却详情语义（cooldownUntil）', () => {
  it('同一商品在两个不同场次详情返回相同的 cooldownUntil（商品级、跨场生效，不随 campaignId 变）', async () => {
    const first = await (await getDetail('claim-cooldown')).json()
    const second = await (await getDetail('detail-cooldown')).json()

    expect(first.productId).toBe(1)
    expect(second.productId).toBe(1)
    expect(first.id).not.toBe(second.id)
    expect(first.cooldownUntil).not.toBeNull()
    expect(second.cooldownUntil).not.toBeNull()
    expect(first.cooldownUntil).toBe(second.cooldownUntil)
  })

  it('detail-cooldown：详情看得出冷却中，claim 仍回 201 成功（详情态与点击结果分离）', async () => {
    const detailBody = await (await getDetail('detail-cooldown')).json()
    expect(detailBody.cooldownUntil).not.toBeNull()
    expect(Date.parse(detailBody.cooldownUntil as string)).toBeGreaterThan(Date.now())

    const claimRes = await postClaim('detail-cooldown')
    expect(claimRes.status).toBe(201)
  })

  it('匿名访问（/campaigns/4）cooldownUntil 为 null，与 remainingCampaignLimit、reserved 的匿名口径一致', async () => {
    const detailBody = await (await getDetailById(4)).json()
    expect(detailBody.type).toBe('FLASH')
    expect(detailBody.remainingCampaignLimit).toBeNull()
    expect(detailBody.reserved).toBeNull()
    expect(detailBody.cooldownUntil).toBeNull()
  })

  it('默认已登录中性详情（/campaigns/1）不在冷却中，cooldownUntil 为 null', async () => {
    const detailBody = await (await getDetail()).json()
    expect(detailBody.id).toBe(1)
    expect(detailBody.cooldownUntil).toBeNull()
  })
})

describe('注册表冻结约定', () => {
  it('默认场景 id 为 happy', () => {
    expect(DEFAULT_SCENARIO_ID).toBe('happy')
  })

  it('包含全部冻结场景 id', () => {
    const ids = new Set(scenarios.map((scenario) => scenario.id))
    for (const id of FROZEN_SCENARIO_IDS) {
      expect(ids.has(id)).toBe(true)
    }
  })
})

describe('实名提交 mock 边界', () => {
  it('PUT /me/real-name 成功：200，回写档案 realNameVerified 为 true、realName 取提交值；GET /me 读到新态', async () => {
    const res = await putRealName({ realName: '张三', idNumber: '11010119900101123X' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.realNameVerified).toBe(true)
    expect(body.realName).toBe('张三')

    const meRes = await fetch(`${ORIGIN}/api/me`)
    expect(meRes.status).toBe(200)
    expect((await meRes.json()).realNameVerified).toBe(true)
  })

  it('缺字段：400 BAD_REQUEST，错误信封为 {code, message}', async () => {
    const res = await putRealName({ realName: '张三' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('BAD_REQUEST')
    expect(typeof body.message).toBe('string')
    expect(body.message.length).toBeGreaterThan(0)
  })
})

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
}

describe('身份与会话 mock 持久化边界', () => {
  it('支持注册、重复用户名 409、登出 204/401、修改密码后全会话作废与跨刷新持久化', async () => {
    const storage = createMemoryStorage()
    server.use(...createHandlers(undefined, { storage, initialUsername: null }))

    const anonMe = await fetch(`${ORIGIN}/api/me`)
    expect(anonMe.status).toBe(401)
    expect((await anonMe.json()).code).toBe('UNAUTHORIZED')

    const anonLogout = await fetch(`${ORIGIN}/api/auth/logout`, { method: 'POST' })
    expect(anonLogout.status).toBe(401)

    const dupDemo = await fetch(`${ORIGIN}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'password1' }),
    })
    expect(dupDemo.status).toBe(409)
    expect((await dupDemo.json()).code).toBe('USERNAME_TAKEN')

    const reg = await fetch(`${ORIGIN}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice_01', password: 'password1' }),
    })
    expect(reg.status).toBe(201)
    const alice = await reg.json()
    expect(alice.username).toBe('alice_01')
    expect(alice.realNameVerified).toBe(false)

    server.use(...createHandlers(undefined, { storage }))
    const afterRefreshMe = await fetch(`${ORIGIN}/api/me`)
    expect(afterRefreshMe.status).toBe(200)
    expect((await afterRefreshMe.json()).username).toBe('alice_01')

    const samePassword = await fetch(`${ORIGIN}/api/me/password`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'password1', newPassword: 'password1' }),
    })
    expect(samePassword.status).toBe(400)
    expect((await samePassword.json()).code).toBe('BAD_REQUEST')

    const wrongCurrent = await fetch(`${ORIGIN}/api/me/password`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrongpass', newPassword: 'password2' }),
    })
    expect(wrongCurrent.status).toBe(400)
    expect((await wrongCurrent.json()).code).toBe('INVALID_CURRENT_PASSWORD')

    const changed = await fetch(`${ORIGIN}/api/me/password`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'password1', newPassword: 'password2' }),
    })
    expect(changed.status).toBe(204)

    server.use(...createHandlers(undefined, { storage }))
    const expiredMe = await fetch(`${ORIGIN}/api/me`)
    expect(expiredMe.status).toBe(401)

    const oldLogin = await fetch(`${ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice_01', password: 'password1' }),
    })
    expect(oldLogin.status).toBe(401)
    expect((await oldLogin.json()).code).toBe('BAD_CREDENTIALS')

    const newLogin = await fetch(`${ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice_01', password: 'password2' }),
    })
    expect(newLogin.status).toBe(200)
    expect((await newLogin.json()).username).toBe('alice_01')

    const loggedOut = await fetch(`${ORIGIN}/api/auth/logout`, { method: 'POST' })
    expect(loggedOut.status).toBe(204)

    server.use(...createHandlers(undefined, { storage }))
    const postLogoutMe = await fetch(`${ORIGIN}/api/me`)
    expect(postLogoutMe.status).toBe(401)
  })
})
