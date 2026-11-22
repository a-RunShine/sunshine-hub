import { Link } from 'react-router-dom'
import type { ProductKind, ProductSummary } from '@/api/catalog'
import { Price } from '@/components/Price'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { LimitedBadge } from '@/components/common/LimitedBadge'
import { cn } from '@/lib/utils'
import { silhouetteVariant } from './silhouette'

/** 形态闭集映射；契约枚举外的值不在这里兜底文案。 */
export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  VIRTUAL: '虚拟道具',
  PHYSICAL: '实体周边',
}

interface ProductCardProps {
  readonly product: ProductSummary
  /** 页面用已加载分类表按 categoryId 解析；解析不到则不传，卡片不显示兜底分类名。 */
  readonly categoryName?: string
  /**
   * - `tile`（默认）：R4-B 开放式上下细线展位（无左右封闭方框）
   * - `lead`：全宽 `16:7` 主打横幅展位，用于默认第 1 排首位推荐
   */
  readonly variant?: 'tile' | 'lead'
}

/**
 * 商品展位卡：名称、封面、最低价、限量斜杠标记；整卡跳商品详情。
 * 金额只把 `minPrice` 交给 Price 组件，卡片内不做分→元换算。
 */
export function ProductCard({ product, categoryName, variant = 'tile' }: ProductCardProps) {
  const kindLabel = PRODUCT_KIND_LABEL[product.kind]
  const metaText = categoryName ? `${kindLabel} · ${categoryName}` : kindLabel

  if (variant === 'lead') {
    return (
      <Link to={`/products/${product.id}`} className="group block min-w-0">
        <article className="relative grid min-h-[340px] grid-cols-1 items-center gap-6 overflow-hidden border-y border-line bg-[#111513] px-7 py-8 transition-colors hover:border-t-accent/70 md:grid-cols-[minmax(0,440px)_1fr] md:px-10 md:py-9">
          <DiagonalSurface variant="band" />

          <div className="relative z-[2] flex flex-col items-start">
            <div className="mb-3 flex flex-wrap items-center gap-2.5 text-[12px] text-muted">
              {product.limited ? (
                <LimitedBadge limited variant="slash" />
              ) : (
                <span className="font-semibold tracking-[0.04em] text-accent">主打</span>
              )}
              <span>· {metaText}</span>
            </div>

            <h2 className="m-0 text-[32px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground max-[860px]:text-[26px]">
              {product.name}
            </h2>
            <p className="mt-2.5 text-[14px] text-muted">{kindLabel}，点击查看完整规格与在售场次</p>

            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Price cents={product.minPrice} variant="hero" />
              <span className="chamfer-cta inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-[14px] font-bold tracking-[0.03em] text-ink-950 transition-all group-hover:bg-[#f6c84f]">
                <span>查看商品详情</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </div>

          <div className="relative z-[2] flex h-[240px] items-center justify-center md:h-[268px]">
            {product.coverUrl ? (
              <img
                src={product.coverUrl}
                alt={product.name}
                className={
                  product.kind === 'VIRTUAL'
                    ? 'max-h-[250px] w-auto max-w-[94%] -rotate-3 object-contain drop-shadow-[0_24px_32px_rgba(0,0,0,0.72)] transition-transform duration-300 group-hover:scale-[1.03]'
                    : 'studio-mask max-h-[245px] w-auto max-w-[92%] object-contain transition-transform duration-300 group-hover:scale-[1.03]'
                }
              />
            ) : (
              <CoverSilhouette variant={silhouetteVariant(product)} className="h-[112px] w-auto text-[#4f5954]" />
            )}
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link to={`/products/${product.id}`} className="group block min-w-0">
      <article className="relative flex min-h-[296px] flex-col justify-between overflow-hidden border-y border-line bg-[#131715] px-6 py-5 transition-colors group-hover:border-t-accent">
        <DiagonalSurface variant="card" />

        <div className="relative z-[2] flex min-h-[20px] items-center justify-between gap-2 text-[12px] text-muted">
          <span className="truncate">{metaText}</span>
          <LimitedBadge limited={product.limited} variant="slash" className="shrink-0" />
        </div>

        <div className="relative z-[2] my-3 flex h-[168px] items-center justify-center">
          {product.coverUrl ? (
            <img
              src={product.coverUrl}
              alt={product.name}
              className={
                product.kind === 'VIRTUAL'
                  ? 'max-h-[156px] w-auto max-w-[88%] -rotate-2 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.76)] transition-transform duration-300 group-hover:scale-[1.035]'
                  : 'studio-mask max-h-[156px] w-auto max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.035]'
              }
            />
          ) : (
            <CoverSilhouette variant={silhouetteVariant(product)} />
          )}
        </div>

        <div className="relative z-[2] flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-semibold tracking-[-0.01em] text-foreground">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate text-[12px] text-muted">{kindLabel}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className={cn('text-[18px] font-bold leading-none tabular-nums')}>
              <Price cents={product.minPrice} variant="compact" />
            </div>
            <span className="mt-1.5 inline-flex items-center gap-1 border-b border-line pb-0.5 text-[12px] text-muted transition-colors group-hover:border-accent group-hover:text-accent">
              查看详情 →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
