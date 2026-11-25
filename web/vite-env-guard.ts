export const PRODUCTION_NODE_ENV_MESSAGE =
  '检测到 NODE_ENV=production，会污染 vite dev 与 vitest（依赖预构建走生产分支、React 开发期告警与校验被关掉）。请用 env -u NODE_ENV 重跑，例如 env -u NODE_ENV pnpm --dir web dev。pnpm --dir web build 与 vite preview 走 production mode，不受此限。'

export function assertNodeEnvCompatible(mode: string, nodeEnv: string | undefined): void {
  if (nodeEnv !== 'production') return
  if (mode !== 'development' && mode !== 'test') return
  throw new Error(PRODUCTION_NODE_ENV_MESSAGE)
}
