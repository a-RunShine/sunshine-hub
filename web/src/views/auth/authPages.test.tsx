import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { createHandlers } from '@/mocks/handlers'
import RequireAuth from '@/router/RequireAuth'
import { useAuth } from '@/stores/auth'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'

const server = setupServer(...createHandlers(undefined, { initialUsername: null }))

const requests: Array<{ method: string; path: string }> = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    requests.push({ method: request.method, path: new URL(request.url).pathname })
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers(undefined, { initialUsername: null }))
  requests.length = 0
  useAuth.setState({ me: null, status: 'ready', authNotice: null })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function ProbeLocation() {
  const location = useLocation()
  return (
    <div data-testid="probe">
      {location.pathname}
      {location.search}
    </div>
  )
}

function renderAuthRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ProbeLocation />
      <Routes>
        <Route path="/" element={<AppShell><div>首页内容</div></AppShell>} />
        <Route path="/products" element={<AppShell><div>全部商品内容</div></AppShell>} />
        <Route path="/orders" element={<AppShell><div>我的订单内容</div></AppShell>} />
        <Route path="/login" element={<AppShell><LoginPage /></AppShell>} />
        <Route path="/register" element={<AppShell><RegisterPage /></AppShell>} />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AppShell>
                <div>账号设置内容</div>
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  it('注册表单仅含用户名、密码与确认密码，不含实名与排除字段，支持显示切换', () => {
    renderAuthRoutes('/register')

    expect(screen.getByRole('heading', { name: '注册账号' })).toBeInTheDocument()
    const passwordInput = screen.getByLabelText('密码')
    const confirmInput = screen.getByLabelText('确认密码')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    const togglePassword = screen.getByRole('button', { name: '显示密码' })
    expect(togglePassword).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(togglePassword)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: '隐藏密码' })).toHaveAttribute('aria-pressed', 'true')

    const bodyText = document.body.textContent ?? ''
    expect(bodyText).not.toMatch(/实名|证件号|身份证|大区/)
  })

  it('校验不通过时不发请求', () => {
    renderAuthRoutes('/register')

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'ab' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '1234567' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    expect(screen.getByText('用户名需为 3 到 32 个字符')).toBeInTheDocument()
    expect(screen.getByText('密码需为 8 到 64 个字符')).toBeInTheDocument()
    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('注册成功写入 useAuth 并按清洗后的 next 回跳，非法 next 回退至首页', async () => {
    renderAuthRoutes('/register?next=%2Forders%3Ftab%3Dpaid')

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'new_player' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    expect(await screen.findByText('我的订单内容')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/orders?tab=paid')
    expect(useAuth.getState().me?.username).toBe('new_player')
    expect(useAuth.getState().status).toBe('ready')
  })

  it('非法外部 next 参数在注册成功后回退到首页', async () => {
    renderAuthRoutes('/register?next=%2F%2Fevil.com')

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'safe_user' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    expect(await screen.findByText('首页内容')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/')
  })

  it('重复用户名返回 409 USERNAME_TAKEN 时展示错误并保留已填内容', async () => {
    renderAuthRoutes('/register')

    const usernameInput = screen.getByLabelText('用户名') as HTMLInputElement
    const passwordInput = screen.getByLabelText('密码') as HTMLInputElement
    fireEvent.change(usernameInput, { target: { value: 'demo' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('这个用户名已经被占用')
    expect(usernameInput.value).toBe('demo')
    expect(passwordInput.value).toBe('password123')
    expect(useAuth.getState().me).toBeNull()
  })
})

describe('LoginPage 与回跳守卫', () => {
  it('登录凭据错误返回 401 BAD_CREDENTIALS 时停留在登录页、保留输入并展示错误', async () => {
    const hrefBefore = window.location.href
    renderAuthRoutes('/login?next=%2Forders')

    const usernameInput = screen.getByLabelText('用户名') as HTMLInputElement
    const passwordInput = screen.getByLabelText('密码') as HTMLInputElement
    fireEvent.change(usernameInput, { target: { value: 'demo' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('用户名或密码不对')
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Forders')
    expect(window.location.href).toBe(hrefBefore)
    expect(usernameInput.value).toBe('demo')
    expect(passwordInput.value).toBe('wrongpass')
  })

  it('登录成功按合法 next 回跳并清除 authNotice；顶栏不生成嵌套登录链接', async () => {
    useAuth.getState().setAuthNotice('密码已修改，请用新密码重新登录')
    renderAuthRoutes('/login?next=%2Forders')

    expect(screen.getByRole('status')).toHaveTextContent('密码已修改，请用新密码重新登录')
    expect(screen.getByRole('link', { name: '登录' })).toHaveAttribute('href', '/login?next=%2Forders')
    expect(screen.getByRole('link', { name: '去注册' })).toHaveAttribute(
      'href',
      '/register?next=%2Forders',
    )

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'demo' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('我的订单内容')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/orders')
    expect(useAuth.getState().me?.username).toBe('demo')
    expect(useAuth.getState().authNotice).toBeNull()
  })

  it('已登录访问 /login 直接跳往清洗后的 next 目标', async () => {
    useAuth.getState().setMe({ id: 1, username: 'demo', realNameVerified: false })
    renderAuthRoutes('/login?next=%2Fproducts')

    expect(await screen.findByText('全部商品内容')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/products')
  })

  it('status 为 uninitialized 时独立渲染登录页不卡在加载态', () => {
    useAuth.setState({ me: null, status: 'uninitialized', authNotice: null })
    renderAuthRoutes('/login')

    expect(screen.getByRole('heading', { name: '登录账号' })).toBeInTheDocument()
    expect(screen.queryByText('正在加载…')).not.toBeInTheDocument()
  })

  it('未登录访问受保护页 /settings 先跳 /login?next=%2Fsettings，登录后回到 /settings', async () => {
    renderAuthRoutes('/settings')

    expect(await screen.findByRole('heading', { name: '登录账号' })).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fsettings')

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'demo' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('账号设置内容')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/settings')
  })
})

describe('AppShell 退出分流与非乐观更新', () => {
  it('在受保护页 /settings 点击退出后跳回 /login?next=%2Fsettings', async () => {
    server.use(...createHandlers(undefined, { initialUsername: 'demo' }))
    useAuth.setState({
      me: { id: 1, username: 'demo', realNameVerified: false },
      status: 'ready',
      authNotice: null,
    })
    renderAuthRoutes('/settings')

    expect(await screen.findByText('账号设置内容')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /退出/ }))

    expect(await screen.findByRole('heading', { name: '登录账号' })).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fsettings')
  })

  it('在公开页 /products 点击退出后停留在当前页并切换为登录入口', async () => {
    server.use(...createHandlers(undefined, { initialUsername: 'demo' }))
    useAuth.setState({
      me: { id: 1, username: 'demo', realNameVerified: false },
      status: 'ready',
      authNotice: null,
    })
    renderAuthRoutes('/products')

    expect(await screen.findByText('全部商品内容')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /退出/ }))

    await waitFor(() => expect(useAuth.getState().me).toBeNull())
    expect(screen.getByTestId('probe').textContent).toBe('/products')
    expect(screen.getByRole('link', { name: '登录' })).toHaveAttribute(
      'href',
      '/login?next=%2Fproducts',
    )
  })

  it('退出返回 500 时保持已登录态并呈现错误提示', async () => {
    server.use(
      http.post('/api/auth/logout', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '服务出了点问题' }, { status: 500 }),
      ),
    )
    useAuth.setState({
      me: { id: 1, username: 'demo', realNameVerified: false },
      status: 'ready',
      authNotice: null,
    })
    renderAuthRoutes('/products')

    fireEvent.click(screen.getByRole('button', { name: '个人账户菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /退出/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('服务出了点问题')
    expect(useAuth.getState().me?.username).toBe('demo')
    expect(screen.getByTestId('probe').textContent).toBe('/products')
  })
})
