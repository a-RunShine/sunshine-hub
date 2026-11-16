import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 只在开发环境启动 MSW。
 * 生产构建里这段会被摇掉，请求直接打真实后端。
 */
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

const root = document.getElementById('root') as HTMLElement

enableMocking().then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
