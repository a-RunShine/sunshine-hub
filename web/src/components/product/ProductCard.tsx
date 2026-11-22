import { Link } from 'react-router-dom'
import type { ProductSummary } from '@/api/catalog'
import { Price } from '@/components/Price'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { LimitedBadge } from '@/components/common/LimitedBadge'
import { ProductCover } from './ProductCover'
import { ProductKindMark } from './ProductKindMark'

interface ProductCardProps {
  readonly product: ProductSummary
  /**
   * - `tile`（默认）：开放式上下细线展位（左上形态标、右上限量标、左下商品名、右下骨白主价）
   * - `lead`：全宽 `16:7` 主打横幅展位，用于默认第 1 排首位推荐
   */
  readonly variant?: 'tile' | 'lead'
}

/**
 * 商品展位卡：左上角使用「虚拟/实体」形态图标，右上角使用菱形限量图标，
 * 去掉货架分类文字复读，突出商品名与骨白价格；整卡点击进入详情。
 */
export function ProductCard({ product, variant = 'tile' }: ProductCardProps) {
  if (variant === 'lead') {
    return (
      <Link to={`/products/${product.id}`} className="group block min-w-0">
        <article className="relative grid min-h-[340px] grid-cols-1 items-center gap-6 overflow-hidden border-y border-line bg-[#111513] px-7 py-8 transition-colors hover:border-t-accent/75 md:grid-cols-[minmax(0,460px)_1fr] md:px-10 md:py-9">
          <DiagonalSurface variant="band" />

          <div className="relative z-[2] flex flex-col items-start">
            <div className="mb-3.5 flex flex-wrap items-center gap-3">
              <ProductKindMark kind={product.kind} />
              <LimitedBadge limited={product.limited} />
            </div>

            <h2 className="m-0 text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground max-[860px]:text-[28px]">
              {product.name}
            </h2>

            <div className="mt-7 flex flex-wrap items-center gap-6">
              <Price cents={product.minPrice} variant="hero" />
              <span className="chamfer-cta inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-[14px] font-bold tracking-[0.03em] text-ink-950 transition-all group-hover:bg-[#f6c84f]">
                <span>查看商品详情</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </div>

          <div className="relative z-[2] flex h-[240px] items-center justify-center md:h-[268px]">
            <ProductCover product={product} placement="lead" />
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link to={`/products/${product.id}`} className="group block min-w-0">
      <article className="relative flex min-h-[296px] flex-col justify-between overflow-hidden border-y border-line bg-[#131715] px-6 py-5 transition-colors group-hover:border-t-accent">
        <DiagonalSurface variant="card" />

        <div className="relative z-[2] flex min-h-[24px] items-center justify-between gap-2">
          <ProductKindMark kind={product.kind} />
          <LimitedBadge limited={product.limited} className="shrink-0" />
        </div>

        <div className="relative z-[2] my-3 flex h-[172px] items-center justify-center">
          <ProductCover product={product} placement="tile" />
        </div>

        <div className="relative z-[2] flex items-baseline justify-between gap-4 pt-1">
          <h3 className="min-w-0 truncate text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] text-foreground transition-colors group-hover:text-accent max-[860px]:text-[18px]">
            {product.name}
          </h3>
          <div className="shrink-0">
            <Price cents={product.minPrice} variant="default" />
          </div>
        </div>
      </article>
    </Link>
  )
}
