import { client } from './client'
import type { components, paths } from '@/types/api'

export type Me = components['schemas']['Me']
export type RegisterInput = paths['/auth/register']['post']['requestBody']['content']['application/json']
export type LoginInput = paths['/auth/login']['post']['requestBody']['content']['application/json']
export type RealNameInput = paths['/me/real-name']['put']['requestBody']['content']['application/json']
export type ChangePasswordInput = paths['/me/password']['put']['requestBody']['content']['application/json']

export async function getMe(): Promise<Me> {
  const { data } = await client.get<Me>('/me', { skipAuthRedirect: true })
  return data
}

export async function register(input: RegisterInput): Promise<Me> {
  const { data } = await client.post<Me>('/auth/register', input)
  return data
}

export async function login(input: LoginInput): Promise<Me> {
  const { data } = await client.post<Me>('/auth/login', input, { skipAuthRedirect: true })
  return data
}

export async function submitRealName(input: RealNameInput): Promise<Me> {
  const { data } = await client.put<Me>('/me/real-name', input)
  return data
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await client.put('/me/password', input)
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout', undefined, { skipAuthRedirect: true })
}
