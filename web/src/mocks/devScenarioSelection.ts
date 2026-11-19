import { MOCK_SCENARIO_HEADER } from './scenarios'

/**
 * 开发期场景选择状态。只存在内存里，不落 localStorage、不写 URL：
 * - null 表示未选择，此时不注入场景头，MSW 按缺省回落到 happy，与本票之前逐字节等价；
 * - 选中后，后续经过 axios 实例的请求都带上对应场景头。
 *
 * 本模块属于开发期切换器的一部分，只在 DEV 环境被动态导入，生产构建不打包。
 */

/** 拦截器配置的最小结构：只关心请求头，避免在开发期模块里直接依赖 axios 类型。 */
export interface ScenarioRequestConfig {
  headers?: Record<string, string> & {
    set?: (name: string, value: string) => void
  }
}

let selectedId: string | null = null

type SelectionListener = () => void
const listeners = new Set<SelectionListener>()

/** 当前选中的场景 id；null 表示未选择。 */
export function getSelectedScenarioId(): string | null {
  return selectedId
}

export function setSelectedScenarioId(id: string | null): void {
  const next = id === null || id.trim() === '' ? null : id
  if (selectedId === next) return
  selectedId = next
  for (const listener of listeners) listener()
}

export function subscribeScenarioSelection(listener: SelectionListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 测试与复位用：清空选择并退订。 */
export function resetScenarioSelection(): void {
  selectedId = null
  listeners.clear()
}

/**
 * 请求拦截器里用的纯函数：未选择时原样返回配置，不写入任何场景头；
 * 选中后才把场景 id 写进 `X-Mock-Scenario`。头名协议见 handlers.ts。
 */
export function applyScenarioHeader<T extends ScenarioRequestConfig>(config: T): T {
  const id = getSelectedScenarioId()
  if (id === null) return config

  if (!config.headers) config.headers = {}
  const headers = config.headers
  if (typeof headers.set === 'function') {
    headers.set(MOCK_SCENARIO_HEADER, id)
  } else {
    headers[MOCK_SCENARIO_HEADER] = id
  }
  return config
}
