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
  { to: '/', label: '首页' },
  { to: '/orders', label: '我的订单' },
  { to: '/items', label: '道具库' },
  { to: '/fulfillments', label: '履约单' },
] as const

/**
 * 应用外壳：顶部导航 + 品牌位 + 登录 / 退出入口，包裹页面 children。
 * 登录态直接读 useAuth；外壳不发业务请求，会话恢复沿用 App.tsx 的 restoreSession。
 */
export function AppShell({ children }: { children: ReactNode }) {
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
      <header className="border-b border-line">
        <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-7 px-8">
          <div className="flex min-w-[190px] items-center gap-3">
            <BrandMark size={18} className="text-accent" />
            <div>
              <div className="font-mono text-[14px] font-bold tracking-[.18em] text-foreground">
                SUNSHINE
              </div>
              <div className="text-[11px] tracking-[.14em] text-faint">FPS / 军需站</div>
            </div>
          </div>

          <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative py-1.5 text-[12px] tracking-wide transition-colors',
                    isActive ? 'text-foreground' : 'text-muted hover:text-foreground',
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

          <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted">
            {me === null ? (
              <Link
                to={buildLoginUrl(location)}
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'hover:bg-ink-800 hover:text-foreground',
                })}
              >
                登录
              </Link>
            ) : (
              <>
                <span className="text-foreground">{me.username}</span>
                <span className="text-faint">/</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hover:bg-ink-800 hover:text-foreground"
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

      <main className="mx-auto w-full max-w-[1200px] px-8 pb-10">{children}</main>
    </div>
  )
}
