import { Link } from 'react-router-dom'
import type { components } from '@/types/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Price } from '@/components/Price'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
import { silhouetteVariant } from './silhouette'

type ProductSummary = components['schemas']['ProductSummary']

/** 形态闭集映射；契约枚举外的值不在这里兜底文案。 */
const KIND_LABEL: Record<ProductSummary['kind'], string> = {
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
 * 卡片配色与描边是项目定制，写在外层；ui/ 基础件保持官方源码。
 */
export function ProductCard({ product, categoryName }: ProductCardProps) {
  const code = `P-${String(product.id).padStart(2, '0')}`
  const kindLabel = KIND_LABEL[product.kind]

  return (
    <Link to={`/products/${product.id}`} className="group block min-w-0">
      <Card className="overflow-hidden rounded-lg border border-line bg-ink-900 shadow-none transition-colors group-hover:border-line-2">
        <div className="relative h-[156px] overflow-hidden bg-ink-800">
          {product.coverUrl ? (
            <img
              src={product.coverUrl}
              alt={product.name}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <div className="flex h-full items-center justify-center pt-5">
              <CoverSilhouette variant={silhouetteVariant(product)} />
            </div>
          )}
          <span className="absolute bottom-2 right-3 font-mono text-[11px] tracking-widest text-faint">
            {code}
          </span>
        </div>
        <div className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-faint">
              {categoryName ?? kindLabel}
            </span>
            <Badge variant={product.limited ? 'default' : 'outline'} className={product.limited ? undefined : 'border-line text-faint'}>
              {product.limited ? '限量' : '常规'}
            </Badge>
          </div>
          <h3 className="mt-2 truncate text-[14px] font-medium text-foreground">{product.name}</h3>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <Price cents={product.minPrice} />
            <span className="text-[11px] text-faint">{kindLabel}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
