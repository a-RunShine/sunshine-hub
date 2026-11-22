import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LimitedBadgeProps {
  /** 是否为限量商品；为 false 时不渲染，避免给常规商品贴多余标签。 */
  readonly limited: boolean
  /**
   * - `slash`：R4-B 斜杠文本标 `// 限量`（默认）
   * - `pill`：手风琴等重展台内的低噪描边徽标
   * - `compact`：收窄导轨内单字「限」标记
   */
  readonly variant?: 'slash' | 'pill' | 'compact'
  readonly className?: string
}

/**
 * 统一定制限量标记：视觉细节与强调色约束只留在此包装内，
 * 确保全站常规商品零黄标、限量商品文字可检索匹配。
 */
export function LimitedBadge({ limited, variant = 'slash', className }: LimitedBadgeProps) {
  if (!limited) return null

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'rounded-[2px] border border-accent/40 px-1 text-[12px] font-semibold leading-[16px] text-accent/80',
          className,
        )}
      >
        限
      </span>
    )
  }

  if (variant === 'pill') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'rounded-[2px] border-accent/45 bg-accent/[0.08] px-2 py-0.5 text-[12px] font-semibold tracking-[0.04em] text-accent',
          className,
        )}
      >
        限量
      </Badge>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12px] font-semibold tracking-[0.04em] text-accent',
        className,
      )}
    >
      <span aria-hidden="true" className="opacity-75">
        //
      </span>
      <span>限量</span>
    </span>
  )
}
