import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ActionButton } from '@/components/common/ActionButton'
import { useAuth } from '@/stores/auth'
import { buildLoginUrl } from '@/lib/redirect'

function RequireAuth({ children }: { children: ReactNode }) {
  const me = useAuth((state) => state.me)
  const status = useAuth((state) => state.status)
  const restoreSession = useAuth((state) => state.restoreSession)
  const location = useLocation()

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-sm text-muted">
        <p className="text-danger">网络异常，暂时确认不了登录状态</p>
        <ActionButton intent="secondary" onClick={() => void restoreSession()}>
          重试
        </ActionButton>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
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
