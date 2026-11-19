import axios, { AxiosError } from 'axios'
import type { components } from '@/types/api'
import { buildLoginUrl } from '@/lib/redirect'

declare module 'axios' {
  // 泛型参数要与 axios 原声明完全一致才能合并，D/P 在这里必然用不到
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  export interface AxiosRequestConfig<D = any, P = any> {
    /** 置 true 时 401 不自动跳登录页，由调用方自己处理 */
    skipAuthRedirect?: boolean
  }
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
}

/** 契约里的 Error 结构，手写会漂移，直接用生成的 */
export type ApiErrorBody = components['schemas']['Error']

/** 业务错误。组件拿它判断 code，不要拿 message 做判断 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10_000,
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data

    // 会话没了就回登录页，带上当前路径以便登录后跳回来
    if (
      status === 401 &&
      !error.config?.skipAuthRedirect &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = buildLoginUrl(window.location)
    }

    // 限流是预期内的，文案由后端决定，别覆盖
    if (status === 429) {
      return Promise.reject(
        new ApiError('RATE_LIMITED', body?.message ?? '操作太快了，歇一下再试', status),
      )
    }

    // 5xx 保留服务端 message 原文（契约 Error.message 口径为可直接展示给用户的中文文案）；
    // 仅在响应体缺 message 时才落前端兜底，不用前端文案盖掉服务端提示。
    if (status >= 500) {
      return Promise.reject(
        new ApiError(
          body?.code ?? 'INTERNAL_ERROR',
          body?.message ?? '服务出了点问题，稍后再试',
          status,
        ),
      )
    }

    if (body?.code) {
      return Promise.reject(new ApiError(body.code, body.message, status))
    }

    // 网络错误或后端没按契约返回，给一句能看的兜底文案
    const message = error.code === 'ECONNABORTED' ? '请求超时，请重试' : '网络出了点问题'
    return Promise.reject(new ApiError('NETWORK_ERROR', message, status))
  },
)
