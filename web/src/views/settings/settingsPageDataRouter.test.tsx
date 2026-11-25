import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  Link,
  RouterProvider,
  createMemoryRouter,
  useLocation,
  type RouteObject,
} from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { createHandlers } from '@/mocks/handlers'
import RequireAuth from '@/router/RequireAuth'
import { useAuth } from '@/stores/auth'
import LoginPage from '@/views/auth/LoginPage'
import SettingsPage from './SettingsPage'

// jsdom 的 AbortSignal 与 Node 原生 Request 不同源，data router 每次导航都会用 signal 构造 Request
const NativeRequest = globalThis.Request
class DataRouterRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init === undefined ? init : { ...init, signal: undefined })
  }
}
globalThis.Request = DataRouterRequest

const server = setupServer(...createHandlers())

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  useAuth.setState({
    me: { id: 1, username: 'demo', realNameVerified: false },
    status: 'ready',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  globalThis.Request = NativeRequest
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

const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <AppShell>
        <ProbeLocation />
        <Link to="/orders">前往我的订单</Link>
        <LoginPage />
      </AppShell>
    ),
  },
  {
    path: '/settings',
    element: (
      <RequireAuth>
        <AppShell>
          <ProbeLocation />
          <SettingsPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/orders',
    element: (
      <RequireAuth>
        <AppShell>
          <ProbeLocation />
          <div>我的订单内容</div>
        </AppShell>
      </RequireAuth>
    ),
  },
]

function renderSettingsFlow() {
  const router = createMemoryRouter(routes, { initialEntries: ['/settings'] })
  const navigations: Array<{ to: string; me: unknown }> = []
  const nativeNavigate = router.navigate
  router.navigate = ((to: unknown, options?: unknown) => {
    navigations.push({ to: String(to), me: useAuth.getState().me })
    return nativeNavigate(to as never, options as never)
  }) as typeof router.navigate
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return { router, navigations }
}

function submitPasswordChange() {
  fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: '12345678' } })
  fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'newpass123' } })
  fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'newpass123' } })
  fireEvent.click(screen.getByRole('button', { name: '确认修改' }))
}

describe('SettingsPage 修改密码在 data router 下的跳转', () => {
  it('清空登录态后再跳转，登录页展示一次性提示且不残留到其他受保护页', async () => {
    const { router, navigations } = renderSettingsFlow()

    submitPasswordChange()

    expect(await screen.findByRole('heading', { name: '登录账号' })).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fsettings')
    expect(navigations).toEqual([{ to: '/login?next=%2Fsettings', me: null }])
    expect(router.state.location.state).toEqual({ notice: '密码已修改，请用新密码重新登录' })
    expect(screen.getByRole('status')).toHaveTextContent('密码已修改，请用新密码重新登录')

    fireEvent.click(screen.getByRole('link', { name: '前往我的订单' }))

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Forders'),
    )
    expect(router.state.location.state).toBeNull()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('旧密码登录失败，新密码登录后回到设置页且不显示提示', async () => {
    renderSettingsFlow()

    submitPasswordChange()
    expect(await screen.findByRole('heading', { name: '登录账号' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'demo' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码不对')
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fsettings')

    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('heading', { name: '账号设置' })).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/settings')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
