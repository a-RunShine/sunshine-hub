import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { getMe } from '@/api/identity'
import { useAuth } from '@/stores/auth'

export default function App() {
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)

  // 启动时用 /me 恢复会话。cookie 失效就按未登录处理，守卫拿到 ready 才做判断。
  useEffect(() => {
    // StrictMode 会把 effect 跑两遍，已经在恢复中就别重复发请求
    if (useAuth.getState().status !== 'uninitialized') return

    setStatus('loading')
    getMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setStatus('ready'))
  }, [setMe, setStatus])

  return <RouterProvider router={router} />
}
