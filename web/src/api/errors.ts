import { ApiError } from './client'

export function errorMessage(error: unknown, fallback = '网络出了点问题'): string {
  return error instanceof ApiError ? error.message : fallback
}
