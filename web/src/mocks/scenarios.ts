import type { components } from '@/types/api'

export type CampaignDetailOverride = components['schemas']['FlashCampaignDetail']

export interface MockFailure {
  readonly status: number
  readonly code: string
  readonly message: string
}

export interface MockScenario {
  readonly id: string
  readonly description: string
  readonly campaignDetail?: CampaignDetailOverride
  readonly claimFailure?: MockFailure
  readonly orderFailure?: MockFailure
  readonly categoryFailure?: MockFailure
  readonly addressCreateFailure?: MockFailure
  readonly addressUpdateFailure?: MockFailure
  readonly addressDeleteFailure?: MockFailure
  readonly addressDefaultFailure?: MockFailure
  readonly signFailure?: MockFailure
  readonly registerFailure?: MockFailure
  readonly loginFailure?: MockFailure
  readonly logoutFailure?: MockFailure
  readonly passwordFailure?: MockFailure
}

export const DEFAULT_SCENARIO_ID = 'happy'

export const MOCK_SCENARIO_HEADER = 'X-Mock-Scenario'

type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']

const now = () => new Date().toISOString()

const purchaseCooldownFailure: MockFailure = {
  status: 409,
  code: 'PURCHASE_COOLDOWN',
  message: '这件商品处于购买冷却期，到期后自动恢复可购',
}

const unauthorizedFailure: MockFailure = {
  status: 401,
  code: 'UNAUTHORIZED',
  message: '请先登录',
}

const forbiddenFailure: MockFailure = {
  status: 403,
  code: 'FORBIDDEN',
  message: '没有权限',
}

const categoryNotFoundFailure: MockFailure = {
  status: 404,
  code: 'CATEGORY_NOT_FOUND',
  message: '分类不存在',
}

const categoryInUseFailure: MockFailure = {
  status: 409,
  code: 'CATEGORY_IN_USE',
  message: '分类下还有商品，先迁移商品再删除',
}

const addressNotFoundFailure: MockFailure = {
  status: 404,
  code: 'ADDRESS_NOT_FOUND',
  message: '地址不存在，或不属于当前账号',
}

const addressLimitExceededFailure: MockFailure = {
  status: 400,
  code: 'ADDRESS_LIMIT_EXCEEDED',
  message: '最多保存 10 条收货地址',
}

const addressInUseFailure: MockFailure = {
  status: 409,
  code: 'ADDRESS_IN_USE',
  message: '这个地址还被未支付订单使用，先取消订单或换地址',
}

const fulfillmentNotFoundFailure: MockFailure = {
  status: 404,
  code: 'FULFILLMENT_NOT_FOUND',
  message: '履约单不存在，或不属于当前账号',
}

const fulfillmentNotSignableFailure: MockFailure = {
  status: 409,
  code: 'FULFILLMENT_NOT_SIGNABLE',
  message: '这个履约单现在不能签收',
}

const badRequestFailure: MockFailure = {
  status: 400,
  code: 'BAD_REQUEST',
  message: '参数不合法',
}

function makeAllocation(total: number, available: number, sold = 0): FlashCampaignDetail['allocation'] {
  return { total, available, occupied: total - available - sold, pendingRepool: 0, sold }
}

const product1CooldownUntil = new Date(Date.now() + 3 * 24 * 3600_000).toISOString()

function flashDetail(overrides: {
  id: number
  name: string
  status: FlashCampaignDetail['status']
  startAt: string
  endAt: string | null
  allocation: FlashCampaignDetail['allocation']
  campaignLimit: number
  remainingCampaignLimit: number | null
  cooldownUntil: string | null
  reserved: boolean | null
}): FlashCampaignDetail {
  return {
    type: 'FLASH',
    productId: 1,
    serverTime: now(),
    ...overrides,
  }
}

const detailUpcoming: FlashCampaignDetail = flashDetail({
  id: 101,
  name: '暗夜猎手 首发（未开售）',
  status: 'UPCOMING',
  startAt: new Date(Date.now() + 3600_000).toISOString(),
  endAt: null,
  allocation: makeAllocation(5000, 4817),
  campaignLimit: 2,
  remainingCampaignLimit: 1,
  cooldownUntil: null,
  reserved: true,
})

const detailEnded: FlashCampaignDetail = flashDetail({
  id: 102,
  name: '暗夜猎手 收官场（已结束）',
  status: 'ENDED',
  startAt: new Date(Date.now() - 7200_000).toISOString(),
  endAt: new Date(Date.now() - 1800_000).toISOString(),
  allocation: makeAllocation(3000, 0, 3000),
  campaignLimit: 2,
  remainingCampaignLimit: 0,
  cooldownUntil: null,
  reserved: false,
})

const detailSoldOut: FlashCampaignDetail = flashDetail({
  id: 103,
  name: '暗夜猎手 加场（售罄）',
  status: 'ONGOING',
  startAt: new Date(Date.now() - 1800_000).toISOString(),
  endAt: null,
  allocation: makeAllocation(2000, 0, 2000),
  campaignLimit: 2,
  remainingCampaignLimit: 1,
  cooldownUntil: null,
  reserved: false,
})

const detailLimitReached: FlashCampaignDetail = flashDetail({
  id: 104,
  name: '暗夜猎手 返场（额度用尽）',
  status: 'ONGOING',
  startAt: new Date(Date.now() - 1800_000).toISOString(),
  endAt: null,
  allocation: makeAllocation(2000, 300),
  campaignLimit: 2,
  remainingCampaignLimit: 0,
  cooldownUntil: null,
  reserved: false,
})

const detailCooldownClaim: FlashCampaignDetail = flashDetail({
  id: 105,
  name: '暗夜猎手 加场（冷却中）',
  status: 'ONGOING',
  startAt: new Date(Date.now() - 1800_000).toISOString(),
  endAt: null,
  allocation: makeAllocation(2000, 1200),
  campaignLimit: 2,
  remainingCampaignLimit: 1,
  cooldownUntil: product1CooldownUntil,
  reserved: false,
})

const detailCooldownDemo: FlashCampaignDetail = flashDetail({
  id: 106,
  name: '暗夜猎手 返场（冷却演示）',
  status: 'ONGOING',
  startAt: new Date(Date.now() - 1800_000).toISOString(),
  endAt: null,
  allocation: makeAllocation(2000, 1200),
  campaignLimit: 2,
  remainingCampaignLimit: 1,
  cooldownUntil: product1CooldownUntil,
  reserved: false,
})

export const scenarios: readonly MockScenario[] = [
  {
    id: DEFAULT_SCENARIO_ID,
    description: '默认场景：不覆盖任何响应，所有行为与现状逐字节等价',
  },

  {
    id: 'detail-upcoming',
    description: '未开售：UPCOMING，startAt 在未来',
    campaignDetail: detailUpcoming,
  },
  {
    id: 'detail-ended',
    description: '已结束：ENDED，startAt / endAt 均在过去',
    campaignDetail: detailEnded,
  },
  {
    id: 'detail-sold-out',
    description: '售罄：ONGOING，allocation.available 为 0',
    campaignDetail: detailSoldOut,
  },
  {
    id: 'detail-limit-reached',
    description: '本场额度用尽：ONGOING，配额有余量，remainingCampaignLimit 为 0；此时抢购回 409 ALREADY_PURCHASED',
    campaignDetail: detailLimitReached,
    claimFailure: { status: 409, code: 'ALREADY_PURCHASED', message: '这件商品你已经买过了' },
  },
  {
    id: 'detail-cooldown',
    description: '详情处于冷却：ONGOING，cooldownUntil 为未来时刻；只改详情、不改抢购结果，claim 仍回 201 成功（演示详情态与点击结果分离）',
    campaignDetail: detailCooldownDemo,
  },

  {
    id: 'claim-already-purchased',
    description: '已购买过这件商品（已购分支）',
    claimFailure: { status: 409, code: 'ALREADY_PURCHASED', message: '这件商品你已经买过了' },
  },
  {
    id: 'claim-not-started',
    description: '场次未开售',
    claimFailure: { status: 409, code: 'CAMPAIGN_NOT_STARTED', message: '还没到开售时间' },
  },
  {
    id: 'claim-ended',
    description: '场次已结束',
    claimFailure: { status: 409, code: 'CAMPAIGN_ENDED', message: '本场已经结束' },
  },
  {
    id: 'claim-cooldown',
    description: '本商品处于购买冷却期（商品级、跨场）；详情与抢购结果一致，cooldownUntil 已下发为未来时刻',
    campaignDetail: detailCooldownClaim,
    claimFailure: purchaseCooldownFailure,
  },
  {
    id: 'claim-sold-out',
    description: '已售罄',
    claimFailure: { status: 410, code: 'SOLD_OUT', message: '已经抢完了' },
  },
  {
    id: 'claim-real-name-required',
    description: '未实名，需要先完成实名认证',
    claimFailure: { status: 403, code: 'REAL_NAME_REQUIRED', message: '请先完成实名认证' },
  },
  {
    id: 'claim-unauthorized',
    description: '未登录或会话已过期',
    claimFailure: unauthorizedFailure,
  },
  {
    id: 'claim-rate-limited',
    description: '触发限流',
    claimFailure: { status: 429, code: 'RATE_LIMITED', message: '操作太快了，歇一下再试' },
  },
  {
    id: 'claim-unit-pool-inconsistent',
    description: '编号池与配额不同步',
    claimFailure: { status: 500, code: 'UNIT_POOL_INCONSISTENT', message: '编号池与配额不同步' },
  },
  {
    id: 'claim-internal-error',
    description: '服务内部错误',
    claimFailure: { status: 500, code: 'INTERNAL_ERROR', message: '服务出了点问题' },
  },

  {
    id: 'order-bad-request',
    description: '下单参数不合法',
    orderFailure: { status: 400, code: 'BAD_REQUEST', message: '参数不合法' },
  },
  {
    id: 'order-address-required',
    description: '含实体商品但未选择收货地址',
    orderFailure: {
      status: 400,
      code: 'ADDRESS_REQUIRED',
      message: '包含实体商品时必须选择收货地址',
    },
  },
  {
    id: 'order-unauthorized',
    description: '未登录或会话已过期',
    orderFailure: unauthorizedFailure,
  },
  {
    id: 'order-stock-insufficient',
    description: '库存不足',
    orderFailure: { status: 409, code: 'STOCK_INSUFFICIENT', message: '库存不足' },
  },
  {
    id: 'order-cooldown',
    description: '本商品处于购买冷却期（商品级、跨场）',
    orderFailure: purchaseCooldownFailure,
  },

  {
    id: 'category-forbidden',
    description: '管理端未授权：分类新增、更新、删除均回 403',
    categoryFailure: forbiddenFailure,
  },
  {
    id: 'category-in-use',
    description: '分类下还有商品，删除被拒绝；先迁移商品再删除',
    categoryFailure: categoryInUseFailure,
  },
  {
    id: 'category-not-found',
    description: '分类不存在：更新、删除回 404',
    categoryFailure: categoryNotFoundFailure,
  },

  {
    id: 'address-not-found',
    description: '地址不存在：编辑、删除、设默认均回 404 ADDRESS_NOT_FOUND',
    addressUpdateFailure: addressNotFoundFailure,
    addressDeleteFailure: addressNotFoundFailure,
    addressDefaultFailure: addressNotFoundFailure,
  },
  {
    id: 'address-limit-exceeded',
    description: '地址已满 10 条，新增被拒：400 ADDRESS_LIMIT_EXCEEDED',
    addressCreateFailure: addressLimitExceededFailure,
  },
  {
    id: 'address-in-use',
    description: '地址还被未支付订单使用，删除被拒绝：409 ADDRESS_IN_USE',
    addressDeleteFailure: addressInUseFailure,
  },
  {
    id: 'address-bad-request',
    description: '地址参数不合法：新增、编辑均回 400 BAD_REQUEST',
    addressCreateFailure: badRequestFailure,
    addressUpdateFailure: badRequestFailure,
  },
  {
    id: 'address-unauthorized',
    description: '未登录或会话已过期：地址新增、编辑、删除、设默认均回 401',
    addressCreateFailure: unauthorizedFailure,
    addressUpdateFailure: unauthorizedFailure,
    addressDeleteFailure: unauthorizedFailure,
    addressDefaultFailure: unauthorizedFailure,
  },

  {
    id: 'fulfillment-not-found',
    description: '履约单不存在：签收回 404 FULFILLMENT_NOT_FOUND',
    signFailure: fulfillmentNotFoundFailure,
  },
  {
    id: 'fulfillment-not-signable',
    description: '虚拟、未发货或已完成的履约单不能签收：409 FULFILLMENT_NOT_SIGNABLE',
    signFailure: fulfillmentNotSignableFailure,
  },
  {
    id: 'fulfillment-unauthorized',
    description: '未登录或会话已过期：签收回 401',
    signFailure: unauthorizedFailure,
  },

  {
    id: 'register-username-taken',
    description: '注册用户名已被占用：409 USERNAME_TAKEN',
    registerFailure: {
      status: 409,
      code: 'USERNAME_TAKEN',
      message: '这个用户名已经被占用',
    },
  },
  {
    id: 'login-bad-credentials',
    description: '登录凭据错误：401 BAD_CREDENTIALS',
    loginFailure: {
      status: 401,
      code: 'BAD_CREDENTIALS',
      message: '用户名或密码不对',
    },
  },
  {
    id: 'logout-unauthorized',
    description: '登出未登录或会话已过期：401 UNAUTHORIZED',
    logoutFailure: unauthorizedFailure,
  },
  {
    id: 'password-invalid-current',
    description: '修改密码当前密码不正确：400 INVALID_CURRENT_PASSWORD',
    passwordFailure: {
      status: 400,
      code: 'INVALID_CURRENT_PASSWORD',
      message: '当前密码不正确',
    },
  },
  {
    id: 'password-bad-request',
    description: '修改密码参数不合法：400 BAD_REQUEST',
    passwordFailure: badRequestFailure,
  },
  {
    id: 'password-unauthorized',
    description: '修改密码未登录或会话已过期：401 UNAUTHORIZED',
    passwordFailure: unauthorizedFailure,
  },
]
