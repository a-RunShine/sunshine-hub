import { useCountdown } from './useCountdown'

/**
 * 首页右栏主角倒计时：40px mono accent 数字；轴标签是 10px 例外字号，
 * 只在倒计时侧栏使用，不外溢到其它区块。
 */
export function HomeCountdown({ target }: { target: string }) {
  const { hours, minutes, seconds } = useCountdown(target)

  return (
    <div>
      <div className="mt-4 flex items-baseline gap-1.5 font-mono text-[40px] leading-none text-accent">
        <span>{hours}</span>
        <i className="text-[28px] not-italic text-accent-muted">:</i>
        <span>{minutes}</span>
        <i className="text-[28px] not-italic text-accent-muted">:</i>
        <span>{seconds}</span>
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] tracking-[.1em] text-faint">
        <span>HOURS</span>
        <span>MINUTES</span>
        <span>SECONDS</span>
      </div>
    </div>
  )
}
