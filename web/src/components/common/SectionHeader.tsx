import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  readonly title: string
  readonly titleId?: string
  readonly right?: ReactNode
  readonly as?: 'h1' | 'h2'
  readonly className?: string
}

export function SectionHeader({
  title,
  titleId,
  right,
  as = 'h2',
  className,
}: SectionHeaderProps) {
  const Heading = as

  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3.5',
        className,
      )}
    >
      <Heading
        id={titleId}
        className={cn(
          'm-0 font-bold tracking-[-0.015em] text-foreground',
          as === 'h1'
            ? 'text-[30px] leading-[1.15] max-[860px]:text-[26px]'
            : 'text-[26px] leading-[1.15] max-[860px]:text-[22px]',
        )}
      >
        {title}
      </Heading>
      {right && <div className="flex shrink-0 items-center gap-3 max-[640px]:w-full">{right}</div>}
    </div>
  )
}
