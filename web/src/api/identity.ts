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

/** 实名提交入参：契约 `/me/real-name` 请求体，姓名 + 证件号。 */
export interface RealNameInput {
  readonly realName: string
  readonly idNumber: string
}

/**
 * 提交实名。PUT /me/real-name，成功（200）回写最新的购买人档案（`realNameVerified` 翻成 true）；
 * 已实名不允许覆盖回 409 `REAL_NAME_ALREADY_SET`，其它错误沿响应拦截器包成 ApiError 抛出。
 */
export async function submitRealName(input: RealNameInput): Promise<Me> {
  const { data } = await client.put<Me>('/me/real-name', input)
  return data
}
