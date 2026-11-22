import { describe, expect, it } from 'vitest'
import type { ProductSummary } from '@/api/catalog'
import { silhouetteVariant } from './silhouette'

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

describe('silhouette 占位映射', () => {
  it('按商品形态映射剪影：虚拟道具枪形，实体周边盒形，与分类 ID 无关', () => {
    expect(silhouetteVariant(product({ categoryId: 1, kind: 'VIRTUAL' }))).toBe('weapon')
    expect(silhouetteVariant(product({ categoryId: 99, kind: 'VIRTUAL' }))).toBe('weapon')
    expect(silhouetteVariant(product({ categoryId: 4, kind: 'PHYSICAL' }))).toBe('box')
    expect(silhouetteVariant(product({ categoryId: 99, kind: 'PHYSICAL' }))).toBe('box')
  })
})
