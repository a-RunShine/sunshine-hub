import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { useAuth } from '@/stores/auth'
import { logout } from '@/api/identity'
import { buildLoginUrl } from '@/lib/redirect'
import { buttonVariants } from '@/components/ui/button'
import { BrandMark } from '@/components/BrandMark'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: '首页', end: true },
  { to: '/products', label: '全部商品', end: false },
] as const

const ACCOUNT_MENU_ITEMS = [
  { to: '/orders', label: '我的订单', meta: '结账记录' },
  { to: '/items', label: '我的库存', meta: '已持有道具' },
  { to: '/fulfillments', label: '我的履约单', meta: '发货与签收' },
  { to: '/settings', label: '账号设置', meta: '密码与实名状态' },
] as const

interface AppShellProps {
  readonly children: ReactNode
  readonly layout?: 'default' | 'full-bleed'
}

export function AppShell({ children, layout = 'default' }: AppShellProps) {
  const me = useAuth((state) => state.me)
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)
  const location = useLocation()

  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)

  const menuContainerRef = useRef<HTMLDivElement | null>(null)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    setMenuOpen(false)
    setHeaderHidden(false)
    setLogoutError(null)
  }, [location.pathname, location.search])

  useEffect(() => {
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0

    function onScroll() {
      const y = window.scrollY
      const delta = y - lastScrollYRef.current
      if (y <= 24) {
        setHeaderHidden(false)
      } else if (delta > 6 && y > 48) {
        setHeaderHidden(true)
        setMenuOpen(false)
      } else if (delta < -6) {
        setHeaderHidden(false)
      }
      lastScrollYRef.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  async function onLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setMenuOpen(false)
    setLogoutError(null)
    try {
      await logout()
      setMe(null)
      setStatus('ready')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMe(null)
        setStatus('ready')
        return
      }
      setLogoutError(errorMessage(error, '退出失败，请稍后重试'))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-foreground">
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-[#222825] bg-[#0c0e0d]/[0.96] backdrop-blur-md transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
          headerHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100',
        )}
      >
        <div className="mx-auto flex h-[64px] w-full max-w-[1360px] items-center justify-between gap-4 px-[clamp(20px,4vw,48px)]">
          <div className="flex items-center gap-7 max-[860px]:gap-4">
            <Link to="/" className="flex shrink-0 items-center gap-3 text-foreground">
              <BrandMark size={20} className="text-accent" />
              <div className="flex flex-col leading-[1.15]">
                <span className="text-[13px] font-bold tracking-[.16em] text-foreground">SUNSHINE</span>
                <span className="mt-0.5 text-[12px] tracking-[.04em] text-muted max-[480px]:hidden">
                  FPS 军需站
                </span>
              </div>
            </Link>

            <nav aria-label="主导航" className="flex items-center gap-2">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex shrink-0 items-center whitespace-nowrap px-3.5 py-1.5 text-[14px] transition-colors max-[860px]:px-2.5 max-[860px]:text-[13px]',
                      isActive
                        ? 'bg-accent/[0.08] font-semibold text-accent'
                        : 'font-medium text-muted hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-accent"
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-accent"
                          />
                        </>
                      )}
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div ref={menuContainerRef} className="relative flex shrink-0 items-center gap-3 text-[13px] text-muted">
            {me === null && (
              <Link
                to={buildLoginUrl(location)}
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'h-8 px-2.5 text-[13px] text-muted hover:bg-ink-800 hover:text-foreground',
                })}
              >
                登录
              </Link>
            )}

            <button
              type="button"
              aria-label="个人账户菜单"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
              className={cn(
                'search-chamfer inline-flex items-center gap-2.5 border bg-[#141816] py-1 pl-1 pr-3 text-[13px] transition-colors',
                menuOpen
                  ? 'border-accent text-foreground'
                  : 'border-[#2b332e] text-foreground hover:border-[#414c45]',
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-[28px] w-[28px] items-center justify-center border-r border-[#2b332e] bg-gradient-to-br from-[#27302b] to-[#151a17]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3C8.5 3 6 5.6 6 9V12L4.5 14.5H19.5L18 12V9C18 5.6 15.5 3 12 3Z"
                    stroke="#f3efe6"
                    strokeWidth="1.5"
                  />
                  <path d="M8.5 9.5H15.5" stroke="#efb829" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="max-w-[96px] truncate font-mono text-[13px] font-medium text-foreground">
                {me ? me.username : '我的'}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="个人账户菜单"
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[248px] border border-[#2f3833] bg-[#131715] p-2 shadow-[0_24px_48px_rgba(0,0,0,0.75)]"
              >
                <div className="mb-1.5 border-b border-line px-2.5 pb-2.5 pt-1.5">
                  <div className="text-[13px] font-semibold text-foreground">
                    {me ? me.username : '未登录访客'}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">订单、持有库存与发货签收</div>
                </div>

                {ACCOUNT_MENU_ITEMS.map((entry) => (
                  <Link
                    key={entry.to}
                    to={entry.to}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-between px-2.5 py-2 text-[13px] text-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <span>{entry.label}</span>
                    <span className="text-[12px] text-muted">{entry.meta}</span>
                  </Link>
                ))}

                {me !== null && (
                  <>
                    <div className="my-1.5 h-px bg-line" aria-hidden="true" />
                    <button
                      type="button"
                      role="menuitem"
                      disabled={loggingOut}
                      onClick={() => void onLogout()}
                      className="flex w-full items-center justify-between px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-ink-800 hover:text-foreground disabled:opacity-50"
                    >
                      <span>退出</span>
                      <span aria-hidden="true" className="text-[12px]">
                        →
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {logoutError !== null && (
          <div
            role="alert"
            className="border-t border-danger/40 bg-ink-900 px-[clamp(20px,4vw,48px)] py-2 text-[13px] text-danger"
          >
            <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4">
              <span>{logoutError}</span>
              <button
                type="button"
                onClick={() => setLogoutError(null)}
                className="text-[12px] text-muted transition-colors hover:text-foreground"
              >
                关闭
              </button>
            </div>
          </div>
        )}
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
