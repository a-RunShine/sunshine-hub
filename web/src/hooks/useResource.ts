import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/api/errors'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

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
