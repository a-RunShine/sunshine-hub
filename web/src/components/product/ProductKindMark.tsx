import type { ProductKind } from '@/api/catalog'
import { cn } from '@/lib/utils'

/** 商品形态闭集映射（全站唯一数据源）；契约枚举外的值不做兜底文案。 */
export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  VIRTUAL: '虚拟道具',
  PHYSICAL: '实体周边',
}

interface ProductKindMarkProps {
  /** 商品形态闭集（虚拟道具 / 实体周边），对应两套固定交付路径。 */
  readonly kind: ProductKind
  readonly className?: string
}

function VirtualChipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#9fc5b4]">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.35" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" />
      <path d="M6 1.5V3.5M10 1.5V3.5M6 12.5V14.5M10 12.5V14.5M1.5 6H3.5M1.5 10H3.5M12.5 6H14.5M12.5 10H14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function PhysicalCrateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#d8cfc0]">
      <path
        d="M8 1.5L13.75 4.8V11.2L8 14.5L2.25 11.2V4.8L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M2.5 4.9L8 8L13.5 4.9M8 8V14.2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * 商品形态识别角标（闭集二选一）：
 * 用数字芯片标与立体货箱标分别区分「虚拟道具（支付即入库）」和「实体周边（需走履约发货）」；
 * 不渲染可变的货架分类名（如武器皮肤 / 手办 / 服饰），避免每张卡片左上角文字复读。
 */
export function ProductKindMark({ kind, className }: ProductKindMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[0.02em] text-[#c4cac6]',
        className,
      )}
    >
      {kind === 'VIRTUAL' ? <VirtualChipIcon /> : <PhysicalCrateIcon />}
      <span>{PRODUCT_KIND_LABEL[kind]}</span>
    </span>
  )
}
