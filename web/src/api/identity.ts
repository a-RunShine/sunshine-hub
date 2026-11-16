import { client } from './client'
import type { components } from '@/types/api'

export type Me = components['schemas']['Me']

/**
 * 拉当前登录用户。应用启动时调一次，用来恢复已有 cookie 的会话。
 * 未登录时服务端返回 401，调用方按 me = null 处理，这里不触发全局跳登录。
 */
export async function getMe(): Promise<Me> {
  const { data } = await client.get<Me>('/me', { skipAuthRedirect: true })
  return data
}
