/**
 * 金额唯一换算处：契约金额一律是整数分，只在展示层除以 100。
 * 中间层（api、页面状态、组件 props）不做浮点运算、不 parseFloat。
 *
 * @param cents 单位分；0、整百分、非整百分口径一致。
 * @returns 展示串，如 12800 → ¥128，12850 → ¥128.50，0 → ¥0。
 */
export function formatPrice(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return '¥0'
  const yuan = Math.floor(cents / 100)
  const remainder = cents % 100
  if (remainder === 0) return `¥${yuan}`
  return `¥${yuan}.${String(remainder).padStart(2, '0')}`
}

interface PriceProps {
  /** 整数分。 */
  readonly cents: number
}

/** 价格展示：18px mono accent 主数字 + 11px weak 后缀；不接收分以外的换算结果。 */
export function Price({ cents }: PriceProps) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-mono text-[18px] leading-none text-accent">{formatPrice(cents)}</span>
      <span className="text-[11px] text-faint">起</span>
    </span>
  )
}
