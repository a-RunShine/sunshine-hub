import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'

/**
 * 骨架阶段的登录守卫：没登录就回登录页，带上当前路径。
 * 真实登录态由 /me 拉取，页面实现时在应用启动处调一次 setMe。
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const me = useAuth((state) => state.me)
  const location = useLocation()

  if (me === null) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return children
}

export default RequireAuth
