import { describe, expect, it } from 'vitest'
import { formatPrice } from './Price'

/**
 * S6：金额纯函数边界。契约金额一律是整数分，只在展示层除 100；
 * 这里只断言输出口径，不测 Price 组件样式。
 */
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
