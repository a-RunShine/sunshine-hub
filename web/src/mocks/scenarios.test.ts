import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createHandlers } from './handlers'
import { DEFAULT_SCENARIO_ID, scenarios } from './scenarios'

/**
 * MSW HTTP 边界测试：只通过真实 fetch 打 handler 暴露出去的 HTTP 接口，
 * 不断言 handler 内部实现。场景选择由请求头 `X-Mock-Scenario` 完成，默认 happy。
 */

const ORIGIN = 'http://localhost:3000'

/** #32 冻结的 20 个场景 id（注册表可以多出场景，这些一个都不能少）。 */
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

function getDetail(scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/campaigns/1`, { headers: scenarioHeaders(scenarioId) })
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
    // 多一个少一个键都算红：键集合恰好是 ClaimResult 声明的四个字段
    expect(Object.keys(body).sort()).toEqual([
      'collectibleNumber',
      'orderNo',
      'payDeadline',
      'serverTime',
    ])
    // 与 48e5cc7 基线 201 常量逐一对齐：编号固定 0427，单号 SO + 时间戳，截止时间为当前 +15 分钟，serverTime 为当前时间
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

  it('额度用尽：详情为额度用尽形状（remainingCampaignLimit=0、allocation.available>0）、无冷却字段；抢购买回 409 ALREADY_PURCHASED', async () => {
    const detailRes = await getDetail('detail-limit-reached')
    expect(detailRes.status).toBe(200)
    const detailBody = await detailRes.json()
    expect(detailBody.remainingCampaignLimit).toBe(0)
    expect(detailBody.allocation.available).toBeGreaterThan(0)
    expect('cooldown' in detailBody).toBe(false)
    expect('cooldownUntil' in detailBody).toBe(false)

    const claimRes = await postClaim('detail-limit-reached')
    expect(claimRes.status).toBe(409)
    const claimBody = await claimRes.json()
    expect(claimBody.code).toBe('ALREADY_PURCHASED')
  })

  it('冷却：claim-cooldown 抢购回 409 PURCHASE_COOLDOWN，详情保持中性、无冷却字段', async () => {
    const claimRes = await postClaim('claim-cooldown')
    expect(claimRes.status).toBe(409)
    const claimBody = await claimRes.json()
    expect(claimBody.code).toBe('PURCHASE_COOLDOWN')

    const detailBody = await (await getDetail('claim-cooldown')).json()
    expect('cooldown' in detailBody).toBe(false)
    expect('cooldownUntil' in detailBody).toBe(false)
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
