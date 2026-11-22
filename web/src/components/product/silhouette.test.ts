import { describe, expect, it } from 'vitest'
import type { components } from '@/types/api'
import { silhouetteVariant } from './silhouette'

type ProductSummary = components['schemas']['ProductSummary']

function product(overrides: Partial<ProductSummary>): ProductSummary {
  return {
    id: 1,
    name: '',
    kind: 'VIRTUAL',
    categoryId: 1,
    coverUrl: '',
    minPrice: 0,
    limited: false,
    ...overrides,
  }
}

/**
 * 占位美术映射兜底测试：剪影只在 coverUrl 为空时占位，按 categoryId 选轮廓，
 * 不按分类展示名硬编码；映射落空时按形态兜底。
 */
describe('silhouette 占位映射', () => {
  it('按 categoryId 选剪影：武器皮肤枪形、手办人形、服饰衣形', () => {
    expect(silhouetteVariant(product({ categoryId: 1 }))).toBe('weapon')
    expect(silhouetteVariant(product({ categoryId: 4, kind: 'PHYSICAL' }))).toBe('figure')
    expect(silhouetteVariant(product({ categoryId: 5, kind: 'PHYSICAL' }))).toBe('shirt')
  })

  it('映射落空时按形态兜底：虚拟道具枪形，实体周边盒形', () => {
    expect(silhouetteVariant(product({ categoryId: 99, kind: 'VIRTUAL' }))).toBe('weapon')
    expect(silhouetteVariant(product({ categoryId: 99, kind: 'PHYSICAL' }))).toBe('box')
  })
})
