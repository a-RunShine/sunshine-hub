import { describe, expect, it } from 'vitest'
import { PRODUCTION_NODE_ENV_MESSAGE, assertNodeEnvCompatible } from '../../vite-env-guard'

describe('vite 配置的 NODE_ENV 守卫', () => {
  it('production 环境污染 dev 与 test 时抛错并提示 env -u NODE_ENV', () => {
    for (const mode of ['development', 'test']) {
      expect(() => assertNodeEnvCompatible(mode, 'production')).toThrow(PRODUCTION_NODE_ENV_MESSAGE)
    }
    expect(PRODUCTION_NODE_ENV_MESSAGE).toContain('env -u NODE_ENV')
  })

  it('build 与 preview 走 production mode，不受该校验影响', () => {
    expect(() => assertNodeEnvCompatible('production', 'production')).not.toThrow()
    expect(() => assertNodeEnvCompatible('preview', 'production')).not.toThrow()
  })

  it('未设 NODE_ENV 时任何 mode 都放行', () => {
    for (const mode of ['development', 'test', 'production']) {
      expect(() => assertNodeEnvCompatible(mode, undefined)).not.toThrow()
    }
  })
})
