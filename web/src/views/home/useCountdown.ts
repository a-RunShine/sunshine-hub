import { useEffect, useState } from 'react'
import { pad2 } from '@/lib/format'

export function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [target])

  const targetEpoch = Date.parse(target)
  const leftMs = Number.isNaN(targetEpoch) ? 0 : Math.max(0, targetEpoch - now)
  const totalSeconds = Math.floor(leftMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
  }
}
