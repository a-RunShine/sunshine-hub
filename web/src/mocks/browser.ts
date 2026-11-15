import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** 开发期的假后端。main.tsx 里只在 DEV 环境启它。 */
export const worker = setupWorker(...handlers)
