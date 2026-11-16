import { create } from 'zustand'
import type { components } from '@/types/api'

export type Me = components['schemas']['Me']

/** 启动时要先确认 cookie 有没有效，确认完才敢按 me 判断登录态 */
export type AuthStatus = 'uninitialized' | 'loading' | 'ready'

interface AuthState {
  me: Me | null
  status: AuthStatus
  setMe: (me: Me | null) => void
  setStatus: (status: AuthStatus) => void
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
  isLoggedIn: () => get().me !== null,
  needRealName: () => {
    const me = get().me
    return me !== null && !me.realNameVerified
  },
}))
