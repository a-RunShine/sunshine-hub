import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '@/api/catalog'
import { getUpcomingCampaigns } from '@/api/campaign'
import type { components } from '@/types/api'
import { ProductCard } from '@/components/product/ProductCard'
import {
  CampaignCard,
  campaignTypeLabel,
  formatStartAt,
} from '@/components/campaign/CampaignCard'
import { PageState } from '@/components/common/PageState'
import { BrandMark } from '@/components/BrandMark'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useResource } from './useResource'
import { HomeCountdown } from './HomeCountdown'

type Category = components['schemas']['Category']

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[30px] items-center gap-2 whitespace-nowrap px-3 text-[12px] transition-colors',
        active
          ? 'border border-line-2 bg-ink-900 text-foreground'
          : 'text-muted hover:text-foreground',
      )}
    >
      {active && <span className="h-1.5 w-1.5 bg-accent" />}
      {children}
    </button>
  )
}

/**
 * 商城首页：分类筛选 + 商品网格 + 即将开售区块。
 * 三个请求各自独立管理状态；选中分类是页面内状态，刷新即丢，不进全局 store。
 */
export default function HomePage() {
  const categories = useResource<Category[]>(() => getCategories(), [])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const products = useResource(
    () => getProducts({ categoryId: selectedCategoryId }),
    [selectedCategoryId],
  )
  const upcoming = useResource(() => getUpcomingCampaigns(), [])

  const categoryNameById = new Map(
    categories.state.status === 'ready'
      ? categories.state.data.map((category) => [category.id, category.name] as const)
      : [],
  )

  const upcomingItems = upcoming.state.status === 'ready' ? upcoming.state.data.items : []
  const featured = upcomingItems[0] ?? null
  const rest = upcomingItems.slice(1)

  return (
    <div>
      <div className="flex items-center justify-between py-3 font-mono text-[11px] tracking-[.12em] text-faint">
        <span>
          SUPPLY LINE // 01 <span className="text-accent">补给链正常</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#65c46b]" />
          SERVER ONLINE
        </span>
      </div>

      <section className="mt-4 grid grid-cols-[1.55fr_.82fr] gap-4">
        {upcoming.state.status === 'loading' && (
          <div className="col-span-2">
            <PageState variant="loading" />
          </div>
        )}
        {upcoming.state.status === 'error' && (
          <div className="col-span-2">
            <PageState variant="error" message={upcoming.state.message} onRetry={upcoming.reload} />
          </div>
        )}
        {upcoming.state.status === 'ready' && featured === null && (
          <div className="col-span-2">
            <PageState variant="empty" />
          </div>
        )}

        {featured && (
          <>
            <div className="relative min-h-[320px] overflow-hidden rounded-lg bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-accent" />
              <div className="relative z-10 w-1/2 p-7">
                <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[.14em] text-accent">
                  <span className="h-px w-[22px] bg-accent" />
                  下一场空投 / 限量首发
                </div>
                <h1 className="mt-4 text-[38px] font-semibold leading-[1.14] tracking-[.01em] text-foreground">
                  {featured.name}
                </h1>
                <p className="mt-3 max-w-[310px] text-[12px] leading-[1.9] text-muted">
                  本场关联商品：{featured.productName}。开售后按付款顺序锁定库存。
                </p>
                <div className="mt-6">
                  <Link to={`/campaigns/${featured.id}`} className={buttonVariants({ variant: 'default' })}>
                    查看场次 <span className="font-mono text-[11px]">→</span>
                  </Link>
                </div>
              </div>
              <img
                src="/assets/rifle-trim.png"
                alt=""
                className="absolute bottom-6 right-0 w-[56%] max-h-[calc(100%-24px)] object-contain"
              />
            </div>

            <aside className="flex min-h-[320px] flex-col justify-between rounded-lg bg-ink-900 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <BrandMark size={14} className="text-accent" />
                  <span className="font-mono text-[11px] tracking-[.14em] text-muted">
                    NEXT DROP / T-MINUS
                  </span>
                </div>
                <h2 className="mt-3 text-[15px] font-medium text-foreground">{featured.name}</h2>
                <p className="mt-1 font-mono text-[11px] text-faint">
                  {campaignTypeLabel(featured.type)} · {formatStartAt(featured.startAt)} 开售
                </p>
                <HomeCountdown target={featured.startAt} />
              </div>
              <Link to={`/campaigns/${featured.id}`} className={buttonVariants({ variant: 'outline' })}>
                预约提醒 / RESERVE
              </Link>
            </aside>
          </>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-foreground">即将开售</h2>
            <span className="font-mono text-[11px] text-faint">{upcomingItems.length} ITEMS</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {rest.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        {categories.state.status === 'loading' && <PageState variant="loading" />}
        {categories.state.status === 'error' && (
          <PageState variant="error" message={categories.state.message} onRetry={categories.reload} />
        )}
        {categories.state.status === 'ready' && categories.state.data.length === 0 && (
          <PageState variant="empty" />
        )}
        {categories.state.status === 'ready' && categories.state.data.length > 0 && (
          <div className="flex items-center gap-2">
            <FilterChip active={selectedCategoryId === undefined} onClick={() => setSelectedCategoryId(undefined)}>
              全部
            </FilterChip>
            {categories.state.data.map((category) => (
              <FilterChip
                key={category.id}
                active={selectedCategoryId === category.id}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                {category.name}
              </FilterChip>
            ))}
            <span className="ml-auto font-mono text-[11px] text-faint">
              {products.state.status === 'ready' ? `${products.state.data.length} ITEMS` : ''}
            </span>
          </div>
        )}
      </section>

      <section className="mt-4">
        {products.state.status === 'loading' && <PageState variant="loading" />}
        {products.state.status === 'error' && (
          <PageState variant="error" message={products.state.message} onRetry={products.reload} />
        )}
        {products.state.status === 'ready' && products.state.data.length === 0 && (
          <PageState variant="empty" />
        )}
        {products.state.status === 'ready' && products.state.data.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {products.state.data.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={categoryNameById.get(product.categoryId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
