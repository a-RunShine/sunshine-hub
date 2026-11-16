import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { buildLoginUrl } from '@/lib/redirect'

/**
 * 登录守卫：启动时先从 /me 恢复会话，确认完（ready）且确实没登录才回登录页。
 * 恢复期间渲染加载态，避免有效 cookie 的用户刷新页面被误踢。
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const me = useAuth((state) => state.me)
  const status = useAuth((state) => state.status)
  const location = useLocation()

  if (status !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        正在恢复登录状态…
      </div>
    )
  }

  if (me === null) {
    return <Navigate to={buildLoginUrl(location)} replace />
  }

  return children
}

export default RequireAuth
