import { useEffect, useState } from 'react'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 首页展示级倒计时：基于 startAt 做本地相对时间，每秒跳动一次。
 * 不接抢购页的服务端时钟校准与轮询；目标已过或非法时刻回落到 0。
 */
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
    ended: leftMs <= 0,
  }
}
