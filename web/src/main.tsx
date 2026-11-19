import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 只在开发环境启动 MSW，并挂上开发期场景切换器的请求拦截器。
 * 生产构建里这段连同切换器模块图一起被摇掉，请求直接打真实后端。
 */
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
