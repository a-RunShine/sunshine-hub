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

/**
 * 预约场次。POST /campaigns/:campaignId/reserve，契约 204 无响应体。
 * 成功后不读响应内容（不解析 204 body），由调用方重拉详情把 `reserved` 刷成新值，
 * 不做与后端可能不一致的乐观更新。
 */
export async function reserveCampaign(campaignId: string): Promise<void> {
  await client.post(`/campaigns/${encodeURIComponent(campaignId)}/reserve`)
}

/**
 * 取消预约。DELETE /campaigns/:campaignId/reserve，契约 204 无响应体，口径同预约：
 * 不读响应内容，成功后重拉详情刷新 `reserved`。
 */
export async function cancelReserveCampaign(campaignId: string): Promise<void> {
  await client.delete(`/campaigns/${encodeURIComponent(campaignId)}/reserve`)
}
