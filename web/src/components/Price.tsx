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
  /**
   * `default`：卡片常规价；`hero`：手风琴展开底栏大号价；`compact`：收起导轨单价（无后缀）。
   */
  readonly variant?: 'default' | 'hero' | 'compact'
}

/** 价格展示：只在展示处按分转元；按场景提供三档层级，不接收分以外的换算结果。 */
export function Price({ cents, variant = 'default' }: PriceProps) {
  const formatted = formatPrice(cents)

  if (variant === 'compact') {
    return (
      <span className="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums text-muted">
        {formatted}
      </span>
    )
  }

  if (variant === 'hero') {
    return (
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums">
        <span className="text-[24px] font-bold leading-none text-foreground max-[860px]:text-[22px]">
          {formatted}
        </span>
        <span className="text-[13px] font-medium text-muted">起</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums">
      <span className="font-mono text-[18px] leading-none text-foreground">{formatted}</span>
      <span className="text-[12px] text-muted">起</span>
    </span>
  )
}
