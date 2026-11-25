import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createHandlers } from '@/mocks/handlers'
import { useAuth } from '@/stores/auth'
import { AppShell } from './AppShell'

const server = setupServer(...createHandlers())
const logoutCalls: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/auth/logout') logoutCalls.push(request.method)
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  logoutCalls.length = 0
  useAuth.setState({ me: null, status: 'uninitialized' })
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function renderShell(initialEntry = '/', layout?: 'default' | 'full-bleed') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppShell layout={layout}>
        <Routes>
          <Route path="/" element={<div>首页内容</div>} />
          <Route path="/products" element={<div>商品列表内容</div>} />
          <Route path="/orders" element={<div>订单页</div>} />
          <Route path="/items" element={<div>库存页</div>} />
          <Route path="/fulfillments" element={<div>履约单页</div>} />
          <Route path="/settings" element={<div>账号设置页</div>} />
          <Route path="/login" element={<div>登录页</div>} />
        </Routes>
      </AppShell>
    </MemoryRouter>,
  )
}

describe('主导航与激活态', () => {
  it('首页路由高亮「首页」，「全部商品」不误高亮', () => {
    renderShell('/')

    const homeLink = screen.getByRole('link', { name: '首页' })
    const productsLink = screen.getByRole('link', { name: '全部商品' })
    expect(homeLink).toHaveAttribute('href', '/')
    expect(homeLink).toHaveAttribute('aria-current', 'page')
    expect(productsLink).toHaveAttribute('href', '/products')
    expect(productsLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('/products 路由高亮「全部商品」，「首页」不误高亮', () => {
    renderShell('/products')

    expect(screen.getByRole('link', { name: '全部商品' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '首页' })).not.toHaveAttribute('aria-current', 'page')
  })
})

describe('个人账户头像菜单开关与入口', () => {
  it('支持点击切换、外部 mousedown、Escape 键与路由切换关闭，并包含订单 / 库存 / 履约单入口', () => {
    renderShell('/')

    const toggle = screen.getByRole('button', { name: '个人账户菜单' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu', { name: '个人账户菜单' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /我的订单/ })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('menuitem', { name: /我的库存/ })).toHaveAttribute('href', '/items')
    expect(screen.getByRole('menuitem', { name: /我的履约单/ })).toHaveAttribute('href', '/fulfillments')
    expect(screen.getByRole('menuitem', { name: /账号设置/ })).toHaveAttribute('href', '/settings')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '全部商品' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '全部商品' })).toHaveAttribute('aria-current', 'page')
  })

  it('匿名态显示带 next 回跳参数的登录链接与「未登录访客」，不显示退出', () => {
    renderShell('/products?kind=VIRTUAL')

    const login = screen.getByRole('link', { name: '登录' })
    expect(login).toHaveAttribute('href', '/login?next=%2Fproducts%3Fkind%3DVIRTUAL')
    expect(decodeURIComponent(login.getAttribute('href')!)).toBe('/login?next=/products?kind=VIRTUAL')

    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    expect(screen.getByText('未登录访客')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /退出/ })).not.toBeInTheDocument()
  })

  it('已登录态展示用户名与退出，点击退出调用 POST /api/auth/logout 并清空 useAuth', async () => {
    useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
    useAuth.getState().setStatus('ready')
    renderShell('/')

    expect(screen.queryByRole('link', { name: '登录' })).not.toBeInTheDocument()
    await screen.findByText('demo')

    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    const menu = screen.getByRole('menu')
    expect(menu).toHaveTextContent('demo')

    fireEvent.click(screen.getByRole('menuitem', { name: /退出/ }))

    await waitFor(() => expect(logoutCalls).toEqual(['POST']))
    await waitFor(() => expect(useAuth.getState().me).toBeNull())
    expect(useAuth.getState().status).toBe('ready')
    expect(await screen.findByRole('link', { name: '登录' })).toBeInTheDocument()
  })

  it('退出接口返回 500 时保留登录态并展示可访问错误提示，可手动关闭', async () => {
    server.use(
      http.post('/api/auth/logout', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '服务出了点问题' }, { status: 500 }),
      ),
    )
    useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
    useAuth.getState().setStatus('ready')
    renderShell('/')

    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /退出/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('服务出了点问题')
    expect(useAuth.getState().me).toEqual({ id: 1, username: 'demo', realNameVerified: false })
    expect(screen.queryByRole('link', { name: '登录' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('退出接口返回 401 时清空登录态且不触发整页跳登录', async () => {
    server.use(
      http.post('/api/auth/logout', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: '请先登录' }, { status: 401 }),
      ),
    )
    useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
    useAuth.getState().setStatus('ready')
    renderShell('/products')

    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /退出/ }))

    await waitFor(() => expect(useAuth.getState().me).toBeNull())
    expect(useAuth.getState().status).toBe('ready')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('商品列表内容')).toBeInTheDocument()
  })
})

describe('滚动显隐与布局形态', () => {
  it('下滑超过 48px 隐藏顶栏并关闭已展开菜单；上滑或回顶 <= 24px 恢复展示', () => {
    renderShell('/')

    const header = document.querySelector('header')!
    expect(header.className).toContain('translate-y-0')

    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    Object.defineProperty(window, 'scrollY', { value: 140, configurable: true, writable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('-translate-y-full')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true, writable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('translate-y-0')

    Object.defineProperty(window, 'scrollY', { value: 160, configurable: true, writable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('-translate-y-full')

    Object.defineProperty(window, 'scrollY', { value: 24, configurable: true, writable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('translate-y-0')
  })

  it('顶栏下滑隐藏后通过导航切换路由，恢复展示且菜单保持关闭', () => {
    renderShell('/')

    const header = document.querySelector('header')!
    Object.defineProperty(window, 'scrollY', { value: 140, configurable: true, writable: true })
    fireEvent.scroll(window)
    expect(header.className).toContain('-translate-y-full')

    fireEvent.click(screen.getByRole('link', { name: '全部商品' }))
    expect(header.className).toContain('translate-y-0')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('区分 layout="default" 与 layout="full-bleed" 的主容器宽度类名', () => {
    const { unmount } = renderShell('/', 'default')
    const defaultMain = screen.getByRole('main')
    expect(defaultMain.className).toContain('max-w-[1360px]')
    unmount()

    renderShell('/', 'full-bleed')
    const fullBleedMain = screen.getByRole('main')
    expect(fullBleedMain.className).toContain('w-full')
    expect(fullBleedMain.className).not.toContain('max-w-[1360px]')
  })
})
