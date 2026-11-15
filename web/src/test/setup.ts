import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 没有开 vitest globals，cleanup 得自己挂
afterEach(() => cleanup())
