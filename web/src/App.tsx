import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuth } from '@/stores/auth'

export default function App() {
  const restoreSession = useAuth((state) => state.restoreSession)
  const [DevScenarioPanel, setDevScenarioPanel] = useState<ComponentType | null>(null)

  // 启动时用 /me 恢复会话。401 才按未登录处理，网络故障留给守卫提示重试。
  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  // 开发期场景切换面板：DEV 守卫下动态导入，生产构建连同模块一起摇掉。
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let cancelled = false
    void import('./mocks/devScenarioSwitcher').then((module) => {
      if (!cancelled) setDevScenarioPanel(() => module.DevScenarioPanel)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      {DevScenarioPanel !== null && <DevScenarioPanel />}
    </>
  )
}
