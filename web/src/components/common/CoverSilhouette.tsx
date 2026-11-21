import { Package, Shirt } from 'lucide-react'

export type SilhouetteVariant = 'weapon' | 'figure' | 'shirt' | 'box'

/**
 * 封面统一剪影占位：同一线宽、同一填充色、同一构图位置，只换剪影轮廓。
 * 不再使用圆环 / 斜切 / 火焰 / 六边形等不同几何占位；coverUrl 有值时由卡片自己放图。
 */
export function CoverSilhouette({ variant, className }: { variant: SilhouetteVariant; className?: string }) {
  if (variant === 'shirt') {
    return <Shirt className={className} strokeWidth={1.5} />
  }
  if (variant === 'box') {
    return <Package className={className} strokeWidth={1.5} />
  }
  if (variant === 'figure') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19c1.3-3.4 3.7-5.2 6.5-5.2s5.2 1.8 6.5 5.2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 12h29" />
      <path d="M38 12h7" />
      <path d="M9 8.5H4v7h5" />
      <path d="M17 8.5V5.5h10v3" />
      <path d="M21 12v5.5" />
      <path d="M13 12v4.5" />
    </svg>
  )
}
