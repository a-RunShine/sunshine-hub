import axios, { AxiosError } from 'axios'

/** 契约里的 Error 结构 */
export interface ApiErrorBody {
  code: string
  message: string
  data?: unknown
}

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
    if (status === 401 && !window.location.pathname.startsWith('/login')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?next=${next}`
    }

    if (body?.code) {
      return Promise.reject(new ApiError(body.code, body.message, status))
    }

    // 网络错误或后端没按契约返回，给一句能看的兜底文案
    const message = error.code === 'ECONNABORTED' ? '请求超时，请重试' : '网络出了点问题'
    return Promise.reject(new ApiError('NETWORK_ERROR', message, status))
  },
)
