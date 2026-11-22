import { client } from './client'
import type { components, paths } from '@/types/api'

export type CampaignDetail = components['schemas']['CampaignDetail']
export type FlashCampaignDetail = components['schemas']['FlashCampaignDetail']
export type ClaimResult = components['schemas']['ClaimResult']
export type CampaignSummary = components['schemas']['CampaignSummary']

export type UpcomingCampaigns = paths['/campaigns/upcoming']['get']['responses']['200']['content']['application/json']

export async function getUpcomingCampaigns(): Promise<UpcomingCampaigns> {
  const { data } = await client.get<UpcomingCampaigns>('/campaigns/upcoming')
  return data
}

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail> {
  const { data } = await client.get<CampaignDetail>(
    `/campaigns/${encodeURIComponent(campaignId)}`,
  )
  return data
}

export async function postCampaignClaim(campaignId: string): Promise<ClaimResult> {
  const { data } = await client.post<ClaimResult>(
    `/campaigns/${encodeURIComponent(campaignId)}/claim`,
    undefined,
    { skipAuthRedirect: true },
  )
  return data
}

export async function reserveCampaign(campaignId: string): Promise<void> {
  await client.post(`/campaigns/${encodeURIComponent(campaignId)}/reserve`)
}

export async function cancelReserveCampaign(campaignId: string): Promise<void> {
  await client.delete(`/campaigns/${encodeURIComponent(campaignId)}/reserve`)
}
