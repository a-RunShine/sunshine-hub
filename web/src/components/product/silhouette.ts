import type { ProductSummary } from '@/api/catalog'
import type { SilhouetteVariant } from '@/components/common/CoverSilhouette'

/**
 * 无封面兜底剪影：仅依据闭集商品形态（VIRTUAL / PHYSICAL）选轮廓，
 * 遵循 ADR-0014 不按可变的 categoryId 硬编码图标或样式。
 */
export function silhouetteVariant(product: ProductSummary): SilhouetteVariant {
  return product.kind === 'VIRTUAL' ? 'weapon' : 'box'
}
