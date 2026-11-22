import { Link } from 'react-router-dom'
import type { ProductKind, ProductSummary } from '@/api/catalog'
import { Price } from '@/components/Price'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { LimitedBadge } from '@/components/common/LimitedBadge'
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
   * - `tile`（默认）：开放式上下细线展位（左上分类标、右上限量标、左下商品名、右下骨白主价）
   * - `lead`：全宽 `16:7` 主打横幅展位，用于默认第 1 排首位推荐
   */
  readonly variant?: 'tile' | 'lead'
}

/**
 * 商品展位卡：去除重复形态小字与多余详情文字，放大商品名与骨白价格并突出「限量」菱形徽标；
 * 整卡可点击进入商品详情页。金额只交给 Price 组件处理分转元。
 */
export function ProductCard({ product, categoryName, variant = 'tile' }: ProductCardProps) {
  const kindLabel = PRODUCT_KIND_LABEL[product.kind]
  const metaText = categoryName ? `${kindLabel} · ${categoryName}` : kindLabel

  if (variant === 'lead') {
    return (
      <Link to={`/products/${product.id}`} className="group block min-w-0">
        <article className="relative grid min-h-[340px] grid-cols-1 items-center gap-6 overflow-hidden border-y border-line bg-[#111513] px-7 py-8 transition-colors hover:border-t-accent/75 md:grid-cols-[minmax(0,460px)_1fr] md:px-10 md:py-9">
          <DiagonalSurface variant="band" />

          <div className="relative z-[2] flex flex-col items-start">
            <div className="mb-3.5 flex flex-wrap items-center gap-2.5 text-[13px] font-medium text-[#c4cac6]">
              <LimitedBadge limited={product.limited} />
              <span>{metaText}</span>
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

        <div className="relative z-[2] flex min-h-[24px] items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-[#c4cac6]">{metaText}</span>
          <LimitedBadge limited={product.limited} className="shrink-0" />
        </div>

        <div className="relative z-[2] my-3 flex h-[172px] items-center justify-center">
          {product.coverUrl ? (
            <img
              src={product.coverUrl}
              alt={product.name}
              className={
                product.kind === 'VIRTUAL'
                  ? 'max-h-[158px] w-auto max-w-[88%] -rotate-2 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.76)] transition-transform duration-300 group-hover:scale-[1.035]'
                  : 'studio-mask max-h-[158px] w-auto max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.035]'
              }
            />
          ) : (
            <CoverSilhouette variant={silhouetteVariant(product)} />
          )}
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
