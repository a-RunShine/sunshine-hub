export function formatPrice(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return '¥0'
  const yuan = Math.floor(cents / 100)
  const remainder = cents % 100
  if (remainder === 0) return `¥${yuan}`
  return `¥${yuan}.${String(remainder).padStart(2, '0')}`
}

interface PriceProps {
  readonly cents: number
  readonly variant?: 'default' | 'hero' | 'compact'
}

export function Price({ cents, variant = 'default' }: PriceProps) {
  const formatted = formatPrice(cents)

  if (variant === 'compact') {
    return (
      <span className="whitespace-nowrap text-[13px] font-semibold leading-none tabular-nums text-[#c4cac6]">
        {formatted}
      </span>
    )
  }

  if (variant === 'hero') {
    return (
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums">
        <span className="text-[26px] font-bold leading-none text-foreground max-[860px]:text-[22px]">
          {formatted}
        </span>
        <span className="text-[13px] font-medium text-[#c4cac6]">起</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums">
      <span className="text-[22px] font-bold leading-none text-foreground max-[860px]:text-[20px]">
        {formatted}
      </span>
      <span className="text-[13px] font-medium text-[#c4cac6]">起</span>
    </span>
  )
}
