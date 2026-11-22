import { create } from 'zustand'
import { ApiError } from '@/api/client'
import { getMe, type Me } from '@/api/identity'

export type { Me }

/**
 * 启动时要先确认 cookie 有没有效，确认完才敢按 me 判断登录态。
 * error 表示网络或服务端故障，登录态无法确认，不能按匿名处理。
 */
export type AuthStatus = 'uninitialized' | 'loading' | 'ready' | 'error'

interface AuthState {
  me: Me | null
  status: AuthStatus
  setMe: (me: Me | null) => void
  setStatus: (status: AuthStatus) => void
  restoreSession: () => Promise<void>
  isLoggedIn: () => boolean
  needRealName: () => boolean
}

/**
 * 只放客户端状态。
 * 商品、订单、库存这些来自服务端的数据不进这里，它们该由各自的请求层管。
 */
export const useAuth = create<AuthState>((set, get) => ({
  me: null,
  status: 'uninitialized',
  setMe: (me) => set({ me }),
  setStatus: (status) => set({ status }),

  /**
   * 用 /me 恢复已有 cookie 的会话。
   * 只有 401 才能说明会话真的失效；5xx 和网络故障不能把用户打成匿名，
   * 否则一次抖动就会让人被守卫踢回登录页。这种情况进 error，等用户重试。
   */
  restoreSession: async () => {
    const status = get().status
    // StrictMode 会重复触发，恢复中或已恢复就别重复发请求
    if (status === 'loading' || status === 'ready') return

    set({ status: 'loading' })
    try {
      set({ me: await getMe(), status: 'ready' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        set({ me: null, status: 'ready' })
        return
      }
      set({ status: 'error' })
    }
  },

  isLoggedIn: () => get().me !== null,
  needRealName: () => {
    const me = get().me
    return me !== null && !me.realNameVerified
  },
}))
