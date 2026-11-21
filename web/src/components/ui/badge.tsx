import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-wide',
  {
    variants: {
      variant: {
        solid: 'bg-accent text-[#141008]',
        outline: 'bg-transparent text-faint',
      },
    },
    defaultVariants: {
      variant: 'solid',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** shadcn Badge 基础件；限量 / 常规的文案由外层组件决定。 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
)
Badge.displayName = 'Badge'
