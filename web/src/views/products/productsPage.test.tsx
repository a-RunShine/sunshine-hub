import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { createHandlers } from '@/mocks/handlers'
import { useAuth } from '@/stores/auth'
import { AppShell } from '@/components/layout/AppShell'
import ProductsPage from './ProductsPage'

/**
 * 经典商品选择页边界测试：分类来自 /categories、分类 + 商品形态（kind）组合筛选、
 * 分页切换、商品卡跳详情、三态与重试。
 */

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
  useAuth.setState({ me: null, status: 'uninitialized' })
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
        <Route
          path="/products"
          element={
            <AppShell>
              <ProductsPage />
            </AppShell>
          }
        />
        <Route path="/products/:productId" element={<ProbeLocation />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('S1 全部军需页渲染与导航高亮', () => {
  it('全部军需高亮、首页不误高亮；展示接口分类与 5 件商品', async () => {
    renderProductsPage()

    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    expect(screen.getByRole('link', { name: '全部军需' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '首页' })).not.toHaveAttribute('aria-current', 'page')

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

describe('S2 分类与形态组合筛选', () => {
  it('切换分类与形态向 /api/products 传递 categoryId 与 kind 参数', async () => {
    renderProductsPage()
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    // 按分类「手办」筛选
    fireEvent.click(screen.getByRole('button', { name: '手办' }))
    await waitFor(() => expect(productUrls.some((q) => q.includes('categoryId=4'))).toBe(true))
    await screen.findByRole('heading', { name: '破晓之环 典藏手办' })
    expect(screen.queryByRole('heading', { name: '幽影长弓 磁轨狙击' })).not.toBeInTheDocument()

    // 复位「全部」分类，再按「实体周边」筛选
    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    fireEvent.click(screen.getByRole('button', { name: '实体周边' }))
    await waitFor(() => expect(productUrls.some((q) => q.includes('kind=PHYSICAL'))).toBe(true))
    expect(screen.getByText('共 2 件')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '破晓之环 典藏手办' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '赛季队服' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '幽影长弓 磁轨狙击' })).not.toBeInTheDocument()

    // 叠加「武器皮肤」+「实体周边」命为空集，点回「全部形态」恢复
    fireEvent.click(screen.getByRole('button', { name: '武器皮肤' }))
    await screen.findByText('暂时没有内容，稍后再来看看')

    fireEvent.click(screen.getByRole('button', { name: '全部形态' }))
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })
  })
})

describe('S3 分页与三态', () => {
  it('total > size 时渲染分页控件并请求对应页码', async () => {
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
