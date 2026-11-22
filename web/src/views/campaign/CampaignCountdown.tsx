import { useEffect, useState } from 'react'
import { formatCountdown, remainingMs, serverNow } from './serverClock'

interface CampaignCountdownProps {
  readonly target: string | null
  readonly offsetMs: number
  readonly label: string
  readonly now?: () => number
}

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
    <p className="text-[15px] text-[#c4cac6]">
      {label}：<span className="font-mono font-semibold text-foreground">{formatCountdown(left)}</span>
    </p>
  )
}
