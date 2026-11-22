import axios, { AxiosError } from 'axios'
import type { components } from '@/types/api'
import { buildLoginUrl } from '@/lib/redirect'

declare module 'axios' {
  // 泛型参数要与 axios 原声明完全一致才能合并，D/P 在这里必然用不到
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  export interface AxiosRequestConfig<D = any, P = any> {
    skipAuthRedirect?: boolean
  }
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
}

export type ApiErrorBody = components['schemas']['Error']

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

    if (
      status === 401 &&
      !error.config?.skipAuthRedirect &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = buildLoginUrl(window.location)
    }

    if (status === 429) {
      return Promise.reject(
        new ApiError('RATE_LIMITED', body?.message ?? '操作太快了，歇一下再试', status),
      )
    }

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

    const message = error.code === 'ECONNABORTED' ? '请求超时，请重试' : '网络出了点问题'
    return Promise.reject(new ApiError('NETWORK_ERROR', message, status))
  },
)
