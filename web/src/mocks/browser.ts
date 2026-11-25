import { setupWorker } from 'msw/browser'
import { createHandlers } from './handlers'

const storage = typeof window !== 'undefined' ? window.localStorage : undefined

export const worker = setupWorker(...createHandlers(undefined, { storage }))
