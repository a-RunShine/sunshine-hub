import { create } from 'zustand'

export interface Me {
  id: number
  username: string
  realNameVerified: boolean
  realName?: string | null
  idNumberTail?: string | null
}

interface AuthState {
  me: Me | null
  setMe: (me: Me | null) => void
  isLoggedIn: () => boolean
  needRealName: () => boolean
}

/**
 * 只放客户端状态。
 * 商品、订单、库存这些来自服务端的数据不进这里，它们该由各自的请求层管。
 */
export const useAuth = create<AuthState>((set, get) => ({
  me: null,
  setMe: (me) => set({ me }),
  isLoggedIn: () => get().me !== null,
  needRealName: () => {
    const me = get().me
    return me !== null && !me.realNameVerified
  },
}))
