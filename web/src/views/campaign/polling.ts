import { useEffect, useRef } from 'react'

export const RECOVERABLE_REFETCH_INTERVAL_MS = 15_000

export interface VisibilityPollingOptions {
  readonly active: boolean
  readonly intervalMs: number
  readonly onTick: () => void
}

export function useVisibilityPolling({ active, intervalMs, onTick }: VisibilityPollingOptions): void {
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  useEffect(() => {
    if (!active) return

    let timer: ReturnType<typeof setInterval> | null = null
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
    const start = () => {
      if (timer === null) timer = setInterval(() => onTickRef.current(), intervalMs)
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        onTickRef.current()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active, intervalMs])
}
