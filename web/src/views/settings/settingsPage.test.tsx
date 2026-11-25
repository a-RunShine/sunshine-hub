import { fireEvent, render, screen } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { createHandlers } from '@/mocks/handlers'
import RequireAuth from '@/router/RequireAuth'
import { useAuth } from '@/stores/auth'
import LoginPage from '@/views/auth/LoginPage'
import SettingsPage from './SettingsPage'

const server = setupServer(...createHandlers())
const passwordRequests: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/me/password') passwordRequests.push(request.method)
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  passwordRequests.length = 0
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

function renderSettingsFlow() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <ProbeLocation />
      <Routes>
        <Route path="/login" element={<AppShell><LoginPage /></AppShell>} />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AppShell>
                <SettingsPage />
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage 只读账号信息', () => {
  it('未实名态展示用户名、未实名标签与说明，不提供实名编辑表单', () => {
    renderSettingsFlow()

    expect(screen.getByRole('heading', { name: '账号设置' })).toBeInTheDocument()
    expect(screen.getByText('账号安全')).toBeInTheDocument()
    expect(screen.getByText('未实名')).toBeInTheDocument()
    expect(screen.getByText('参与限时抢购时再按提示完成实名认证，此处仅展示当前状态。')).toBeInTheDocument()
    expect(screen.queryByLabelText('购买人姓名')).not.toBeInTheDocument()
  })

  it('已实名态展示已实名标签、姓名与后四位尾号', () => {
    useAuth.setState({
      me: {
        id: 1,
        username: 'demo',
        realNameVerified: true,
        realName: '林晚',
        idNumberTail: '123X',
      },
      status: 'ready',
    })
    renderSettingsFlow()

    expect(screen.getByText('已实名')).toBeInTheDocument()
    expect(screen.getByText('林晚')).toBeInTheDocument()
    expect(screen.getByText('尾号 123X')).toBeInTheDocument()
  })
})

describe('SettingsPage 修改密码校验与提交', () => {
  it('表单校验不通过时不发请求，且密码显隐开关可访问属性正确', () => {
    renderSettingsFlow()

    const currentInput = screen.getByLabelText('当前密码')
    const toggleCurrent = screen.getByRole('button', { name: '显示当前密码' })
    expect(currentInput).toHaveAttribute('type', 'password')
    expect(toggleCurrent).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggleCurrent)
    expect(currentInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: '隐藏当前密码' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))
    expect(screen.getByText('请输入当前密码')).toBeInTheDocument()
    expect(screen.getByText('请输入新密码')).toBeInTheDocument()
    expect(screen.getByText('请再次输入新密码')).toBeInTheDocument()

    fireEvent.change(currentInput, { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'different1' } })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))

    expect(screen.getByText('新密码不能与当前密码相同')).toBeInTheDocument()
    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(passwordRequests).toHaveLength(0)
  })

  it('当前密码错误回 400 INVALID_CURRENT_PASSWORD 时保留登录态与输入并提示错误', async () => {
    renderSettingsFlow()

    const currentInput = screen.getByLabelText('当前密码') as HTMLInputElement
    fireEvent.change(currentInput, { target: { value: 'wrongpass' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('当前密码不正确')
    expect(passwordRequests).toEqual(['PUT'])
    expect(useAuth.getState().me?.username).toBe('demo')
    expect(screen.getByTestId('probe').textContent).toBe('/settings')
    expect(currentInput.value).toBe('wrongpass')
  })

  it('修改密码 204 成功后清空登录态并跳往登录页，旧密码失效、新密码登录后回到设置页', async () => {
    renderSettingsFlow()

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))

    expect(await screen.findByRole('heading', { name: '登录账号' })).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fsettings')
    expect(useAuth.getState().me).toBeNull()
    expect(useAuth.getState().status).toBe('ready')
    expect(screen.getByRole('status')).toHaveTextContent('密码已修改，请用新密码重新登录')

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'demo' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('用户名或密码不对')
    expect(screen.getByTestId('probe').textContent).toBe('/login?next=%2Fsettings')

    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('heading', { name: '账号设置' })).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('/settings')
    expect(useAuth.getState().me?.username).toBe('demo')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
