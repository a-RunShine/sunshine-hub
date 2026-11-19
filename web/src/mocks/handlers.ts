import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'
import type { components } from '@/types/api'
import { DEFAULT_SCENARIO_ID, MOCK_SCENARIO_HEADER, scenarios } from './scenarios'
import type { MockScenario } from './scenarios'

/**
 * 开发期的假数据。响应结构严格照着 api/openapi.yaml，改契约时这里要跟着改。
 * 只覆盖骨架跑得起来的几条，业务页面实现时按需补。
 *
 * 购买人专属字段按登录态造：
 * - 已登录：给具体值，reserved 为 true/false，remainingCampaignLimit 为本场剩余件数；
 * - 匿名（未登录）：两者都为 null，与 false、0 等已知零值区分开。
 * remainingCampaignLimit 只出现在限时抢购（FLASH）形状上；普通售卖／折扣场形状只演示 discountPrice 与 reserved。
 * 冷却为商品级购买限制（按 productId、跨场生效）：FLASH 的 claim 与普通售卖／折扣场的 /orders 下单都会拦截；浏览与预约不拦。
 * 详情通过 cooldownUntil 下发冷却到期时刻（匿名返回 null）；该字段与本场额度 remainingCampaignLimit 作用域不同，互不替代。
 *
 * 场景选择是请求级的：从请求头 `X-Mock-Scenario` 读场景 id，缺失或空串回落到 `happy`；
 * 未知 id 显式返回 400 BAD_REQUEST，不静默回落到成功。场景表见 scenarios.ts。
 */

type ProductSummary = components['schemas']['ProductSummary']
type ProductDetail = components['schemas']['ProductDetail']
type Me = components['schemas']['Me']
type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']
type SimpleCampaignDetail = components['schemas']['SimpleCampaignDetail']
type Order = components['schemas']['Order']
type ClaimResult = components['schemas']['ClaimResult']

const now = () => new Date().toISOString()

const me: Me = { id: 1, username: 'demo', realNameVerified: false }

// 态一（限时抢购）：已登录，本场还有剩余额度（campaignLimit=2，已用 1 件，剩 1 件），已预约；不在冷却中
const flashCampaign: FlashCampaignDetail = {
  id: 1,
  name: '暗夜猎手 首发',
  type: 'FLASH',
  productId: 1,
  startAt: new Date(Date.now() + 3600_000).toISOString(),
  endAt: null,
  status: 'UPCOMING',
  serverTime: now(),
  allocation: { total: 5000, available: 4817, occupied: 183, pendingRepool: 0, sold: 0 },
  campaignLimit: 2,
  remainingCampaignLimit: 1,
  cooldownUntil: null,
  reserved: true,
}

// 态二（限时抢购）：已登录但本场额度用尽（remainingCampaignLimit=0，按钮禁用）；配额仍有剩余，与售罄区分；不在冷却中
const flashCampaignLimitReached: FlashCampaignDetail = {
  id: 3,
  name: '暗夜猎手 返场抢购',
  type: 'FLASH',
  productId: 1,
  startAt: new Date(Date.now() - 1800_000).toISOString(),
  endAt: null,
  status: 'ONGOING',
  serverTime: now(),
  allocation: { total: 2000, available: 300, occupied: 1700, pendingRepool: 0, sold: 0 },
  campaignLimit: 2,
  remainingCampaignLimit: 0,
  cooldownUntil: null,
  reserved: false,
}

// 态三（限时抢购）：匿名访问（未登录），购买人专属字段为 null，不与 false、0 混同
const flashAnonymousCampaign: FlashCampaignDetail = {
  id: 4,
  name: '暗夜猎手 加场',
  type: 'FLASH',
  productId: 1,
  startAt: new Date(Date.now() + 1800_000).toISOString(),
  endAt: null,
  status: 'UPCOMING',
  serverTime: now(),
  allocation: { total: 3000, available: 2960, occupied: 40, pendingRepool: 0, sold: 0 },
  campaignLimit: 2,
  remainingCampaignLimit: null,
  cooldownUntil: null,
  reserved: null,
}

// 普通售卖／折扣场：只演示 discountPrice 与 reserved；该形状不承载本场额度，不带 remainingCampaignLimit
const discountCampaign: SimpleCampaignDetail = {
  id: 2,
  name: '暗夜猎手 折扣返场',
  type: 'DISCOUNT',
  productId: 1,
  startAt: new Date(Date.now() - 3600_000).toISOString(),
  endAt: null,
  status: 'ONGOING',
  serverTime: now(),
  discountPrice: 9800,
  reserved: null,
}

const products: ProductSummary[] = [
  {
    id: 1,
    name: '暗夜猎手 限定皮肤',
    kind: 'VIRTUAL',
    coverUrl: '',
    minPrice: 12800,
    limited: true,
  },
  {
    id: 2,
    name: '破晓之环 典藏手办',
    kind: 'PHYSICAL',
    coverUrl: '',
    minPrice: 59900,
    limited: true,
  },
  {
    id: 3,
    name: '赛季队服',
    kind: 'PHYSICAL',
    coverUrl: '',
    minPrice: 19900,
    limited: false,
  },
]

// happy 场景抢购成功返回的结果，字段照 ClaimResult schema
const happyClaim: ClaimResult = {
  orderNo: 'SO' + Date.now(),
  collectibleNumber: '0427',
  payDeadline: new Date(Date.now() + 900_000).toISOString(),
  serverTime: now(),
}

// happy 场景直接下单成功返回的订单，字段照 Order schema
const happyOrder: Order = {
  orderNo: 'SO' + Date.now(),
  status: 'PENDING_PAYMENT',
  amount: 12800,
  freight: 0,
  payDeadline: new Date(Date.now() + 900_000).toISOString(),
  secondsLeft: 900,
  serverTime: now(),
  closeReason: null,
  createdAt: now(),
  items: [
    {
      productId: 1,
      productName: '暗夜猎手 限定皮肤',
      skuId: 10,
      skuName: '默认',
      kind: 'VIRTUAL',
      quantity: 1,
      unitPrice: 12800,
      collectibleNumber: '0427',
    },
  ],
}

/** 按请求头解析场景；找不到场景时返回 400 响应（unknown 分支由调用方判 Response）。 */
function resolveScenario(
  request: Request,
  registry: readonly MockScenario[],
): MockScenario | Response {
  const rawId = request.headers.get(MOCK_SCENARIO_HEADER)?.trim() ?? ''
  const scenarioId = rawId === '' ? DEFAULT_SCENARIO_ID : rawId
  const scenario = registry.find((item) => item.id === scenarioId)
  return scenario ?? jsonError(400, 'BAD_REQUEST', `未知的 mock 场景「${scenarioId}」`)
}

/** 契约 Error envelope：{ code, message }，status 由调用方按契约给定。 */
function jsonError(status: number, code: string, message: string): Response {
  return HttpResponse.json({ code, message }, { status })
}

export function createHandlers(registry: readonly MockScenario[] = scenarios): HttpHandler[] {
  return [
    http.get('/api/products', () =>
      HttpResponse.json({ items: products, page: 1, size: 20, total: products.length }),
    ),

    http.get('/api/products/:productId', ({ params }) => {
      const id = Number(params.productId)
      const product = products.find((p) => p.id === id)
      if (!product) {
        return HttpResponse.json(
          { code: 'PRODUCT_NOT_FOUND', message: '商品不存在' },
          { status: 404 },
        )
      }
      const detail: ProductDetail = {
        ...product,
        description: '假数据，仅用于前端开发',
        totalLimit: product.limited ? 5000 : null,
        purchaseLimit: product.kind === 'VIRTUAL' ? 1 : null,
        skus: [
          {
            id: id * 10,
            name: product.kind === 'VIRTUAL' ? '默认' : '黑色 L 码',
            attrs: product.kind === 'VIRTUAL' ? {} : { 颜色: '黑', 尺码: 'L' },
            price: product.minPrice,
            stock: 100,
          },
        ],
      }
      return HttpResponse.json(detail)
    }),

    http.get('/api/campaigns/upcoming', () =>
      HttpResponse.json({
        serverTime: now(),
        items: [
          {
            id: 1,
            name: '暗夜猎手 首发',
            type: 'FLASH',
            productId: 1,
            productName: '暗夜猎手 限定皮肤',
            startAt: new Date(Date.now() + 3600_000).toISOString(),
            coverUrl: '',
          },
        ],
      }),
    ),

    http.get('/api/campaigns/:campaignId', ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.campaignDetail) return HttpResponse.json(resolved.campaignDetail)

      const id = Number(params.campaignId)
      if (id === 3) return HttpResponse.json(flashCampaignLimitReached)
      if (id === 4) return HttpResponse.json(flashAnonymousCampaign)
      if (id === 2) return HttpResponse.json(discountCampaign)
      if (id === 1) return HttpResponse.json(flashCampaign)
      // 契约 404：场次不存在，code：CAMPAIGN_NOT_FOUND
      return jsonError(404, 'CAMPAIGN_NOT_FOUND', '场次不存在')
    }),

    http.post('/api/campaigns/:campaignId/claim', ({ request }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.claimFailure) {
        return jsonError(
          resolved.claimFailure.status,
          resolved.claimFailure.code,
          resolved.claimFailure.message,
        )
      }

      return HttpResponse.json(happyClaim, { status: 201 })
    }),

    http.post('/api/orders', ({ request }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.orderFailure) {
        return jsonError(
          resolved.orderFailure.status,
          resolved.orderFailure.code,
          resolved.orderFailure.message,
        )
      }

      return HttpResponse.json(happyOrder, { status: 201 })
    }),

    http.post('/api/auth/login', () => HttpResponse.json(me)),

    http.get('/api/me', () => HttpResponse.json(me)),
  ]
}

export const handlers = createHandlers()
