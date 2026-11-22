import { client } from '@/api/client'
import { applyScenarioHeader } from './devScenarioSelection'

export function attachScenarioInterceptor(): void {
  client.interceptors.request.use((config) => applyScenarioHeader(config))
}

export { default as DevScenarioPanel } from './devScenarioPanel'
