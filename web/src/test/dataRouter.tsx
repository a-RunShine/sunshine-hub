import { StrictMode, type ReactElement } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom'

interface NodeUtil {
  transferableAbortController?: () => AbortController
}

interface GlobalsWithProcess {
  process?: { getBuiltinModule?: (id: string) => unknown }
  [key: string]: unknown
}

const REQUEST_INSTALLED = '__dataRouterRequestInstalled'

function nativeAbortController(): AbortController | undefined {
  const util = (globalThis as GlobalsWithProcess).process?.getBuiltinModule?.('node:util') as
    | NodeUtil
    | undefined
  return util?.transferableAbortController?.()
}

function toNativeSignal(signal: AbortSignal | null | undefined): AbortSignal | null | undefined {
  if (signal === null || signal === undefined) return signal
  const controller = nativeAbortController()
  if (!controller) return signal
  if (signal.aborted) {
    controller.abort(signal.reason)
    return controller.signal
  }
  signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  return controller.signal
}

export class DataRouterRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, { ...init, signal: toNativeSignal(init?.signal) })
  }
}

function installDataRouterRequest(): void {
  const globals = globalThis as GlobalsWithProcess
  if (globals[REQUEST_INSTALLED]) return
  globals[REQUEST_INSTALLED] = true
  globals.Request = DataRouterRequest
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

export function renderElementWithDataRouter(
  element: ReactElement,
  path = '/',
  options: DataRouterRenderOptions = {},
): DataRouterRenderResult {
  return renderWithDataRouter([{ path, element }], options)
}
