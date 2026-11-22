import type { components } from '@/types/api'
import type { SilhouetteVariant } from '@/components/common/CoverSilhouette'

type ProductSummary = components['schemas']['ProductSummary']

/**
 * 占位美术映射：categoryId → 封面剪影。
 * 这里只是 coverUrl 为空时的占位轮廓选择；coverUrl 有值时卡片应优先放图，
 * 剪影不按分类展示名硬编码（ADR-0014）。新增分类在这张表补一行即可。
 */
const SILHOUETTE_BY_CATEGORY: Readonly<Record<number, SilhouetteVariant>> = {
  1: 'weapon',
  2: 'figure',
  3: 'box',
  4: 'figure',
  5: 'shirt',
}

/** 映射落空时按形态兜底：虚拟道具枪形，实体周边盒形。 */
export function silhouetteVariant(product: ProductSummary): SilhouetteVariant {
  return (
    SILHOUETTE_BY_CATEGORY[product.categoryId] ??
    (product.kind === 'VIRTUAL' ? 'weapon' : 'box')
  )
}
