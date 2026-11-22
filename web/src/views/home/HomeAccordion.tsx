import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ProductSummary } from '@/api/catalog'
import { Price, formatPrice } from '@/components/Price'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { LimitedBadge } from '@/components/common/LimitedBadge'
import { PRODUCT_KIND_LABEL } from '@/components/product/ProductCard'
import { silhouetteVariant } from '@/components/product/silhouette'
import { pad2 } from '@/lib/format'
import { cn } from '@/lib/utils'

interface HomeAccordionProps {
  /** 首页精选展陈商品（最多 5 件）。 */
  readonly products: readonly ProductSummary[]
  /** 由页面拉取分类接口后按 categoryId 解析；未加载时不阻塞展陈，退回形态标签。 */
  readonly categoryNameById: ReadonlyMap<number, string>
}

/**
 * 方向 C-2 精选军需水平手风琴展柜：
 * - 桌面端阻尼 flex 切换，70ms hover 防抖；收起态为 vertical-rl 竖排导轨；
 * - <= 860px 自动退回竖向折叠展开；支持键盘方向键与 Enter/Space 操作。
 */
export function HomeAccordion({ products, categoryNameById }: HomeAccordionProps) {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const sliceRefs = useRef<Array<HTMLElement | null>>([])

  const activeId =
    selectedId !== null && products.some((item) => item.id === selectedId)
      ? selectedId
      : (products[0]?.id ?? null)

  function clearHoverTimer() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  useEffect(() => () => clearHoverTimer(), [])

  if (products.length === 0) return null

  const isSingle = products.length === 1

  return (
    <div
      className={cn('acc-stage-wrap', isSingle && 'mx-auto max-w-[860px]')}
      aria-label="精选军需水平手风琴展柜"
      onPointerLeave={clearHoverTimer}
    >
      {products.map((product, index) => {
        const isExpanded = product.id === activeId
        const indexLabel = pad2(index + 1)
        const kindLabel = PRODUCT_KIND_LABEL[product.kind]
        const categoryName = categoryNameById.get(product.categoryId)
        const metaText = categoryName ? `${categoryName} · ${kindLabel}` : kindLabel
        const badgeLabel = product.limited ? '限量' : '常规'
        const detailPath = `/products/${product.id}`

        return (
          <article
            key={product.id}
            ref={(el) => {
              sliceRefs.current[index] = el
            }}
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-label={`${indexLabel} ${product.name}，${categoryName ?? kindLabel}，${badgeLabel}，${formatPrice(product.minPrice)} 起`}
            className={cn(
              'acc-slice group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              isExpanded && 'is-expanded',
            )}
            onPointerEnter={(event) => {
              if (event.pointerType === 'touch') return
              if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 860px)').matches) return
              clearHoverTimer()
              if (isExpanded) return
              hoverTimerRef.current = window.setTimeout(() => {
                setSelectedId(product.id)
              }, 70)
            }}
            onPointerLeave={clearHoverTimer}
            onClick={() => {
              clearHoverTimer()
              if (!isExpanded) {
                setSelectedId(product.id)
                return
              }
              navigate(detailPath)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                const nextIndex = (index + 1) % products.length
                setSelectedId(products[nextIndex].id)
                sliceRefs.current[nextIndex]?.focus()
                return
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                const prevIndex = (index - 1 + products.length) % products.length
                setSelectedId(products[prevIndex].id)
                sliceRefs.current[prevIndex]?.focus()
                return
              }
              if (event.key === 'Enter' || event.key === ' ') {
                if ((event.target as HTMLElement).closest('a')) return
                event.preventDefault()
                if (!isExpanded) {
                  setSelectedId(product.id)
                } else {
                  navigate(detailPath)
                }
              }
            }}
          >
            <div className="acc-expanded">
              <DiagonalSurface variant="accordion" className="z-0" />
              <span
                className="pointer-events-none absolute left-[26px] top-[18px] z-[1] select-none font-mono text-[132px] font-extrabold leading-[0.88] tracking-[-0.04em] text-[#f3efe6]/[0.06] max-[860px]:left-[18px] max-[860px]:top-[14px] max-[860px]:text-[84px]"
                aria-hidden="true"
              >
                {indexLabel}
              </span>

              <div className="pointer-events-none absolute inset-x-[28px] bottom-[108px] top-[18px] z-[2] flex items-center justify-center max-[860px]:inset-x-[18px] max-[860px]:bottom-[142px] max-[860px]:top-[14px]">
                {product.coverUrl ? (
                  <img
                    src={product.coverUrl}
                    alt={product.name}
                    className={
                      product.kind === 'VIRTUAL'
                        ? 'block max-h-[365px] w-[min(88%,620px)] -rotate-2 select-none object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.82)] transition-transform duration-300 ease-out group-hover:scale-[1.025] max-[860px]:max-h-[210px] max-[860px]:w-[min(92%,340px)]'
                        : 'studio-mask block aspect-[800/500] h-auto max-h-full w-auto max-w-[min(94%,640px)] select-none object-contain transition-transform duration-300 ease-out group-hover:scale-[1.025] max-[860px]:max-w-[min(96%,354px)]'
                    }
                  />
                ) : (
                  <CoverSilhouette
                    variant={silhouetteVariant(product)}
                    className="h-[112px] w-auto text-[#4f5954]"
                  />
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-5 bg-gradient-to-t from-[#0c0e0d]/[0.92] via-[#131615]/[0.68] via-55% to-transparent px-[28px] pb-[26px] pt-[48px] max-[860px]:flex-col max-[860px]:items-start max-[860px]:gap-3.5 max-[860px]:px-[18px] max-[860px]:pb-[18px] max-[860px]:pt-8">
                <div className="min-w-0 max-[860px]:w-full">
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="text-[13px] tracking-[0.02em] text-faint">{metaText}</span>
                    <LimitedBadge limited={product.limited} variant="pill" />
                  </div>
                  <h3 className="m-0 truncate text-[26px] font-bold leading-[1.2] tracking-[-0.01em] text-foreground max-[860px]:whitespace-normal max-[860px]:text-[22px]">
                    {product.name}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-5 max-[860px]:w-full max-[860px]:justify-between">
                  <Price cents={product.minPrice} variant="hero" />
                  <Link
                    to={detailPath}
                    tabIndex={isExpanded ? 0 : -1}
                    onClick={(event) => event.stopPropagation()}
                    className="chamfer-cta inline-flex shrink-0 items-center gap-2 whitespace-nowrap bg-accent px-5 py-[11px] text-[14px] font-bold leading-[1.2] tracking-[0.03em] text-ink-950 transition-colors hover:bg-[#f6c84f]"
                  >
                    <span>查看详情</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="acc-rail" aria-hidden="true">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[13px] font-semibold leading-none tracking-[0.06em] text-muted">
                  {indexLabel}
                </span>
                <LimitedBadge limited={product.limited} variant="compact" />
              </div>
              <span className="acc-rail-title text-[15px] font-semibold leading-[1.4] tracking-[0.14em] text-faint transition-colors group-hover:text-foreground">
                {product.name}
              </span>
              <Price cents={product.minPrice} variant="compact" />
            </div>
          </article>
        )
      })}
    </div>
  )
}
