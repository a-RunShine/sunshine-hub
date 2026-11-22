import { useCountdown } from './useCountdown'

/**
 * 首页主角区中文基线倒计时：基于目标开售时刻每秒跳动，时分骨白、秒针琥珀金、
 * 等宽数字 tabular-nums 防抖动，不带额外英文缩写副标。
 */
export function HomeCountdown({ target }: { target: string }) {
  const { hours, minutes, seconds } = useCountdown(target)

  return (
    <div
      className="mb-[34px] mt-[28px] inline-flex items-baseline gap-[22px] max-[860px]:my-6"
      role="timer"
      aria-label="距离开售倒计时"
    >
      <div className="inline-flex items-baseline">
        <span className="text-[48px] font-bold leading-none tracking-[-0.02em] tabular-nums text-foreground max-[860px]:text-[38px]">
          {hours}
        </span>
        <span className="ml-[5px] text-[16px] font-medium leading-none text-muted max-[860px]:text-[15px]">
          时
        </span>
      </div>
      <div className="inline-flex items-baseline">
        <span className="text-[48px] font-bold leading-none tracking-[-0.02em] tabular-nums text-foreground max-[860px]:text-[38px]">
          {minutes}
        </span>
        <span className="ml-[5px] text-[16px] font-medium leading-none text-muted max-[860px]:text-[15px]">
          分
        </span>
      </div>
      <div className="inline-flex items-baseline">
        <span className="text-[48px] font-bold leading-none tracking-[-0.02em] tabular-nums text-accent max-[860px]:text-[38px]">
          {seconds}
        </span>
        <span className="ml-[5px] text-[16px] font-medium leading-none text-muted max-[860px]:text-[15px]">
          秒
        </span>
      </div>
    </div>
  )
}
