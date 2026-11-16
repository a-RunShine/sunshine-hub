import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuth } from '@/stores/auth'

export default function App() {
  const restoreSession = useAuth((state) => state.restoreSession)

  // 启动时用 /me 恢复会话。401 才按未登录处理，网络故障留给守卫提示重试。
  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  return <RouterProvider router={router} />
}
