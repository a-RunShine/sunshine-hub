import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { createHandlers } from '@/mocks/handlers'
import { useAuth } from '@/stores/auth'
import { AppShell } from '@/components/layout/AppShell'
import HomePage from './HomePage'

/**
 * 首页边界测试：打在 MSW HTTP 边界与可见行为上——导航、分类筛选、卡片跳转、
 * 三态与重试、登录 / 退出入口。空 / 错误场景在测试内 resetHandlers 覆盖，
 * 不改共享成功种子；不断言 hook 内部状态与请求时机。
 */

const server = setupServer(...createHandlers())

const productUrls: string[] = []
const categoryUrls: string[] = []
const upcomingUrls: string[] = []
const logoutCalls: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/products') productUrls.push(url.search)
    if (url.pathname === '/api/categories') categoryUrls.push(url.search)
    if (url.pathname === '/api/campaigns/upcoming') upcomingUrls.push(request.method)
    if (url.pathname === '/api/auth/logout') logoutCalls.push(request.method)
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  productUrls.length = 0
  categoryUrls.length = 0
  upcomingUrls.length = 0
  logoutCalls.length = 0
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

function renderHome(children?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AppShell><HomePage /></AppShell>} />
        <Route path="/products/:productId" element={<ProbeLocation />} />
        <Route path="/campaigns/:campaignId" element={<ProbeLocation />} />
      </Routes>
      {children}
    </MemoryRouter>,
  )
}

const TWO_UPCOMING = {
  serverTime: new Date().toISOString(),
  items: [
    {
      id: 1,
      name: '暗夜猎手 首发',
      type: 'FLASH' as const,
      productId: 1,
      productName: '暗夜猎手 限定皮肤',
      startAt: new Date(Date.now() + 3600_000).toISOString(),
      coverUrl: '',
    },
    {
      id: 2,
      name: '破晓之环 返场',
      type: 'NORMAL' as const,
      productId: 2,
      productName: '破晓之环 典藏手办',
      startAt: new Date(Date.now() + 7200_000).toISOString(),
      coverUrl: '',
    },
  ],
}

describe('S1 首页渲染与数据映射', () => {
  it('导航四项可见，分类 / 商品 / 场次文案与价格来自接口响应', async () => {
    renderHome()

    await screen.findByRole('heading', { name: '暗夜猎手 限定皮肤' })

    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '我的订单' })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: '道具库' })).toHaveAttribute('href', '/items')
    expect(screen.getByRole('link', { name: '履约单' })).toHaveAttribute('href', '/fulfillments')

    // 分类名来自 /categories，不硬编码
    for (const name of ['武器皮肤', '角色皮肤', '徽章', '手办', '服饰']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }

    // 商品名 / 价格 / 限量标记来自 /products（商品名按商品卡标题定位，避开右栏场次卡的关联商品名）
    expect(screen.getByRole('heading', { name: '暗夜猎手 限定皮肤' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '破晓之环 典藏手办' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '赛季队服' })).toBeInTheDocument()
    expect(screen.getByText('¥128')).toBeInTheDocument()
    expect(screen.getByText('¥599')).toBeInTheDocument()
    expect(screen.getByText('¥199')).toBeInTheDocument()
    expect(screen.getAllByText('限量')).toHaveLength(2)
    expect(screen.getByText('常规')).toBeInTheDocument()

    // 场次名 / 开售时刻来自 /campaigns/upcoming（hero 标题与侧栏标题各一处）
    expect(screen.getAllByText('暗夜猎手 首发').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/开售/).length).toBeGreaterThanOrEqual(1)
  })

  it('商品卡链接指向 /products/:id，场次卡链接指向 /campaigns/:id', async () => {
    server.use(http.get('/api/campaigns/upcoming', () => HttpResponse.json(TWO_UPCOMING)))
    renderHome()

    await screen.findByText('破晓之环 返场')

    const productCard = screen.getByRole('heading', { name: '暗夜猎手 限定皮肤' }).closest('a')
    expect(productCard).toHaveAttribute('href', '/products/1')

    const campaignCard = screen.getByText('破晓之环 返场').closest('a')
    expect(campaignCard).toHaveAttribute('href', '/campaigns/2')
  })
})

describe('S2 分类筛选', () => {
  it('点分类 chip 后 /products 带对应 categoryId；点「全部」时不带该参数', async () => {
    renderHome()
    await screen.findByRole('heading', { name: '暗夜猎手 限定皮肤' })

    fireEvent.click(screen.getByRole('button', { name: '手办' }))
    await waitFor(() => expect(productUrls.some((q) => q.includes('categoryId=4'))).toBe(true))
    await screen.findByRole('heading', { name: '破晓之环 典藏手办' })
    expect(screen.queryByRole('heading', { name: '暗夜猎手 限定皮肤' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    await waitFor(() => expect(productUrls.some((q) => q === '')).toBe(true))
    await screen.findByRole('heading', { name: '暗夜猎手 限定皮肤' })
  })
})

describe('S3 / S4 卡片跳转', () => {
  it('点商品卡进入商品详情路由', async () => {
    server.use(http.get('/api/campaigns/upcoming', () => HttpResponse.json(TWO_UPCOMING)))
    renderHome()
    await screen.findByText('破晓之环 返场')

    fireEvent.click(screen.getByRole('heading', { name: '暗夜猎手 限定皮肤' }).closest('a')!)
    await screen.findByTestId('probe')
    expect(screen.getByTestId('probe').textContent).toBe('/products/1')
  })

  it('点场次卡进入抢购路由', async () => {
    server.use(http.get('/api/campaigns/upcoming', () => HttpResponse.json(TWO_UPCOMING)))
    renderHome()
    await screen.findByText('破晓之环 返场')

    fireEvent.click(screen.getByText('破晓之环 返场').closest('a')!)
    await screen.findByTestId('probe')
    expect(screen.getByTestId('probe').textContent).toBe('/campaigns/2')
  })
})

describe('S5 三态与重试', () => {
  it('商品列表空数组时渲染空态与 BrandMark', async () => {
    server.use(
      http.get('/api/products', () => HttpResponse.json({ items: [], page: 1, size: 20, total: 0 })),
    )
    renderHome()

    await screen.findByText('暂时没有内容，稍后再来看看')
    expect(document.querySelector('svg')).not.toBeNull()
  })

  it('商品列表 500：错误文案 + 重试按钮，点击后重新请求', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '服务出了点问题，稍后再试' }, { status: 500 }),
      ),
    )
    renderHome()

    const retry = await screen.findByRole('button', { name: '重试' })
    expect(screen.getByText('服务出了点问题，稍后再试')).toBeInTheDocument()

    const before = productUrls.length
    fireEvent.click(retry)
    await waitFor(() => expect(productUrls.length).toBeGreaterThan(before))
  })

  it('分类 500：错误态可重试，对应请求重新发出', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '分类拉取失败' }, { status: 500 }),
      ),
    )
    renderHome()

    const retry = await screen.findByRole('button', { name: '重试' })
    expect(screen.getByText('分类拉取失败')).toBeInTheDocument()

    const before = categoryUrls.length
    fireEvent.click(retry)
    await waitFor(() => expect(categoryUrls.length).toBeGreaterThan(before))
  })
})

describe('S5b 即将开售区块三态', () => {
  it('upcoming 挂起时展示加载态，不渲染场次内容', async () => {
    server.use(http.get('/api/campaigns/upcoming', () => new Promise(() => {})))
    renderHome()

    await screen.findByText('正在加载…')
    expect(screen.queryByText('暗夜猎手 首发')).not.toBeInTheDocument()
  })

  it('upcoming 空数组时渲染空态与 BrandMark', async () => {
    server.use(
      http.get('/api/campaigns/upcoming', () =>
        HttpResponse.json({ serverTime: new Date().toISOString(), items: [] }),
      ),
    )
    renderHome()

    await screen.findByText('暂时没有内容，稍后再来看看')
    expect(document.querySelector('svg')).not.toBeNull()
  })

  it('upcoming 500：错误文案 + 重试按钮，点击后重新请求', async () => {
    server.use(
      http.get('/api/campaigns/upcoming', () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: '场次拉取失败' },
          { status: 500 },
        ),
      ),
    )
    renderHome()

    const retry = await screen.findByRole('button', { name: '重试' })
    expect(screen.getByText('场次拉取失败')).toBeInTheDocument()

    const before = upcomingUrls.length
    fireEvent.click(retry)
    await waitFor(() => expect(upcomingUrls.length).toBeGreaterThan(before))
  })
})

describe('S7 登录态入口', () => {
  it('未登录显示登录链接，href 带 next 回跳路径', async () => {
    renderHome()
    await screen.findByText('暗夜猎手 限定皮肤')

    const login = screen.getByRole('link', { name: '登录' })
    expect(decodeURIComponent(login.getAttribute('href')!)).toBe('/login?next=/')
  })

  it('已登录显示用户名与退出；退出调用登出并清空本地登录态', async () => {
    useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
    useAuth.getState().setStatus('ready')
    renderHome()

    await screen.findByText('demo')
    const logout = screen.getByRole('button', { name: '退出' })
    fireEvent.click(logout)

    await waitFor(() => expect(logoutCalls).toContain('POST'))
    await waitFor(() => expect(useAuth.getState().me).toBeNull())
    expect(await screen.findByRole('link', { name: '登录' })).toBeInTheDocument()
  })
})
