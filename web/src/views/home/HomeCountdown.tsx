import { cn } from '@/lib/utils'
import { useCountdown } from './useCountdown'

export function HomeCountdown({ target }: { target: string }) {
  const { hours, minutes, seconds } = useCountdown(target)
  const units = [
    { value: hours, unit: '时', highlight: false },
    { value: minutes, unit: '分', highlight: false },
    { value: seconds, unit: '秒', highlight: true },
  ] as const

  return (
    <div
      className="mb-[34px] mt-[28px] inline-flex items-baseline gap-[22px] max-[860px]:my-6"
      role="timer"
      aria-label="距离开售倒计时"
    >
      {units.map((segment) => (
        <div key={segment.unit} className="inline-flex items-baseline">
          <span
            className={cn(
              'text-[48px] font-bold leading-none tracking-[-0.02em] tabular-nums max-[860px]:text-[38px]',
              segment.highlight ? 'text-accent' : 'text-foreground',
            )}
          >
            {segment.value}
          </span>
          <span className="ml-[5px] text-[16px] font-medium leading-none text-muted max-[860px]:text-[15px]">
            {segment.unit}
          </span>
        </div>
      ))}
    </div>
  )
}
