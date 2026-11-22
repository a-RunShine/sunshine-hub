import { Link } from 'react-router-dom'
import type { ProductKind, ProductSummary } from '@/api/catalog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Price } from '@/components/Price'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
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
}

/**
 * 商品卡：名称、封面、最低价、限量标记；整卡跳商品详情。
 * 金额只把 `minPrice` 交给 Price 组件，卡片内不做分→元换算。
 * 强调色只留给可操作控件与限量属性的低噪描边；常规商品不贴标。
 * 卡片配色与描边是项目定制，写在外层；ui/ 基础件保持官方源码。
 */
export function ProductCard({ product, categoryName }: ProductCardProps) {
  const kindLabel = PRODUCT_KIND_LABEL[product.kind]

  return (
    <Link to={`/products/${product.id}`} className="group block min-w-0">
      <Card className="overflow-hidden rounded-[2px] border border-line bg-ink-900 shadow-none transition-colors group-hover:border-line-2">
        <div className="relative h-[196px] overflow-hidden bg-ink-900">
          <div className="card-facet z-0" aria-hidden="true" />
          <svg
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="48"
              y1="0"
              x2="24"
              y2="100"
              stroke="#252b28"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {product.coverUrl ? (
            <img
              src={product.coverUrl}
              alt={product.name}
              className={
                product.kind === 'VIRTUAL'
                  ? 'relative z-[2] h-full w-full -rotate-2 object-contain p-5 drop-shadow-[0_18px_24px_rgba(0,0,0,0.78)] transition-transform duration-300 group-hover:scale-[1.03]'
                  : 'studio-mask relative z-[2] h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]'
              }
            />
          ) : (
            <div className="relative z-[2] flex h-full items-center justify-center pt-5">
              <CoverSilhouette variant={silhouetteVariant(product)} />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex min-h-[22px] items-center justify-between gap-2">
            <span className="truncate text-[12px] text-muted">{categoryName ?? kindLabel}</span>
            {product.limited && (
              <Badge
                variant="outline"
                className="rounded-[2px] border-accent/45 bg-accent/[0.08] text-[12px] font-semibold text-accent"
              >
                限量
              </Badge>
            )}
          </div>
          <h3 className="mt-2.5 truncate text-[15px] font-semibold text-foreground">{product.name}</h3>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <Price cents={product.minPrice} />
            <span className="text-[12px] text-muted">{kindLabel}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
