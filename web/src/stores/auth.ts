import { create } from 'zustand'
import { ApiError } from '@/api/client'
import { getMe, type Me } from '@/api/identity'

export type { Me }

export type AuthStatus = 'uninitialized' | 'loading' | 'ready' | 'error'

interface AuthState {
  me: Me | null
  status: AuthStatus
  authNotice: string | null
  setMe: (me: Me | null) => void
  setStatus: (status: AuthStatus) => void
  setAuthNotice: (notice: string | null) => void
  restoreSession: () => Promise<void>
  isLoggedIn: () => boolean
  needRealName: () => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  me: null,
  status: 'uninitialized',
  authNotice: null,
  setMe: (me) => set({ me }),
  setStatus: (status) => set({ status }),
  setAuthNotice: (authNotice) => set({ authNotice }),

  restoreSession: async () => {
    const status = get().status
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
