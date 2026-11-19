import { useEffect, useRef } from 'react'

/** 可恢复状态重新取数间隔（毫秒）。回流释放是慢动作，15 秒一轮足够观察配额回升 / 冷却到期。 */
export const RECOVERABLE_REFETCH_INTERVAL_MS = 15_000

export interface VisibilityPollingOptions {
  /** 只有可恢复状态（售罄回流 / 冷却到期）才挂定时器；false 时不监听、不计时。 */
  readonly active: boolean
  /** 轮询间隔（毫秒）。 */
  readonly intervalMs: number
  /** 每轮拉取动作；页面回到前台时也先触发一轮再继续计时。 */
  readonly onTick: () => void
}

/**
 * 通用可见性轮询。售罄配额回升与购买冷却到期两处复用这一套，不各自复制定时器逻辑：
 *
 * - `active` 为 false 时不挂任何定时器，也不监听 visibilitychange；
 * - 页面切到后台（`document.hidden`）暂停计时，回前台先拉一轮再继续；
 * - 卸载 / `active` 或间隔变化时清掉定时器与监听，无定时器泄漏。
 *
 * 轮询只服务于可自行恢复的状态，不给其它失败态挂常驻定时器。
 */
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
