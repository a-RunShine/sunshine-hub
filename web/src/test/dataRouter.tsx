import { StrictMode } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom'

interface NodeUtil {
  transferableAbortController?: () => AbortController
}

interface GlobalsWithProcess {
  process?: { getBuiltinModule?: (id: string) => unknown }
}

function nativeAbortController(): AbortController | undefined {
  const util = (globalThis as GlobalsWithProcess).process?.getBuiltinModule?.('node:util') as
    | NodeUtil
    | undefined
  return util?.transferableAbortController?.()
}

function toNativeSignal(signal: AbortSignal | null): AbortSignal | null {
  if (signal === null) return null
  const controller = nativeAbortController()
  if (!controller) return signal
  if (signal.aborted) {
    controller.abort(signal.reason)
    return controller.signal
  }
  signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  return controller.signal
}

const BaseRequest = Request

class DataRouterRequest extends BaseRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init === undefined) {
      super(input)
      return
    }
    if (init.signal === undefined) {
      super(input, init)
      return
    }
    super(input, { ...init, signal: toNativeSignal(init.signal) })
  }
}

function installDataRouterRequest(): void {
  if (globalThis.Request === DataRouterRequest) return
  globalThis.Request = DataRouterRequest
}

installDataRouterRequest()

export interface DataRouterRenderOptions {
  initialEntries?: string[]
}

export interface DataRouterRenderResult extends RenderResult {
  router: ReturnType<typeof createMemoryRouter>
}

export function renderWithDataRouter(
  routes: RouteObject[],
  options: DataRouterRenderOptions = {},
): DataRouterRenderResult {
  const router = createMemoryRouter(routes, { initialEntries: options.initialEntries ?? ['/'] })
  const result = render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return { ...result, router }
}
