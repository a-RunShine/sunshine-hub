import { ApiError } from './client'

/**
 * 把请求层错误映射成可展示文案：`ApiError` 带拦截器 / 服务端给的 message，
 * 其余异常（网络层报错等）落统一兜底。展示层不要各自重复 instanceof 判断。
 */
export function errorMessage(error: unknown, fallback = '网络出了点问题'): string {
  return error instanceof ApiError ? error.message : fallback
}
