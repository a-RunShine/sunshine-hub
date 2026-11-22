import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { createHandlers } from '@/mocks/handlers'
import HomePage from './HomePage'

const server = setupServer(...createHandlers())

const productUrls: string[] = []
const upcomingUrls: string[] = []

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/products') productUrls.push(url.search)
    if (url.pathname === '/api/campaigns/upcoming') upcomingUrls.push(request.method)
  })
})

beforeEach(() => {
  server.resetHandlers(...createHandlers())
  productUrls.length = 0
  upcomingUrls.length = 0
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

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProbeLocation />} />
        <Route path="/products/:productId" element={<ProbeLocation />} />
        <Route path="/campaigns/:campaignId" element={<ProbeLocation />} />
      </Routes>
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
  it('首屏抢购海报、中文倒计时与第二屏 5 件手风琴展柜来自接口响应', async () => {
    renderHome()

    await screen.findByRole('heading', { name: '幽影长弓 磁轨狙击' })

    expect(screen.getByRole('heading', { name: '暗夜猎手 首发' })).toBeInTheDocument()
    const timer = screen.getByRole('timer', { name: '距离开售倒计时' })
    expect(within(timer).getByText('时')).toBeInTheDocument()
    expect(within(timer).getByText('分')).toBeInTheDocument()
    expect(within(timer).getByText('秒')).toBeInTheDocument()
    expect(screen.queryByText('HOURS')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /查看场次/ })).toHaveAttribute('href', '/campaigns/1')
    expect(screen.getByText(/开售/)).toBeInTheDocument()

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

    fireEvent.click(slice2)
    expect(slice2).toHaveAttribute('aria-expanded', 'true')
    expect(slice1).toHaveAttribute('aria-expanded', 'false')

    fireEvent.keyDown(slice2, { key: 'ArrowRight' })
    const slice3 = screen.getByRole('heading', { name: '暗夜猎手 限定皮肤' }).closest('article')!
    expect(slice3).toHaveAttribute('aria-expanded', 'true')

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
