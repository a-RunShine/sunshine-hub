import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createHandlers } from './handlers'
import { MOCK_SCENARIO_HEADER } from './scenarios'

/**
 * 分类资源的 MSW HTTP 边界测试：只通过真实 fetch 打 handler 暴露出去的 HTTP 接口，
 * 不断言 handler 内部实现。场景选择由请求头 `X-Mock-Scenario` 完成，与既有抢购/下单场景同协议。
 *
 * 每个用例前用全新 createHandlers() 复位闭包（分类表、商品引用），用例之间互不复用状态。
 */

const ORIGIN = 'http://localhost:3000'

const server = setupServer(...createHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => server.resetHandlers(...createHandlers()))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function scenarioHeaders(scenarioId?: string): Record<string, string> {
  return scenarioId ? { [MOCK_SCENARIO_HEADER]: scenarioId } : {}
}

describe('分类列表与商品分类引用', () => {
  it('GET /categories 返回五个初始分类，按 sortOrder 升序', async () => {
    const res = await fetch(`${ORIGIN}/api/categories`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(body.map((c: { id: number }) => c.id)).toEqual([1, 2, 3, 4, 5])
    expect(body.map((c: { sortOrder: number }) => c.sortOrder)).toEqual([1, 2, 3, 4, 5])
    expect(body[0].name).toBe('武器皮肤')
  })

  it('GET /products 带 categoryId 筛选；与 kind 同时出现时为 AND 组合', async () => {
    const byCategory = await (await fetch(`${ORIGIN}/api/products?categoryId=4`)).json()
    expect(byCategory.items.map((p: { id: number }) => p.id)).toEqual([2])

    const combo = await (await fetch(`${ORIGIN}/api/products?categoryId=4&kind=PHYSICAL`)).json()
    expect(combo.items.map((p: { id: number }) => p.id)).toEqual([2])

    const comboEmpty = await (await fetch(`${ORIGIN}/api/products?categoryId=4&kind=VIRTUAL`)).json()
    expect(comboEmpty.items).toEqual([])
  })

  it('商品列表与详情都带必填的 categoryId', async () => {
    const list = await (await fetch(`${ORIGIN}/api/products`)).json()
    for (const product of list.items) {
      expect(typeof product.categoryId).toBe('number')
    }
    const detail = await (await fetch(`${ORIGIN}/api/products/2`)).json()
    expect(detail.categoryId).toBe(4)
  })
})

describe('管理端分类增删改查', () => {
  it('删除被商品引用的分类回 409 CATEGORY_IN_USE，说明先迁移商品', async () => {
    const res = await fetch(`${ORIGIN}/api/admin/categories/1`, { method: 'DELETE' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('CATEGORY_IN_USE')
    expect(body.message).toContain('迁移商品')
  })

  it('删除没有商品引用的分类回 204，列表里随即移除', async () => {
    const res = await fetch(`${ORIGIN}/api/admin/categories/2`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')

    const list = await (await fetch(`${ORIGIN}/api/categories`)).json()
    expect(list.find((c: { id: number }) => c.id === 2)).toBeUndefined()
  })

  it('新增分类后列表可见，按新分类 id 筛选商品同样可用（不改契约即可扩展）', async () => {
    const created = await fetch(`${ORIGIN}/api/admin/categories`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '周边挂件', sortOrder: 6 }),
    })
    expect(created.status).toBe(201)
    const category = await created.json()

    const list = await (await fetch(`${ORIGIN}/api/categories`)).json()
    expect(list.find((c: { id: number }) => c.id === category.id)).toMatchObject({
      name: '周边挂件',
      sortOrder: 6,
    })

    const filtered = await (await fetch(`${ORIGIN}/api/products?categoryId=${category.id}`)).json()
    expect(filtered.items).toEqual([])
    expect(filtered.total).toBe(0)
  })

  it('更新分类名称与排序：200 回写，列表顺序随之变化', async () => {
    const res = await fetch(`${ORIGIN}/api/admin/categories/3`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '金属徽章', sortOrder: 0 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('金属徽章')
    // 名称可改、id 不变：响应 id 必须与请求路径 id 相同。
    expect(body.id).toBe(3)

    const list = await (await fetch(`${ORIGIN}/api/categories`)).json()
    expect(list[0].id).toBe(3)
  })

  it('分类不存在：PUT/DELETE 回 404 CATEGORY_NOT_FOUND', async () => {
    const put = await fetch(`${ORIGIN}/api/admin/categories/999`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '不存在', sortOrder: 1 }),
    })
    expect(put.status).toBe(404)
    expect((await put.json()).code).toBe('CATEGORY_NOT_FOUND')

    const del = await fetch(`${ORIGIN}/api/admin/categories/999`, { method: 'DELETE' })
    expect(del.status).toBe(404)
    expect((await del.json()).code).toBe('CATEGORY_NOT_FOUND')
  })
})

describe('分类管理端场景覆盖', () => {
  it('category-forbidden：403 FORBIDDEN', async () => {
    const res = await fetch(`${ORIGIN}/api/admin/categories`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...scenarioHeaders('category-forbidden') },
      body: JSON.stringify({ name: 'x', sortOrder: 9 }),
    })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('category-in-use：409 CATEGORY_IN_USE', async () => {
    const res = await fetch(`${ORIGIN}/api/admin/categories/1`, {
      method: 'DELETE',
      headers: scenarioHeaders('category-in-use'),
    })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('CATEGORY_IN_USE')
  })

  it('category-not-found：404 CATEGORY_NOT_FOUND', async () => {
    const res = await fetch(`${ORIGIN}/api/admin/categories/999`, {
      method: 'DELETE',
      headers: scenarioHeaders('category-not-found'),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('CATEGORY_NOT_FOUND')
  })
})
