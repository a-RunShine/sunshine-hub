import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuth } from '@/stores/auth'

export default function App() {
  const restoreSession = useAuth((state) => state.restoreSession)
  const [DevScenarioPanel, setDevScenarioPanel] = useState<ComponentType | null>(null)

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

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
