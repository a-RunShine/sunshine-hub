import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
  const { attachScenarioInterceptor } = await import('./mocks/devScenarioSwitcher')
  attachScenarioInterceptor()
}

const root = document.getElementById('root') as HTMLElement

enableMocking().then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
