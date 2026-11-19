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
