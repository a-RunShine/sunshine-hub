import { client } from '@/api/client'
import { applyScenarioHeader } from './devScenarioSelection'

/**
 * 开发期场景切换器入口。只在 DEV 环境由 main.tsx / App.tsx 动态导入：
 * - `attachScenarioInterceptor` 把当前选中的场景写进后续 axios 请求的场景头；
 * - `DevScenarioPanel` 是对着人演示用的切换面板。
 *
 * 生产构建里这一整条模块图（选择状态、面板、注册表读取、订阅监听）都不进产物，
 * 验收证据见 issue #49 回报里的 dist grep。
 */
export function attachScenarioInterceptor(): void {
  client.interceptors.request.use((config) => applyScenarioHeader(config))
}

export { default as DevScenarioPanel } from './devScenarioPanel'
