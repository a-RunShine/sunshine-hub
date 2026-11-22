import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
 * 首页边界测试：打在 MSW HTTP 边界与可见行为上——导航、首屏抢购海报与中文倒计时、
 * 第二屏水平手风琴切换、卡片与查看全部跳转、三态与重试、登录 / 退出入口。
 */

const server = setupServer(...createHandlers())

const productUrls: string[] = []
const upcomingUrls: string[] = []
const logoutCalls: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/products') productUrls.push(url.search)
    if (url.pathname === '/api/campaigns/upcoming') upcomingUrls.push(request.method)
    if (url.pathname === '/api/auth/logout') logoutCalls.push(request.method)
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  productUrls.length = 0
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
        <Route
          path="/"
          element={
            <AppShell layout="full-bleed">
              <HomePage />
            </AppShell>
          }
        />
        <Route path="/products" element={<ProbeLocation />} />
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
      coverUrl: '/assets/rifle-trim.png',
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
  it('左靠主导航与右上角头像下拉可见，首屏海报、中文倒计时与第二屏 5 件手风琴展柜来自接口响应', async () => {
    renderHome()

    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '全部商品' })).toHaveAttribute('href', '/products')

    // 点开右上角头像显示个人账户菜单：我的订单 / 我的库存 / 我的履约单
    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    expect(screen.getByRole('menuitem', { name: /我的订单/ })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('menuitem', { name: /我的库存/ })).toHaveAttribute('href', '/items')
    expect(screen.getByRole('menuitem', { name: /我的履约单/ })).toHaveAttribute('href', '/fulfillments')

    // 首屏限时抢购海报与中文基线倒计时
    expect(screen.getByRole('heading', { name: '暗夜猎手 首发' })).toBeInTheDocument()
    const timer = screen.getByRole('timer', { name: '距离开售倒计时' })
    expect(within(timer).getByText('时')).toBeInTheDocument()
    expect(within(timer).getByText('分')).toBeInTheDocument()
    expect(within(timer).getByText('秒')).toBeInTheDocument()
    expect(screen.queryByText('HOURS')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /查看场次/ })).toHaveAttribute('href', '/campaigns/1')
    expect(screen.getByText(/开售/)).toBeInTheDocument()

    // 第二屏精选军需（无分类 Tab，右上查看全部入口）与 5 件手风琴切片
    expect(screen.getByRole('heading', { name: '精选军需' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /查看全部/ })).toHaveAttribute('href', '/products')
    expect(productUrls.some((q) => q.includes('size=5'))).toBe(true)

    for (const name of [
      '幽影长弓 磁轨狙击',
      '疾风原型 战术冲锋枪',
      '暗夜猎手 限定皮肤',
      '破晓之环 典藏手办',
      '赛季队服',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByText('¥168').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('¥88').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('¥128').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('¥599').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('¥199').length).toBeGreaterThanOrEqual(1)
  })

  it('多场未开售时在第二屏下方渲染其余场次卡并指向 /campaigns/:id', async () => {
    server.use(http.get('/api/campaigns/upcoming', () => HttpResponse.json(TWO_UPCOMING)))
    renderHome()

    await screen.findByText('破晓之环 返场')
    const campaignCard = screen.getByText('破晓之环 返场').closest('a')
    expect(campaignCard).toHaveAttribute('href', '/campaigns/2')
  })
})

describe('S2 手风琴切换与页面跳转', () => {
  it('默认展开第一项，点击或键盘方向键可切换展开项，点查看详情进 /products/:id', async () => {
    renderHome()
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    const slice1 = screen.getByRole('heading', { name: '幽影长弓 磁轨狙击' }).closest('article')!
    const slice2 = screen.getByRole('heading', { name: '疾风原型 战术冲锋枪' }).closest('article')!
    expect(slice1).toHaveAttribute('aria-expanded', 'true')
    expect(slice2).toHaveAttribute('aria-expanded', 'false')

    // 点击收起项：只展开不直接跳走
    fireEvent.click(slice2)
    expect(slice2).toHaveAttribute('aria-expanded', 'true')
    expect(slice1).toHaveAttribute('aria-expanded', 'false')

    // 键盘右键切到第三项
    fireEvent.keyDown(slice2, { key: 'ArrowRight' })
    const slice3 = screen.getByRole('heading', { name: '暗夜猎手 限定皮肤' }).closest('article')!
    expect(slice3).toHaveAttribute('aria-expanded', 'true')

    // 点击已展开项里的「查看详情 →」跳转到对应详情路由
    fireEvent.click(within(slice3).getByRole('link', { name: /查看详情/ }))
    await screen.findByTestId('probe')
    expect(screen.getByTestId('probe').textContent).toBe('/products/1')
  })

  it('点「查看全部 →」进入 /products', async () => {
    renderHome()
    await screen.findByRole('heading', { name: '精选军需' })

    fireEvent.click(screen.getByRole('link', { name: /查看全部/ }))
    await screen.findByTestId('probe')
    expect(screen.getByTestId('probe').textContent).toBe('/products')
  })

  it('点首屏「查看场次 →」进入 /campaigns/1', async () => {
    renderHome()
    await screen.findByRole('heading', { name: '暗夜猎手 首发' })

    fireEvent.click(screen.getByRole('link', { name: /查看场次/ }))
    await screen.findByTestId('probe')
    expect(screen.getByTestId('probe').textContent).toBe('/campaigns/1')
  })
})

describe('S3 三态与重试', () => {
  it('精选商品空数组时渲染空态与 BrandMark', async () => {
    server.use(
      http.get('/api/products', () => HttpResponse.json({ items: [], page: 1, size: 5, total: 0 })),
    )
    renderHome()

    await screen.findByText('暂时没有内容，稍后再来看看')
    expect(document.querySelector('svg')).not.toBeNull()
  })

  it('精选商品 500：错误文案 + 重试按钮，点击后重新请求', async () => {
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

  it('分类接口 500 时不影响首页精选手风琴展示', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '分类拉取失败' }, { status: 500 }),
      ),
    )
    renderHome()

    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })
    expect(screen.queryByText('分类拉取失败')).not.toBeInTheDocument()
  })

  it('upcoming 挂起时展示加载态，不渲染场次内容', async () => {
    server.use(http.get('/api/campaigns/upcoming', () => new Promise(() => {})))
    renderHome()

    await screen.findByText('正在加载…')
    expect(screen.queryByRole('heading', { name: '暗夜猎手 首发' })).not.toBeInTheDocument()
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

describe('S4 登录态入口', () => {
  it('未登录显示登录链接，href 带 next 回跳路径', async () => {
    renderHome()
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    const login = screen.getByRole('link', { name: '登录' })
    expect(decodeURIComponent(login.getAttribute('href')!)).toBe('/login?next=/')
  })

  it('已登录在头像下拉中显示用户名与退出；退出调用登出并清空本地登录态', async () => {
    useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
    useAuth.getState().setStatus('ready')
    renderHome()

    await screen.findByText('demo')
    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    const logout = screen.getByRole('menuitem', { name: /退出/ })
    fireEvent.click(logout)

    await waitFor(() => expect(logoutCalls).toContain('POST'))
    await waitFor(() => expect(useAuth.getState().me).toBeNull())
    expect(await screen.findByRole('link', { name: '登录' })).toBeInTheDocument()
  })

  it('下滑超过 48px 时收起顶部导航，回滑顶部恢复展示', async () => {
    renderHome()
    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    const header = document.querySelector('header')!
    expect(header.className).toContain('translate-y-0')

    Object.defineProperty(window, 'scrollY', { value: 140, configurable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('-translate-y-full')

    Object.defineProperty(window, 'scrollY', { value: 10, configurable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('translate-y-0')
  })
})
