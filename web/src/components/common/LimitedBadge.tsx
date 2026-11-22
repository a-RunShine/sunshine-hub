import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LimitedBadgeProps {
  readonly limited: boolean
  readonly variant?: 'slash' | 'pill' | 'compact'
  readonly className?: string
}

function LimitedDiamondIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <path
        d="M8 1.25L14.75 8L8 14.75L1.25 8L8 1.25Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M8 4.4L11.6 8L8 11.6L4.4 8L8 4.4Z" fill="currentColor" />
    </svg>
  )
}

export function LimitedBadge({ limited, variant = 'slash', className }: LimitedBadgeProps) {
  if (!limited) return null

  if (variant === 'compact') {
    return (
      <span
        title="限量"
        className={cn(
          'inline-flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border border-accent/45 bg-accent/[0.08] text-accent',
          className,
        )}
      >
        <LimitedDiamondIcon className="h-3 w-3" />
      </span>
    )
  }

  if (variant === 'pill') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[2px] border-accent/45 bg-accent/[0.1] px-2.5 py-0.5 text-[13px] font-semibold tracking-[0.04em] text-accent',
          className,
        )}
      >
        <LimitedDiamondIcon className="h-3.5 w-3.5" />
        <span>限量</span>
      </Badge>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[2px] border border-accent/35 bg-accent/[0.08] px-2 py-0.5 text-[13px] font-semibold tracking-[0.04em] text-accent',
        className,
      )}
    >
      <LimitedDiamondIcon className="h-3.5 w-3.5" />
      <span>限量</span>
    </span>
  )
}
