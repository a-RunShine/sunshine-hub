import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { logout } from '@/api/identity'
import { buildLoginUrl } from '@/lib/redirect'
import { Button, buttonVariants } from '@/components/ui/button'
import { BrandMark } from '@/components/BrandMark'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: '首页', end: true },
  { to: '/products', label: '全部军需', end: false },
  { to: '/orders', label: '我的订单', end: false },
  { to: '/items', label: '道具库', end: false },
  { to: '/fulfillments', label: '履约单', end: false },
] as const

interface AppShellProps {
  readonly children: ReactNode
  /**
   * `default`：带居中容器与左右内边距的标准内页；
   * `full-bleed`：铺满视口宽度的沉浸页面（如首页满屏海报）。
   */
  readonly layout?: 'default' | 'full-bleed'
}

/**
 * 应用外壳：顶部吸顶导航 + 品牌位 + 登录 / 退出入口，包裹页面 children。
 * 登录态直接读 useAuth；外壳不发业务请求，会话恢复沿用 App.tsx 的 restoreSession。
 */
export function AppShell({ children, layout = 'default' }: AppShellProps) {
  const me = useAuth((state) => state.me)
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)

  async function onLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
      // 登出成功后才清本地登录态，不做乐观 UI。
      setMe(null)
      setStatus('ready')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#222825] bg-[#0c0e0d]/[0.96] backdrop-blur-md">
        <div className="mx-auto flex h-[64px] w-full max-w-[1360px] items-center justify-between gap-6 px-[clamp(20px,4vw,48px)] max-[860px]:h-auto max-[860px]:min-h-[64px] max-[860px]:flex-wrap max-[860px]:gap-x-3 max-[860px]:gap-y-0 max-[860px]:pt-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-3 text-foreground max-[860px]:order-1">
            <BrandMark size={20} className="text-accent" />
            <div className="flex flex-col leading-[1.15]">
              <span className="text-[13px] font-bold tracking-[.16em] text-foreground">SUNSHINE</span>
              <span className="mt-0.5 text-[12px] tracking-[.04em] text-muted">FPS 军需站</span>
            </div>
          </Link>

          <nav
            aria-label="主导航"
            className="flex h-full items-stretch gap-[clamp(18px,2.6vw,34px)] max-[860px]:order-3 max-[860px]:mt-1.5 max-[860px]:h-[42px] max-[860px]:w-full max-[860px]:gap-5 max-[860px]:overflow-x-auto max-[860px]:border-t max-[860px]:border-[#1b201e]"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex h-full shrink-0 items-center whitespace-nowrap px-0.5 text-[14px] transition-colors max-[860px]:text-[13px]',
                    isActive
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-muted hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3 text-[13px] text-muted max-[860px]:order-2 max-[860px]:ml-auto">
            {me === null ? (
              <Link
                to={buildLoginUrl(location)}
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'h-8 px-2 text-[13px] text-muted hover:bg-ink-800 hover:text-foreground',
                })}
              >
                登录
              </Link>
            ) : (
              <>
                <span className="font-mono text-[13px] text-foreground">{me.username}</span>
                <span className="h-3 w-px bg-line" aria-hidden="true" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[13px] text-muted hover:bg-ink-800 hover:text-foreground"
                  disabled={loggingOut}
                  onClick={() => void onLogout()}
                >
                  退出
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {layout === 'full-bleed' ? (
        <main className="w-full">{children}</main>
      ) : (
        <main className="mx-auto w-full max-w-[1360px] px-[clamp(20px,4vw,48px)] pb-16 pt-8">
          {children}
        </main>
      )}
    </div>
  )
}
