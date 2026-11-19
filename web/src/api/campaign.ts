import { client } from './client'
import type { components } from '@/types/api'

export type CampaignDetail = components['schemas']['CampaignDetail']
export type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']
export type ClaimResult = components['schemas']['ClaimResult']

/**
 * 拉场次详情。GET /campaigns/:campaignId 不要求登录（契约 `security: []`）：
 * 浏览抢购页不强制会话。404 `CAMPAIGN_NOT_FOUND` 与其它错误都沿响应拦截器
 * 包成 ApiError 抛出，由页面层映射成可理解的提示。
 */
export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail> {
  const { data } = await client.get<CampaignDetail>(
    `/campaigns/${encodeURIComponent(campaignId)}`,
  )
  return data
}

/**
 * 提交抢购。POST /campaigns/:campaignId/claim 原子完成扣配额、校验限购、分配编号；
 * 成功（201）返回订单号、收藏编号、付款截止时间与服务端时间。错误沿响应拦截器包成
 * ApiError 抛出，页面层只负责恢复可点与兜底提示，错误码分流是后续票的范围。
 */
export async function postCampaignClaim(campaignId: string): Promise<ClaimResult> {
  const { data } = await client.post<ClaimResult>(
    `/campaigns/${encodeURIComponent(campaignId)}/claim`,
  )
  return data
}
