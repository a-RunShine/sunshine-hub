import type { ProductSummary } from '@/api/catalog'
import type { SilhouetteVariant } from '@/components/common/CoverSilhouette'

export function silhouetteVariant(product: ProductSummary): SilhouetteVariant {
  return product.kind === 'VIRTUAL' ? 'weapon' : 'box'
}
