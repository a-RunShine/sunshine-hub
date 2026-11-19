import { useEffect, useState } from 'react'
import { formatCountdown, remainingMs, serverNow } from './serverClock'

interface CampaignCountdownProps {
  /** 倒计时目标时刻；null 时不渲染倒计时。 */
  readonly target: string | null
  /** 服务端时间偏移（毫秒），与 serverClock 同一套校准。 */
  readonly offsetMs: number
  /** 倒计时前缀文案，如「距开售」「距结束」「冷却剩余」。 */
  readonly label: string
  /** 注入当前时刻；默认 Date.now，测试可冻结时间。 */
  readonly now?: () => number
}

/** 倒计时展示：基于偏移后的服务端口径时间算剩余，不直接读本机时间。 */
export function CampaignCountdown({ target, offsetMs, label, now = Date.now }: CampaignCountdownProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (target === null) return
    const timer = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [target])

  if (target === null) return null

  const left = remainingMs(target, serverNow(now(), offsetMs))
  return (
    <p className="text-sm text-neutral-400">
      {label}：<span className="font-mono text-neutral-100">{formatCountdown(left)}</span>
    </p>
  )
}
