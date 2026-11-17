import { http, HttpResponse } from 'msw'
import type { components } from '@/types/api'

/**
 * 开发期的假数据。响应结构严格照着 api/openapi.yaml，改契约时这里要跟着改。
 * 只覆盖骨架跑得起来的几条，业务页面实现时按需补。
 *
 * 用户专属字段（reserved、remainingQuota）按登录态造：
 * - 已登录：给具体值，reserved 为 true/false，remainingQuota 为本场剩余件数；
 * - 匿名（未登录）：两者都为 null，与 false、0 等已知零值区分开。
 */

type ProductSummary = components['schemas']['ProductSummary']
type ProductDetail = components['schemas']['ProductDetail']
type Me = components['schemas']['Me']
type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']
type SimpleCampaignDetail = components['schemas']['SimpleCampaignDetail']

const now = () => new Date().toISOString()

const me: Me = { id: 1, username: 'demo', realNameVerified: false }

// 态一：已登录，本场还有剩余额度（campaignLimit=2，已用 1 件，剩 1 件），已预约
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
  remainingQuota: 1,
  reserved: true,
}

// 态二：已登录但本场额度用尽（remainingQuota=0，按钮禁用）；配额仍有剩余，与售罄区分
const flashQuotaExhausted: FlashCampaignDetail = {
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
  remainingQuota: 0,
  reserved: false,
}

// 态三：匿名访问（未登录），用户专属字段为 null，不与 false、0 混同
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
  remainingQuota: null,
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

export const handlers = [
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

  http.get('/api/campaigns/:campaignId', ({ params }) => {
    const id = Number(params.campaignId)
    if (id === 3) return HttpResponse.json(flashQuotaExhausted)
    return HttpResponse.json(id === 2 ? discountCampaign : flashCampaign)
  }),

  http.post('/api/campaigns/:campaignId/claim', () =>
    HttpResponse.json(
      {
        orderNo: 'SO' + Date.now(),
        collectibleNumber: '0427',
        payDeadline: new Date(Date.now() + 900_000).toISOString(),
        serverTime: now(),
      },
      { status: 201 },
    ),
  ),

  http.post('/api/auth/login', () => HttpResponse.json(me)),

  http.get('/api/me', () => HttpResponse.json(me)),
]
