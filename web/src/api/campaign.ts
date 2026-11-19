import { client } from './client'
import type { components } from '@/types/api'

export type CampaignDetail = components['schemas']['CampaignDetail']
export type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']

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
