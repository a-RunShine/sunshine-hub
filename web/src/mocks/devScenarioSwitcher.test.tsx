import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_SCENARIO_HEADER, scenarios } from './scenarios'
import {
  applyScenarioHeader,
  getSelectedScenarioId,
  resetScenarioSelection,
  setSelectedScenarioId,
  type ScenarioRequestConfig,
} from './devScenarioSelection'
import { DevScenarioPanel } from './devScenarioSwitcher'

beforeEach(() => resetScenarioSelection())

describe('场景清单：来自注册表，不硬编码数量', () => {
  it('面板选项数量与注册表场景数一致，id 顺序对齐注册表', () => {
    render(<DevScenarioPanel />)
    const select = screen.getByRole('combobox')
    const options = within(select).getAllByRole('option')

    expect(options).toHaveLength(scenarios.length)
    expect(options.map((option) => option.getAttribute('value'))).toEqual(
      scenarios.map((scenario) => scenario.id),
    )
  })
})

describe('请求头注入', () => {
  it('选中场景后，请求配置带上对应的 X-Mock-Scenario 头', () => {
    setSelectedScenarioId('claim-cooldown')
    const config: ScenarioRequestConfig = { headers: {} }

    const applied = applyScenarioHeader(config)

    expect(applied.headers?.[MOCK_SCENARIO_HEADER]).toBe('claim-cooldown')
  })

  it('未选择时原样返回配置，不写场景头', () => {
    const headers = {}
    const config: ScenarioRequestConfig = { headers }

    const applied = applyScenarioHeader(config)

    expect(applied.headers).toBe(headers)
    expect(MOCK_SCENARIO_HEADER in headers).toBe(false)
  })

  it('从选中切回默认后，不再带场景头', () => {
    setSelectedScenarioId('order-cooldown')
    applyScenarioHeader({ headers: {} })

    setSelectedScenarioId(null)
    const config: ScenarioRequestConfig = { headers: {} }
    const applied = applyScenarioHeader(config)

    expect(applied.headers?.[MOCK_SCENARIO_HEADER]).toBeUndefined()
  })
})

describe('面板交互', () => {
  it('初始展示未选择提示；选择场景后写入选择状态并展示描述与作用请求', () => {
    render(<DevScenarioPanel />)

    expect(screen.getByText(/未选择/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'detail-limit-reached' },
    })

    expect(getSelectedScenarioId()).toBe('detail-limit-reached')
    const scenario = scenarios.find((item) => item.id === 'detail-limit-reached')
    expect(scenario).toBeDefined()
    expect(screen.getByText(scenario!.description)).toBeInTheDocument()
    expect(screen.getByText('作用于：详情 / 抢购')).toBeInTheDocument()
  })

  it('从面板切回默认（happy）后，选择状态清空、不带场景头', () => {
    render(<DevScenarioPanel />)

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'claim-sold-out' },
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'happy' } })

    expect(getSelectedScenarioId()).toBeNull()
    const config = applyScenarioHeader({ headers: {} } as ScenarioRequestConfig)
    expect(config.headers?.[MOCK_SCENARIO_HEADER]).toBeUndefined()
  })
})
