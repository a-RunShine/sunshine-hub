import { Fragment, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, getProducts, type Category } from '@/api/catalog'
import { getUpcomingCampaigns } from '@/api/campaign'
import { CampaignCard, formatStartAt } from '@/components/campaign/CampaignCard'
import { PageState } from '@/components/common/PageState'
import { useResource } from '@/hooks/useResource'
import { HomeAccordion } from './HomeAccordion'
import { HomeCountdown } from './HomeCountdown'

/**
 * 商城首页（方向 C-2 两屏结构）：
 * - 第一屏：满屏限时抢购斜切海报 + 中文倒计时 + 场次入口（带克制滚动视差）；
 * - 第二屏：精选军需水平手风琴展柜（展示 5 件精选并引流至独立 /products 页）；
 * - 当存在其余未开售场次（rest.length > 0）时，在第二屏下方附即将开售列表。
 */
export default function HomePage() {
  const upcoming = useResource(() => getUpcomingCampaigns(), [])
  const products = useResource(() => getProducts({ size: 5 }), [])
  const categories = useResource<Category[]>(() => getCategories(), [])
  const weaponStageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    let rafId = 0
    const syncParallax = () => {
      rafId = 0
      const el = weaponStageRef.current
      if (!el) return
      const offset = Math.min(72, Math.max(0, window.scrollY * 0.12))
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      if (rafId === 0) rafId = window.requestAnimationFrame(syncParallax)
    }

    syncParallax()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== 0) window.cancelAnimationFrame(rafId)
    }
  }, [])

  const categoryNameById = new Map(
    categories.state.status === 'ready'
      ? categories.state.data.map((category) => [category.id, category.name] as const)
      : [],
  )

  const upcomingItems = upcoming.state.status === 'ready' ? upcoming.state.data.items : []
  const featured = upcomingItems[0] ?? null
  const rest = upcomingItems.slice(1)

  const featuredProducts =
    products.state.status === 'ready' ? products.state.data.items.slice(0, 5) : []

  const heroTitleLines = featured ? featured.name.trim().split(/\s+/).filter(Boolean) : []

  return (
    <div>
      <section
        aria-labelledby={featured ? 'hero-title' : undefined}
        className="relative flex min-h-[calc(100vh-64px)] flex-col justify-end overflow-hidden bg-ink-950 max-[860px]:min-h-[calc(100vh-98px)] max-[860px]:justify-center max-[860px]:gap-4 max-[860px]:pb-[58px] max-[860px]:pt-3"
      >
        {upcoming.state.status === 'loading' && (
          <div className="flex flex-1 items-center justify-center">
            <PageState variant="loading" />
          </div>
        )}
        {upcoming.state.status === 'error' && (
          <div className="flex flex-1 items-center justify-center">
            <PageState variant="error" message={upcoming.state.message} onRetry={upcoming.reload} />
          </div>
        )}
        {upcoming.state.status === 'ready' && featured === null && (
          <div className="flex flex-1 items-center justify-center">
            <PageState variant="empty" />
          </div>
        )}

        {featured && (
          <>
            <div className="hero-diagonal-plane pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
            <svg
              className="pointer-events-none absolute inset-0 z-[2] h-full w-full max-[860px]:hidden"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="59"
                y1="0"
                x2="39"
                y2="100"
                stroke="#252b28"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg
              className="pointer-events-none absolute inset-0 z-[2] hidden h-full w-full max-[860px]:block"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="68"
                y1="0"
                x2="16"
                y2="100"
                stroke="#252b28"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div
              ref={weaponStageRef}
              className="pointer-events-none absolute right-[clamp(-68px,-2.5vw,-16px)] top-[clamp(20px,4.2vh,52px)] z-[3] w-[min(62vw,860px)] will-change-transform max-[1080px]:-right-[52px] max-[1080px]:top-[28px] max-[1080px]:w-[min(68vw,680px)] max-[860px]:relative max-[860px]:right-auto max-[860px]:top-auto max-[860px]:my-0 max-[860px]:flex max-[860px]:w-full max-[860px]:justify-start max-[860px]:pl-3"
              aria-hidden="true"
            >
              <img
                src={featured.coverUrl || '/assets/rifle-trim.png'}
                alt={featured.productName}
                className="block h-auto w-full origin-[64%_45%] -rotate-6 select-none drop-shadow-[0_30px_44px_rgba(0,0,0,0.8)] max-[860px]:w-[min(114vw,490px)] max-[860px]:max-w-none"
              />
            </div>

            <div className="relative z-[4] mx-auto flex w-full max-w-[1360px] items-end justify-start px-[clamp(20px,4vw,48px)] pb-[clamp(64px,8vh,84px)] pt-[clamp(32px,5vh,56px)] max-[860px]:py-0">
              <div className="max-w-[480px]">
                <h1
                  id="hero-title"
                  className="m-0 text-[clamp(50px,5vw,72px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-foreground max-[860px]:text-[clamp(40px,11vw,56px)]"
                >
                  {heroTitleLines.map((line, index) => (
                    <Fragment key={`${line}-${index}`}>
                      {index > 0 && (
                        <>
                          {' '}
                          <br />
                        </>
                      )}
                      {line}
                    </Fragment>
                  ))}
                </h1>

                <HomeCountdown target={featured.startAt} />

                <div className="flex flex-wrap items-center gap-[18px]">
                  <Link
                    to={`/campaigns/${featured.id}`}
                    className="inline-flex items-center gap-2.5 rounded-[2px] bg-accent px-7 py-3.5 text-[15px] font-bold leading-[1.2] tracking-[0.04em] text-ink-950 transition-colors hover:bg-[#f6c84f]"
                  >
                    <span>查看场次</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <span className="text-[14px] tracking-[0.02em] tabular-nums text-faint">
                    {formatStartAt(featured.startAt)} 开售
                  </span>
                </div>
              </div>
            </div>

            <a
              href="#featured-armory"
              aria-label="下滑查看精选军需"
              className="absolute bottom-[22px] left-1/2 z-[5] inline-flex -translate-x-1/2 flex-col items-center gap-[5px] px-3 py-1.5 text-faint transition-all hover:translate-y-[3px] hover:text-accent max-[860px]:bottom-[14px]"
            >
              <span className="block h-5 w-px bg-current opacity-75" aria-hidden="true" />
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true">
                <path
                  d="M1.5 1.5L7 6.5L12.5 1.5"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </>
        )}
      </section>

      <section
        id="featured-armory"
        aria-labelledby="featured-armory-title"
        className="flex min-h-[calc(100vh-64px)] scroll-mt-[64px] flex-col justify-center border-t border-line bg-ink-950 pb-[clamp(56px,7vh,80px)] pt-[clamp(44px,5.8vh,64px)] max-[860px]:min-h-0 max-[860px]:scroll-mt-[108px] max-[860px]:py-10 max-[860px]:pb-16"
      >
        <div className="mx-auto w-full max-w-[1360px] px-[clamp(20px,4vw,48px)]">
          <div className="mb-7 flex items-end justify-between gap-6 border-b border-line pb-3.5">
            <h2
              id="featured-armory-title"
              className="m-0 text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-foreground max-[860px]:text-[24px]"
            >
              精选军需
            </h2>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] font-medium text-muted transition-colors hover:text-accent"
            >
              <span>查看全部</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {products.state.status === 'loading' && <PageState variant="loading" />}
          {products.state.status === 'error' && (
            <PageState variant="error" message={products.state.message} onRetry={products.reload} />
          )}
          {products.state.status === 'ready' && featuredProducts.length === 0 && (
            <PageState variant="empty" />
          )}
          {products.state.status === 'ready' && featuredProducts.length > 0 && (
            <HomeAccordion products={featuredProducts} categoryNameById={categoryNameById} />
          )}
        </div>
      </section>

      {rest.length > 0 && (
        <section className="border-t border-line bg-ink-950 py-14" aria-label="即将开售">
          <div className="mx-auto w-full max-w-[1360px] px-[clamp(20px,4vw,48px)]">
            <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-line pb-3.5">
              <h2 className="m-0 text-[22px] font-bold tracking-[-0.01em] text-foreground">
                即将开售
              </h2>
              <span className="font-mono text-[13px] tabular-nums text-muted">
                {upcomingItems.length} 场
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
