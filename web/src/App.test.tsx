import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHandlers } from '@/mocks/handlers'

const server = setupServer(...createHandlers(undefined, { initialUsername: null }))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  window.history.pushState({}, '', '/')
})

afterAll(() => server.close())

describe('App 冷启动会话恢复', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('在 /login 恢复会话返回 401 前（含未初始化首帧与加载中）不闪现登录表单，恢复完成后才展示', async () => {
    window.history.pushState({}, '', '/login')
    const { useAuth } = await import('@/stores/auth')
    const { default: App } = await import('./App')
    useAuth.setState({ me: null, status: 'uninitialized' })

    const preEffectHtml = renderToStaticMarkup(<App />)
    expect(preEffectHtml).toBe('<div class="min-h-screen bg-ink-950"></div>')

    const resolveMeRef: { current: ((response: Response) => void) | null } = { current: null }
    const mePending = new Promise<Response>((resolve) => {
      resolveMeRef.current = resolve
    })
    server.use(http.get('/api/me', () => mePending))

    render(<App />)

    expect(screen.queryByRole('heading', { name: '登录账号' })).not.toBeInTheDocument()
    expect(await screen.findByText('正在加载…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '登录账号' })).not.toBeInTheDocument()

    resolveMeRef.current?.(
      HttpResponse.json({ code: 'UNAUTHORIZED', message: '请先登录' }, { status: 401 }),
    )
    expect(await screen.findByRole('heading', { name: '登录账号' })).toBeInTheDocument()
  })
})
