import { client } from './client'
import type { components, paths } from '@/types/api'

export type Me = components['schemas']['Me']

export async function getMe(): Promise<Me> {
  const { data } = await client.get<Me>('/me', { skipAuthRedirect: true })
  return data
}

export type RealNameInput = paths['/me/real-name']['put']['requestBody']['content']['application/json']

export async function submitRealName(input: RealNameInput): Promise<Me> {
  const { data } = await client.put<Me>('/me/real-name', input)
  return data
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}
