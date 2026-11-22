import { MOCK_SCENARIO_HEADER } from './scenarios'

export interface ScenarioRequestConfig {
  headers?: Record<string, string> & {
    set?: (name: string, value: string) => void
  }
}

let selectedId: string | null = null

type SelectionListener = () => void
const listeners = new Set<SelectionListener>()

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

export function resetScenarioSelection(): void {
  selectedId = null
  listeners.clear()
}

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
