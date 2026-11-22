import { useEffect, useState } from 'react'
import { DEFAULT_SCENARIO_ID, scenarios } from './scenarios'
import type { MockScenario } from './scenarios'
import {
  getSelectedScenarioId,
  setSelectedScenarioId,
  subscribeScenarioSelection,
} from './devScenarioSelection'

function scenarioTargets(scenario: MockScenario): string[] {
  const targets: string[] = []
  if (scenario.campaignDetail) targets.push('详情')
  if (scenario.claimFailure) targets.push('抢购')
  if (scenario.orderFailure) targets.push('下单')
  if (scenario.categoryFailure) targets.push('分类管理')
  if (
    scenario.addressCreateFailure ||
    scenario.addressUpdateFailure ||
    scenario.addressDeleteFailure ||
    scenario.addressDefaultFailure
  ) {
    targets.push('地址')
  }
  if (scenario.signFailure) targets.push('签收')
  return targets
}

export default function DevScenarioPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(getSelectedScenarioId())

  useEffect(
    () => subscribeScenarioSelection(() => setSelectedId(getSelectedScenarioId())),
    [],
  )

  const selected = scenarios.find((item) => item.id === selectedId) ?? null
  const targets = selected ? scenarioTargets(selected) : []

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs text-neutral-200 shadow-lg">
      <p className="font-medium">Mock 场景（开发期）</p>
      <label className="mt-2 block">
        <span className="sr-only">选择假后端场景</span>
        <select
          className="mt-1 w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1"
          value={selectedId ?? DEFAULT_SCENARIO_ID}
          onChange={(event) =>
            setSelectedScenarioId(
              event.target.value === DEFAULT_SCENARIO_ID ? null : event.target.value,
            )
          }
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.id}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-neutral-400">
        {selected ? selected.description : '未选择，所有响应与默认成功场景一致。'}
      </p>
      {targets.length > 0 && <p className="mt-1 text-neutral-500">作用于：{targets.join(' / ')}</p>}
    </aside>
  )
}
