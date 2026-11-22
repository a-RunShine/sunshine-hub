import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { createHandlers } from '@/mocks/handlers'
import ProductsPage from './ProductsPage'

const server = setupServer(...createHandlers())

const productUrls: string[] = []
const categoryUrls: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/products') productUrls.push(url.search)
    if (url.pathname === '/api/categories') categoryUrls.push(url.search)
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  productUrls.length = 0
  categoryUrls.length = 0
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function ProbeLocation() {
  const location = useLocation()
  return <div data-testid="probe">{location.pathname}</div>
}

function renderProductsPage() {
  return render(
    <MemoryRouter initialEntries={['/products']}>
      <Routes>
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProbeLocation />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('S1 全部商品页渲染与跳详情', () => {
  it('展示接口分类与 5 件商品，价格与限量标记映射正确', async () => {
    renderProductsPage()

    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    for (const name of ['武器皮肤', '角色皮肤', '徽章', '手办', '服饰']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }

    expect(screen.getByText('共 5 件')).toBeInTheDocument()
    expect(screen.getAllByText('限量')).toHaveLength(3)
    expect(screen.queryByText('常规')).not.toBeInTheDocument()
    expect(screen.getByText('¥168')).toBeInTheDocument()
    expect(screen.getByText('¥599')).toBeInTheDocument()
  })

  it('点击商品卡进入 /products/:id', async () => {
    renderProductsPage()
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    fireEvent.click(screen.getByRole('heading', { name: '幽影长弓 磁轨狙击' }).closest('a')!)
    await screen.findByTestId('probe')
    expect(screen.getByTestId('probe').textContent).toBe('/products/4')
  })
})

describe('S2 分类、漏斗筛选与搜索过滤', () => {
  it('切换分类与点开漏斗筛选形态，向 /api/products 传递 categoryId 与 kind 参数，并支持仅看限量与关键词搜索', async () => {
    renderProductsPage()
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    fireEvent.click(screen.getByRole('button', { name: '手办' }))
    await waitFor(() => expect(productUrls.some((q) => q.includes('categoryId=4'))).toBe(true))
    await screen.findByRole('heading', { name: '破晓之环 典藏手办' })
    expect(screen.queryByRole('heading', { name: '幽影长弓 磁轨狙击' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    fireEvent.click(screen.getByRole('button', { name: '筛选' }))
    fireEvent.click(screen.getByRole('button', { name: '实体周边' }))
    await waitFor(() => expect(productUrls.some((q) => q.includes('kind=PHYSICAL'))).toBe(true))
    expect(screen.getByText('共 2 件')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '破晓之环 典藏手办' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '赛季队服' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '幽影长弓 磁轨狙击' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '仅看限量' }))
    expect(screen.getByText('当前页命中 1 件（共 2 件）')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '赛季队服' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '全部属性' }))
    fireEvent.click(screen.getByRole('button', { name: '全部形态' }))
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    const searchInput = screen.getByRole('searchbox', { name: '搜索商品' })
    fireEvent.change(searchInput, { target: { value: '磁轨' } })
    expect(screen.getByRole('heading', { name: '幽影长弓 磁轨狙击' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '疾风原型 战术冲锋枪' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.getByRole('heading', { name: '疾风原型 战术冲锋枪' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '武器皮肤' }))
    fireEvent.click(screen.getByRole('button', { name: '实体周边' }))
    await screen.findByText('暂时没有内容，稍后再来看看')

    fireEvent.click(screen.getByRole('button', { name: '全部形态' }))
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })
  })
})

describe('S3 分页与三态', () => {
  it('total > size 时渲染分页控件并请求对应页码，页内过滤显式标明作用范围', async () => {
    server.use(
      http.get('/api/products', ({ request }) => {
        const url = new URL(request.url, 'http://localhost:3000')
        const page = Number(url.searchParams.get('page') ?? '1')
        return HttpResponse.json({
          items: [
            {
              id: page === 2 ? 99 : 4,
              name: page === 2 ? '第二页测试军需' : '幽影长弓 磁轨狙击',
              kind: 'VIRTUAL',
              categoryId: 1,
              coverUrl: '',
              minPrice: 16800,
              limited: true,
            },
          ],
          page,
          size: 12,
          total: 15,
        })
      }),
    )

    renderProductsPage()
    await screen.findByText('第 1 / 2 页')

    const searchInput = screen.getByRole('searchbox', { name: '搜索商品' })
    fireEvent.change(searchInput, { target: { value: '磁轨' } })
    expect(screen.getByText('第 1 页命中 1 件（当前仅筛本页）')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '清空' }))

    const prev = screen.getByRole('button', { name: '上一页' })
    const next = screen.getByRole('button', { name: '下一页' })
    expect(prev).toBeDisabled()
    expect(next).toBeEnabled()

    fireEvent.click(next)
    await waitFor(() => expect(productUrls.some((q) => q.includes('page=2'))).toBe(true))
    await screen.findByRole('heading', { name: '第二页测试军需' })
    expect(screen.getByText('第 2 / 2 页')).toBeInTheDocument()
  })

  it('分类 500：错误态可重试并重新请求 /api/categories', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '分类拉取失败' }, { status: 500 }),
      ),
    )
    renderProductsPage()

    const retry = await screen.findByRole('button', { name: '重试' })
    expect(screen.getByText('分类拉取失败')).toBeInTheDocument()

    const before = categoryUrls.length
    fireEvent.click(retry)
    await waitFor(() => expect(categoryUrls.length).toBeGreaterThan(before))
  })

  it('商品 500：错误态可重试并重新请求 /api/products', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '商品拉取失败' }, { status: 500 }),
      ),
    )
    renderProductsPage()

    const retry = await screen.findByRole('button', { name: '重试' })
    expect(screen.getByText('商品拉取失败')).toBeInTheDocument()

    const before = productUrls.length
    fireEvent.click(retry)
    await waitFor(() => expect(productUrls.length).toBeGreaterThan(before))
  })
})
