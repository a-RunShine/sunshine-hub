import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/api/errors'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

/**
 * 区块取数状态：加载 / 错误 / 有数据。fetcher 经 ref 取最新闭包，避免每次渲染重建请求；
 * 竞态序号保证过期响应不覆盖新状态。错误文案统一走 errorMessage 映射。
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown> = []) {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const current = ++seq.current
    try {
      const data = await fetcherRef.current()
      if (current !== seq.current) return
      setState({ status: 'ready', data })
    } catch (error) {
      if (current !== seq.current) return
      setState({ status: 'error', message: errorMessage(error) })
    }
  }, [])

  useEffect(() => {
    setState({ status: 'loading' })
    void reload()
    // 依赖由调用方按区块传入；fetcher 经 ref 读最新闭包，不进依赖数组。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps])

  return { state, reload }
}
