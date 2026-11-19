import { useEffect, useState } from 'react'
import { DEFAULT_SCENARIO_ID, scenarios } from './scenarios'
import type { MockScenario } from './scenarios'
import {
  getSelectedScenarioId,
  setSelectedScenarioId,
  subscribeScenarioSelection,
} from './devScenarioSelection'

/** 场景声明覆盖哪几类请求，用来在面板上标注它作用于谁；happy 没有任何覆盖。 */
function scenarioTargets(scenario: MockScenario): string[] {
  const targets: string[] = []
  if (scenario.campaignDetail) targets.push('详情')
  if (scenario.claimFailure) targets.push('抢购')
  if (scenario.orderFailure) targets.push('下单')
  return targets
}

/**
 * 开发期的假后端场景切换面板。
 * 选项清单直接读场景注册表（scenarios.ts），不在面板里另抄一份 id；
 * 新增场景后这里自动出现，无需改面板代码。
 * 整个组件只在 DEV 环境被动态导入，生产构建不打包。
 */
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
