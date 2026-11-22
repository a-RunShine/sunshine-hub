import { describe, expect, it } from 'vitest'
import { formatPrice } from './Price'

describe('formatPrice（分 → 元，唯一换算处）', () => {
  it('整百分去掉小数：12800 → ¥128', () => {
    expect(formatPrice(12800)).toBe('¥128')
  })

  it('整百分：59900 → ¥599', () => {
    expect(formatPrice(59900)).toBe('¥599')
  })

  it('0 → ¥0', () => {
    expect(formatPrice(0)).toBe('¥0')
  })

  it('非整百分保留两位小数：12850 → ¥128.50', () => {
    expect(formatPrice(12850)).toBe('¥128.50')
  })

  it('非法与负值回落 ¥0，不抛浮点运算', () => {
    expect(formatPrice(-1)).toBe('¥0')
    expect(formatPrice(Number.NaN)).toBe('¥0')
  })
})
