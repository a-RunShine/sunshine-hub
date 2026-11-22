import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'
import type { components } from '@/types/api'
import { DEFAULT_SCENARIO_ID, MOCK_SCENARIO_HEADER, scenarios } from './scenarios'
import type { MockScenario } from './scenarios'

type ProductSummary = components['schemas']['ProductSummary']
type ProductDetail = components['schemas']['ProductDetail']
type Category = components['schemas']['Category']
type CategoryInput = components['schemas']['CategoryInput']
type Me = components['schemas']['Me']
type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']
type SimpleCampaignDetail = components['schemas']['SimpleCampaignDetail']
type Order = components['schemas']['Order']
type OrderStatus = components['schemas']['OrderStatus']
type ClaimResult = components['schemas']['ClaimResult']
type Address = components['schemas']['Address']
type AddressInput = components['schemas']['AddressInput']
type Fulfillment = components['schemas']['Fulfillment']

interface SeedAddress extends Address {
  createdAt: number
}

interface SeedOrder {
  orderNo: string
  status: OrderStatus
  addressId: number
}

export interface HandlerSeed {
  addresses?: Address[]
}

const now = () => new Date().toISOString()

const me: Me = { id: 1, username: 'demo', realNameVerified: false }

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
    id: 4,
    name: '幽影长弓 磁轨狙击',
    kind: 'VIRTUAL',
    categoryId: 1,
    coverUrl: '/assets/weapon-sniper.png',
    minPrice: 16800,
    limited: true,
  },
  {
    id: 5,
    name: '疾风原型 战术冲锋枪',
    kind: 'VIRTUAL',
    categoryId: 1,
    coverUrl: '/assets/weapon-smg.png',
    minPrice: 8800,
    limited: false,
  },
  {
    id: 1,
    name: '暗夜猎手 限定皮肤',
    kind: 'VIRTUAL',
    categoryId: 1,
    coverUrl: '/assets/rifle-trim.png',
    minPrice: 12800,
    limited: true,
  },
  {
    id: 2,
    name: '破晓之环 典藏手办',
    kind: 'PHYSICAL',
    categoryId: 4,
    coverUrl: '/assets/product-figurine.png',
    minPrice: 59900,
    limited: true,
  },
  {
    id: 3,
    name: '赛季队服',
    kind: 'PHYSICAL',
    categoryId: 5,
    coverUrl: '/assets/product-jersey.png',
    minPrice: 19900,
    limited: false,
  },
]

const initialCategories: Category[] = [
  { id: 1, name: '武器皮肤', sortOrder: 1 },
  { id: 2, name: '角色皮肤', sortOrder: 2 },
  { id: 3, name: '徽章', sortOrder: 3 },
  { id: 4, name: '手办', sortOrder: 4 },
  { id: 5, name: '服饰', sortOrder: 5 },
]

const initialAddresses: SeedAddress[] = [
  { id: 1, receiver: '林晚', phone: '13800000001', province: '四川省', city: '成都市', district: '武侯区', detail: '天府三街 1 号', isDefault: true, createdAt: 1 },
  { id: 2, receiver: '林晚', phone: '13800000002', province: '四川省', city: '成都市', district: '锦江区', detail: '春熙路 2 号', isDefault: false, createdAt: 2 },
  { id: 3, receiver: '周野', phone: '13800000003', province: '广东省', city: '深圳市', district: '南山区', detail: '科技园 3 号', isDefault: false, createdAt: 3 },
]

const initialFulfillments: Fulfillment[] = [
  {
    id: 1,
    orderNo: 'SO-SEED-1',
    kind: 'PHYSICAL',
    status: 'SHIPPED',
    trackingNo: 'SF1000000001',
    shippedAt: new Date(Date.now() - 86_400_000).toISOString(),
    signedAt: null,
    address: {
      id: 1,
      receiver: '林晚',
      phone: '13800000001',
      province: '四川省',
      city: '成都市',
      district: '武侯区',
      detail: '天府三街 1 号',
      isDefault: true,
    },
    items: [
      {
        productId: 2,
        productName: '破晓之环 典藏手办',
        skuId: 20,
        skuName: '黑色 L 码',
        kind: 'PHYSICAL',
        quantity: 1,
        unitPrice: 59900,
        collectibleNumber: '0427',
      },
    ],
  },
  {
    id: 2,
    orderNo: 'SO-SEED-2',
    kind: 'VIRTUAL',
    status: 'COMPLETED',
    trackingNo: null,
    shippedAt: null,
    signedAt: null,
    items: [
      {
        productId: 1,
        productName: '暗夜猎手 限定皮肤',
        skuId: 10,
        skuName: '默认',
        kind: 'VIRTUAL',
        quantity: 1,
        unitPrice: 12800,
        collectibleNumber: null,
      },
    ],
  },
  {
    id: 3,
    orderNo: 'SO-SEED-3',
    kind: 'PHYSICAL',
    status: 'PENDING',
    trackingNo: null,
    shippedAt: null,
    signedAt: null,
    address: {
      id: 3,
      receiver: '周野',
      phone: '13800000003',
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      detail: '科技园 3 号',
      isDefault: false,
    },
    items: [
      {
        productId: 3,
        productName: '赛季队服',
        skuId: 30,
        skuName: '黑色 M 码',
        kind: 'PHYSICAL',
        quantity: 1,
        unitPrice: 19900,
        collectibleNumber: null,
      },
    ],
  },
  {
    id: 4,
    orderNo: 'SO-SEED-4',
    kind: 'PHYSICAL',
    status: 'COMPLETED',
    trackingNo: null,
    shippedAt: null,
    signedAt: null,
    address: {
      id: 2,
      receiver: '林晚',
      phone: '13800000002',
      province: '四川省',
      city: '成都市',
      district: '锦江区',
      detail: '春熙路 2 号',
      isDefault: false,
    },
    items: [
      {
        productId: 3,
        productName: '赛季队服',
        skuId: 30,
        skuName: '黑色 M 码',
        kind: 'PHYSICAL',
        quantity: 1,
        unitPrice: 19900,
        collectibleNumber: null,
      },
    ],
  },
]

const happyClaim: ClaimResult = {
  orderNo: 'SO' + Date.now(),
  collectibleNumber: '0427',
  payDeadline: new Date(Date.now() + 900_000).toISOString(),
  serverTime: now(),
}

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

function resolveScenario(
  request: Request,
  registry: readonly MockScenario[],
): MockScenario | Response {
  const rawId = request.headers.get(MOCK_SCENARIO_HEADER)?.trim() ?? ''
  const scenarioId = rawId === '' ? DEFAULT_SCENARIO_ID : rawId
  const scenario = registry.find((item) => item.id === scenarioId)
  return scenario ?? jsonError(400, 'BAD_REQUEST', `未知的 mock 场景「${scenarioId}」`)
}

function jsonError(status: number, code: string, message: string): Response {
  return HttpResponse.json({ code, message }, { status })
}

export function createHandlers(
  registry: readonly MockScenario[] = scenarios,
  seed?: HandlerSeed,
): HttpHandler[] {
  const reservedByCampaign = new Map<number, boolean>()
  let realNameProfile: Me | null = null
  const categories = new Map<number, Category>(initialCategories.map((c) => [c.id, c]))
  let nextCategoryId = initialCategories.length + 1
  const seedAddresses: SeedAddress[] = (seed?.addresses ?? initialAddresses).map((address, index) => ({
    ...address,
    createdAt: index + 1,
  }))
  const addresses = new Map<number, SeedAddress>(seedAddresses.map((a) => [a.id, a]))
  let nextAddressId = addresses.size === 0 ? 1 : Math.max(...addresses.keys()) + 1
  const fulfillments = new Map<number, Fulfillment>(
    initialFulfillments.map((f) => [f.id, f]),
  )
  const orders = new Map<string, SeedOrder>([
    ['SO-UNPAID-1', { orderNo: 'SO-UNPAID-1', status: 'PENDING_PAYMENT', addressId: 3 }],
  ])

  const toAddress = (address: SeedAddress): Address => ({
    id: address.id,
    receiver: address.receiver,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    isDefault: address.isDefault,
  })

  const detailWithReserved = (
    base: FlashCampaignDetail | SimpleCampaignDetail,
    campaignId: number,
  ) => {
    const reserved = reservedByCampaign.get(campaignId)
    const body = reserved === undefined ? base : { ...base, reserved }
    return HttpResponse.json(body)
  }

  return [
    http.get('/api/products', ({ request }) => {
      const url = new URL(request.url, 'http://localhost:3000')
      const kind = url.searchParams.get('kind')
      const categoryId = url.searchParams.get('categoryId')
      const pageRaw = Number(url.searchParams.get('page') ?? '1')
      const sizeRaw = Number(url.searchParams.get('size') ?? '20')
      const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
      const size = Number.isInteger(sizeRaw) && sizeRaw >= 1 ? sizeRaw : 20
      let filtered = products
      if (kind !== null) filtered = filtered.filter((p) => p.kind === kind)
      if (categoryId !== null) {
        filtered = filtered.filter((p) => p.categoryId === Number(categoryId))
      }
      const start = (page - 1) * size
      const items = filtered.slice(start, start + size)
      return HttpResponse.json({ items, page, size, total: filtered.length })
    }),

    http.get('/api/categories', () => {
      const sorted = [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder)
      return HttpResponse.json(sorted)
    }),

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

    http.post('/api/admin/categories', async ({ request }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.categoryFailure) {
        return jsonError(
          resolved.categoryFailure.status,
          resolved.categoryFailure.code,
          resolved.categoryFailure.message,
        )
      }
      const body = (await request.json()) as CategoryInput
      const created: Category = { id: nextCategoryId++, name: body.name, sortOrder: body.sortOrder }
      categories.set(created.id, created)
      return HttpResponse.json(created, { status: 201 })
    }),

    http.put('/api/admin/categories/:categoryId', async ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.categoryFailure) {
        return jsonError(
          resolved.categoryFailure.status,
          resolved.categoryFailure.code,
          resolved.categoryFailure.message,
        )
      }
      const id = Number(params.categoryId)
      const existing = categories.get(id)
      if (!existing) {
        return jsonError(404, 'CATEGORY_NOT_FOUND', '分类不存在')
      }
      const body = (await request.json()) as CategoryInput
      const updated: Category = { ...existing, name: body.name, sortOrder: body.sortOrder }
      categories.set(id, updated)
      return HttpResponse.json(updated, { status: 200 })
    }),

    http.delete('/api/admin/categories/:categoryId', ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.categoryFailure) {
        return jsonError(
          resolved.categoryFailure.status,
          resolved.categoryFailure.code,
          resolved.categoryFailure.message,
        )
      }
      const id = Number(params.categoryId)
      if (!categories.has(id)) {
        return jsonError(404, 'CATEGORY_NOT_FOUND', '分类不存在')
      }
      const referenced = products.some((p) => p.categoryId === id)
      if (referenced) {
        return jsonError(409, 'CATEGORY_IN_USE', '分类下还有商品，先迁移商品再删除')
      }
      categories.delete(id)
      return new HttpResponse(null, { status: 204 })
    }),

    http.get('/api/addresses', () => {
      const items = [...addresses.values()].sort((a, b) => a.createdAt - b.createdAt)
      return HttpResponse.json({ items: items.map(toAddress) })
    }),

    http.post('/api/addresses', async ({ request }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.addressCreateFailure) {
        return jsonError(
          resolved.addressCreateFailure.status,
          resolved.addressCreateFailure.code,
          resolved.addressCreateFailure.message,
        )
      }
      const body = (await request.json()) as AddressInput
      if (addresses.size >= 10) {
        return jsonError(400, 'ADDRESS_LIMIT_EXCEEDED', '最多保存 10 条收货地址')
      }
      const id = nextAddressId++
      const created: SeedAddress = {
        ...body,
        id,
        isDefault: addresses.size === 0,
        createdAt: Date.now(),
      }
      addresses.set(id, created)
      return HttpResponse.json(toAddress(created), { status: 201 })
    }),

    http.put('/api/addresses/:addressId', async ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.addressUpdateFailure) {
        return jsonError(
          resolved.addressUpdateFailure.status,
          resolved.addressUpdateFailure.code,
          resolved.addressUpdateFailure.message,
        )
      }
      const id = Number(params.addressId)
      const existing = addresses.get(id)
      if (!existing) {
        return jsonError(404, 'ADDRESS_NOT_FOUND', '地址不存在，或不属于当前账号')
      }
      const body = (await request.json()) as AddressInput
      const updated: SeedAddress = {
        ...existing,
        receiver: body.receiver,
        phone: body.phone,
        province: body.province,
        city: body.city,
        district: body.district,
        detail: body.detail,
      }
      addresses.set(id, updated)
      return HttpResponse.json(toAddress(updated), { status: 200 })
    }),

    http.delete('/api/addresses/:addressId', ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.addressDeleteFailure) {
        return jsonError(
          resolved.addressDeleteFailure.status,
          resolved.addressDeleteFailure.code,
          resolved.addressDeleteFailure.message,
        )
      }
      const id = Number(params.addressId)
      const existing = addresses.get(id)
      if (!existing) {
        return jsonError(404, 'ADDRESS_NOT_FOUND', '地址不存在，或不属于当前账号')
      }
      const referencedByPendingOrder = [...orders.values()].some(
        (order) => order.addressId === id && order.status === 'PENDING_PAYMENT',
      )
      if (referencedByPendingOrder) {
        return jsonError(409, 'ADDRESS_IN_USE', '这个地址还被未支付订单使用，先取消订单或换地址')
      }
      const wasDefault = existing.isDefault
      addresses.delete(id)
      if (wasDefault && addresses.size > 0) {
        const earliest = [...addresses.values()].sort((a, b) => a.createdAt - b.createdAt)[0]
        earliest.isDefault = true
      }
      return new HttpResponse(null, { status: 204 })
    }),

    http.put('/api/addresses/:addressId/default', ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.addressDefaultFailure) {
        return jsonError(
          resolved.addressDefaultFailure.status,
          resolved.addressDefaultFailure.code,
          resolved.addressDefaultFailure.message,
        )
      }
      const id = Number(params.addressId)
      const existing = addresses.get(id)
      if (!existing) {
        return jsonError(404, 'ADDRESS_NOT_FOUND', '地址不存在，或不属于当前账号')
      }
      for (const item of addresses.values()) {
        item.isDefault = item.id === id
      }
      return HttpResponse.json(toAddress(existing), { status: 200 })
    }),

    http.get('/api/fulfillments', ({ request }) => {
      const url = new URL(request.url, 'http://localhost:3000')
      const status = url.searchParams.get('status')
      let items = [...fulfillments.values()]
      if (status !== null) items = items.filter((f) => f.status === status)
      return HttpResponse.json({ items })
    }),

    http.post('/api/fulfillments/:fulfillmentId/sign', ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      if (resolved.signFailure) {
        return jsonError(
          resolved.signFailure.status,
          resolved.signFailure.code,
          resolved.signFailure.message,
        )
      }
      const id = Number(params.fulfillmentId)
      const fulfillment = fulfillments.get(id)
      if (!fulfillment) {
        return jsonError(404, 'FULFILLMENT_NOT_FOUND', '履约单不存在，或不属于当前账号')
      }
      const signable = fulfillment.kind === 'PHYSICAL' &&
        (fulfillment.status === 'SHIPPED' || fulfillment.status === 'SIGNED')
      if (!signable) {
        return jsonError(409, 'FULFILLMENT_NOT_SIGNABLE', '这个履约单现在不能签收')
      }
      if (fulfillment.status !== 'SIGNED') {
        fulfillment.status = 'SIGNED'
        fulfillment.signedAt = now()
        fulfillments.set(id, fulfillment)
      }
      return HttpResponse.json(fulfillment, { status: 200 })
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
            coverUrl: '/assets/rifle-trim.png',
          },
        ],
      }),
    ),

    http.get('/api/campaigns/:campaignId', ({ request, params }) => {
      const resolved = resolveScenario(request, registry)
      if (resolved instanceof Response) return resolved
      const id = Number(params.campaignId)
      if (resolved.campaignDetail) return detailWithReserved(resolved.campaignDetail, id)

      if (id === 3) return detailWithReserved(flashCampaignLimitReached, id)
      if (id === 4) return detailWithReserved(flashAnonymousCampaign, id)
      if (id === 2) return detailWithReserved(discountCampaign, id)
      if (id === 1) return detailWithReserved(flashCampaign, id)
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

    http.post('/api/campaigns/:campaignId/reserve', ({ params }) => {
      reservedByCampaign.set(Number(params.campaignId), true)
      return new HttpResponse(null, { status: 204 })
    }),

    http.delete('/api/campaigns/:campaignId/reserve', ({ params }) => {
      reservedByCampaign.set(Number(params.campaignId), false)
      return new HttpResponse(null, { status: 204 })
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

    http.post('/api/orders/:orderNo/pay', ({ params }) => {
      const order = orders.get(String(params.orderNo))
      if (!order) {
        return jsonError(404, 'ORDER_NOT_FOUND', '订单不存在')
      }
      order.status = 'PAID'
      return HttpResponse.json(
        {
          tradeNo: `T${order.orderNo}`,
          amount: 19900,
          payUrl: `/payment/pay?tradeNo=T${order.orderNo}`,
        },
        { status: 200 },
      )
    }),

    http.post('/api/auth/login', () => HttpResponse.json(me)),

    http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

    http.put('/api/me/real-name', async ({ request }) => {
      const body = (await request.json()) as Partial<{ realName: string; idNumber: string }>
      const realName = typeof body?.realName === 'string' ? body.realName.trim() : ''
      const idNumber = typeof body?.idNumber === 'string' ? body.idNumber.trim() : ''
      if (realName === '' || idNumber === '') {
        return jsonError(400, 'BAD_REQUEST', '姓名与证件号不能为空')
      }
      realNameProfile = {
        ...me,
        realNameVerified: true,
        realName,
        idNumberTail: idNumber.slice(-4),
      }
      return HttpResponse.json(realNameProfile, { status: 200 })
    }),

    http.get('/api/me', () => HttpResponse.json(realNameProfile ?? me)),
  ]
}

export const handlers = createHandlers()
