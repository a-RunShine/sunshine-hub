import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createHandlers } from './handlers'
import { MOCK_SCENARIO_HEADER } from './scenarios'

const ORIGIN = 'http://localhost:3000'

const server = setupServer(...createHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => server.resetHandlers(...createHandlers()))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function scenarioHeaders(scenarioId?: string): Record<string, string> {
  return scenarioId ? { [MOCK_SCENARIO_HEADER]: scenarioId } : {}
}

function addressBody(receiver: string): Record<string, string> {
  return {
    receiver,
    phone: '13800000000',
    province: '四川省',
    city: '成都市',
    district: '武侯区',
    detail: '天府三街 1 号',
  }
}

async function listAddresses(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${ORIGIN}/api/addresses`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toBeTypeOf('object')
  expect(Array.isArray(body.items)).toBe(true)
  return body.items
}

async function createAddress(
  body: Record<string, string>,
  scenarioId?: string,
): Promise<Response> {
  return fetch(`${ORIGIN}/api/addresses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...scenarioHeaders(scenarioId) },
    body: JSON.stringify(body),
  })
}

async function signFulfillment(id: number, scenarioId?: string): Promise<Response> {
  return fetch(`${ORIGIN}/api/fulfillments/${id}/sign`, {
    method: 'POST',
    headers: scenarioHeaders(scenarioId),
  })
}

describe('地址与履约单种子数据', () => {
  it('GET /addresses 响应体为对象且 items 是数组：3 条地址，第一条默认，其余非默认，至多一条默认', async () => {
    const res = await fetch(`${ORIGIN}/api/addresses`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeTypeOf('object')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items).toHaveLength(3)

    const list = await listAddresses()
    const defaults = list.filter((a) => a.isDefault === true)
    expect(defaults).toHaveLength(1)
    expect(list[0].id).toBe(1)
    expect(list[0].isDefault).toBe(true)
  })

  it('GET /fulfillments 返回实体已发货、虚拟已完成、实体待发货、实体已完成四张履约单', async () => {
    const res = await fetch(`${ORIGIN}/api/fulfillments`)
    expect(res.status).toBe(200)
    const body = await res.json()
    const items = body.items as Array<{ id: number; kind: string; status: string }>
    expect(items.map((f) => f.id)).toEqual([1, 2, 3, 4])
    expect(items.find((f) => f.id === 1)).toMatchObject({ kind: 'PHYSICAL', status: 'SHIPPED' })
    expect(items.find((f) => f.id === 2)).toMatchObject({ kind: 'VIRTUAL', status: 'COMPLETED' })
    expect(items.find((f) => f.id === 3)).toMatchObject({ kind: 'PHYSICAL', status: 'PENDING' })
    expect(items.find((f) => f.id === 4)).toMatchObject({ kind: 'PHYSICAL', status: 'COMPLETED' })
  })
})

describe('默认地址不变量', () => {
  it('列表为空时新增的第一条自动成为默认；列表已有地址时新地址不带默认', async () => {
    server.resetHandlers(...createHandlers(undefined, { addresses: [] }))
    const first = await fetch(`${ORIGIN}/api/addresses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(addressBody('首条')),
    })
    expect(first.status).toBe(201)
    const firstBody = await first.json()
    expect(firstBody.isDefault).toBe(true)

    const list = await listAddresses()
    expect(list).toHaveLength(1)
    expect(list[0].isDefault).toBe(true)

    const created = await createAddress(addressBody('追加一条'))
    expect(created.status).toBe(201)
    const createdBody = await created.json()
    expect(createdBody.isDefault).toBe(false)
    const listAfter = await listAddresses()
    expect(listAfter.filter((a) => a.isDefault === true)).toHaveLength(1)
  })

  it('设为默认会取消原默认，列表始终至多一条默认', async () => {
    const res = await fetch(`${ORIGIN}/api/addresses/2/default`, { method: 'PUT' })
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.id).toBe(2)
    expect(updated.isDefault).toBe(true)

    const list = await listAddresses()
    const defaults = list.filter((a) => a.isDefault === true)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(2)
    expect(list.find((a) => a.id === 1)?.isDefault).toBe(false)
  })

  it('删除默认地址后，剩余最早创建的一条自动提升为默认', async () => {
    const del = await fetch(`${ORIGIN}/api/addresses/1`, { method: 'DELETE' })
    expect(del.status).toBe(204)
    expect(await del.text()).toBe('')

    const list = await listAddresses()
    expect(list).toHaveLength(2)
    const defaults = list.filter((a) => a.isDefault === true)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(2)
  })
})

describe('地址新增上限与编辑删除', () => {
  it('满 10 条后第 11 条回 400 ADDRESS_LIMIT_EXCEEDED', async () => {
    let created = 0
    for (let i = 0; i < 8; i++) {
      const res = await createAddress(addressBody(`测试地址${i}`))
      if (res.status === 400) {
        const body = await res.json()
        expect(body.code).toBe('ADDRESS_LIMIT_EXCEEDED')
        expect(body.message).toContain('10')
        break
      }
      expect(res.status).toBe(201)
      created++
    }
    expect(created).toBe(7)
    const list = await listAddresses()
    expect(list).toHaveLength(10)
  })

  it('PUT 编辑成功 200，字段落库且默认标记保持不变', async () => {
    const res = await fetch(`${ORIGIN}/api/addresses/3`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...addressBody('周野改'), detail: '科技园 9 栋 502' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.receiver).toBe('周野改')
    expect(body.detail).toBe('科技园 9 栋 502')
    expect(body.isDefault).toBe(false)

    const list = await listAddresses()
    const target = list.find((a) => a.id === 3)
    expect(target).toMatchObject({ receiver: '周野改', detail: '科技园 9 栋 502' })
  })

  it('PUT 编辑夹带 isDefault: true 不落库：响应与列表里默认标记保持原值', async () => {
    const payload = { ...addressBody('林晚改名'), isDefault: true }
    const res = await fetch(`${ORIGIN}/api/addresses/2`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isDefault).toBe(false)

    const list = await listAddresses()
    const target = list.find((a) => a.id === 2)
    expect(target?.isDefault).toBe(false)
  })

  it('删除被未支付订单引用的地址回 409 ADDRESS_IN_USE', async () => {
    const res = await fetch(`${ORIGIN}/api/addresses/3`, { method: 'DELETE' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('ADDRESS_IN_USE')
    expect(body.message).toContain('未支付订单')
  })

  it('地址不存在（含他人资源）回 404 ADDRESS_NOT_FOUND，不返 403', async () => {
    const put = await fetch(`${ORIGIN}/api/addresses/999`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(addressBody('不存在')),
    })
    expect(put.status).toBe(404)
    expect(put.status).not.toBe(403)
    expect((await put.json()).code).toBe('ADDRESS_NOT_FOUND')

    const del = await fetch(`${ORIGIN}/api/addresses/999`, { method: 'DELETE' })
    expect(del.status).toBe(404)
    expect(del.status).not.toBe(403)
    expect((await del.json()).code).toBe('ADDRESS_NOT_FOUND')

    const putDefault = await fetch(`${ORIGIN}/api/addresses/999/default`, { method: 'PUT' })
    expect(putDefault.status).toBe(404)
    expect(putDefault.status).not.toBe(403)
    expect((await putDefault.json()).code).toBe('ADDRESS_NOT_FOUND')
  })

  it('删除地址后，已生成的履约单仍返回完整收货信息快照', async () => {
    const before = await (await fetch(`${ORIGIN}/api/fulfillments`)).json()
    const snapshot = before.items.find((f: { id: number }) => f.id === 1).address

    await fetch(`${ORIGIN}/api/addresses/1`, { method: 'DELETE' })

    const after = await (await fetch(`${ORIGIN}/api/fulfillments`)).json()
    const kept = after.items.find((f: { id: number }) => f.id === 1).address
    expect(kept).toMatchObject({
      receiver: snapshot.receiver,
      phone: snapshot.phone,
      province: snapshot.province,
      city: snapshot.city,
      district: snapshot.district,
      detail: snapshot.detail,
    })
  })
})

describe('用户签收履约单', () => {
  it('PHYSICAL + SHIPPED 签收成功：status=SIGNED，signedAt 非空', async () => {
    const res = await signFulfillment(1)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('SIGNED')
    expect(typeof body.signedAt).toBe('string')
    expect(body.signedAt).not.toBeNull()
  })

  it('重复签收幂等成功，signedAt 保持首次签收时刻不变', async () => {
    const first = await signFulfillment(1)
    expect(first.status).toBe(200)
    const firstBody = await first.json()
    const firstSignedAt = firstBody.signedAt

    const second = await signFulfillment(1)
    expect(second.status).toBe(200)
    const secondBody = await second.json()
    expect(secondBody.status).toBe('SIGNED')
    expect(secondBody.signedAt).toBe(firstSignedAt)
  })

  it('虚拟履约单与未发货实体履约单签收回 409 FULFILLMENT_NOT_SIGNABLE', async () => {
    const virtual = await signFulfillment(2)
    expect(virtual.status).toBe(409)
    expect((await virtual.json()).code).toBe('FULFILLMENT_NOT_SIGNABLE')

    const pending = await signFulfillment(3)
    expect(pending.status).toBe(409)
    expect((await pending.json()).code).toBe('FULFILLMENT_NOT_SIGNABLE')
  })

  it('PHYSICAL + COMPLETED 实体履约单签收回 409 FULFILLMENT_NOT_SIGNABLE', async () => {
    const res = await signFulfillment(4)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('FULFILLMENT_NOT_SIGNABLE')
  })

  it('履约单不存在（含他人资源）回 404 FULFILLMENT_NOT_FOUND，不返 403', async () => {
    const res = await signFulfillment(999)
    expect(res.status).toBe(404)
    expect(res.status).not.toBe(403)
    expect((await res.json()).code).toBe('FULFILLMENT_NOT_FOUND')
  })
})

describe('地址与签收场景覆盖', () => {
  it('address-not-found：编辑、删除、设默认均回 404 ADDRESS_NOT_FOUND', async () => {
    const put = await fetch(`${ORIGIN}/api/addresses/1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...scenarioHeaders('address-not-found') },
      body: JSON.stringify(addressBody('x')),
    })
    expect(put.status).toBe(404)
    expect((await put.json()).code).toBe('ADDRESS_NOT_FOUND')

    const del = await fetch(`${ORIGIN}/api/addresses/1`, {
      method: 'DELETE',
      headers: scenarioHeaders('address-not-found'),
    })
    expect(del.status).toBe(404)
    expect((await del.json()).code).toBe('ADDRESS_NOT_FOUND')

    const putDefault = await fetch(`${ORIGIN}/api/addresses/1/default`, {
      method: 'PUT',
      headers: scenarioHeaders('address-not-found'),
    })
    expect(putDefault.status).toBe(404)
    expect((await putDefault.json()).code).toBe('ADDRESS_NOT_FOUND')
  })

  it('address-limit-exceeded：新增回 400 ADDRESS_LIMIT_EXCEEDED', async () => {
    const res = await createAddress(addressBody('x'), 'address-limit-exceeded')
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('ADDRESS_LIMIT_EXCEEDED')
  })

  it('address-in-use：删除回 409 ADDRESS_IN_USE', async () => {
    const res = await fetch(`${ORIGIN}/api/addresses/1`, {
      method: 'DELETE',
      headers: scenarioHeaders('address-in-use'),
    })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('ADDRESS_IN_USE')
  })

  it('address-bad-request：新增、编辑均回 400 BAD_REQUEST', async () => {
    const created = await createAddress(addressBody('x'), 'address-bad-request')
    expect(created.status).toBe(400)
    expect((await created.json()).code).toBe('BAD_REQUEST')

    const updated = await fetch(`${ORIGIN}/api/addresses/1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...scenarioHeaders('address-bad-request') },
      body: JSON.stringify(addressBody('x')),
    })
    expect(updated.status).toBe(400)
    expect((await updated.json()).code).toBe('BAD_REQUEST')
  })

  it('fulfillment-not-found：签收回 404 FULFILLMENT_NOT_FOUND', async () => {
    const res = await signFulfillment(999, 'fulfillment-not-found')
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('FULFILLMENT_NOT_FOUND')
  })

  it('fulfillment-not-signable：签收回 409 FULFILLMENT_NOT_SIGNABLE', async () => {
    const res = await signFulfillment(1, 'fulfillment-not-signable')
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('FULFILLMENT_NOT_SIGNABLE')
  })
})

describe('未支付订单支付后释放地址引用', () => {
  it('被未支付订单引用的地址先 409；支付成功后再删除回 204', async () => {
    const blocked = await fetch(`${ORIGIN}/api/addresses/3`, { method: 'DELETE' })
    expect(blocked.status).toBe(409)
    expect((await blocked.json()).code).toBe('ADDRESS_IN_USE')

    const pay = await fetch(`${ORIGIN}/api/orders/SO-UNPAID-1/pay`, { method: 'POST' })
    expect(pay.status).toBe(200)
    const payBody = await pay.json()
    expect(payBody.tradeNo).toBeTypeOf('string')
    expect(payBody.amount).toBeTypeOf('number')
    expect(payBody.payUrl).toBeTypeOf('string')

    const deleted = await fetch(`${ORIGIN}/api/addresses/3`, { method: 'DELETE' })
    expect(deleted.status).toBe(204)
    expect(await deleted.text()).toBe('')
  })

  it('支付不存在的订单回 404 ORDER_NOT_FOUND', async () => {
    const res = await fetch(`${ORIGIN}/api/orders/SO-MISSING/pay`, { method: 'POST' })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('ORDER_NOT_FOUND')
  })
})
