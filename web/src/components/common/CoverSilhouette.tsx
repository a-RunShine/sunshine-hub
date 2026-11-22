import { Package, Shirt } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SilhouetteVariant = 'weapon' | 'figure' | 'shirt' | 'box'

/**
 * 封面统一剪影占位：同一尺寸（高 64px）、同一填充色、同一居中偏上构图，只换轮廓。
 * 武器为半实心步枪侧影（枪托 / 机匣 / 弹匣 / 护木枪管），不用细线硬画细节；
 * coverUrl 有值时由卡片自己放图。
 */
const SILHOUETTE_CLASS = 'h-[64px] w-auto text-[#4f5954]'

export function CoverSilhouette({ variant, className }: { variant: SilhouetteVariant; className?: string }) {
  if (variant === 'shirt') {
    return <Shirt className={cn(SILHOUETTE_CLASS, className)} strokeWidth={2} />
  }
  if (variant === 'box') {
    return <Package className={cn(SILHOUETTE_CLASS, className)} strokeWidth={2} />
  }
  if (variant === 'figure') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn(SILHOUETTE_CLASS, className)}>
        <circle cx="12" cy="7" r="3.2" />
        <path d="M5 21c1.1-5.2 3.6-7.8 7-7.8s5.9 2.6 7 7.8Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 64 22" fill="currentColor" aria-hidden="true" className={cn('h-[64px] w-[206px] text-[#4f5954]', className)}>
      {/* 枪托 + 机匣 + 握把 + 弹匣 + 护木枪管 */}
      <path d="M2 8.2 5.2 16 11 16 11 12 13.2 12 12.6 18.2 15.6 18.2 17 12 22 12 23 19.2 26.2 19.2 27.2 12 33 12 33 10.6 61 10.6 61 8.4 33 8.4 33 7 11 7 11 8.2Z" />
      {/* 后瞄具 */}
      <path d="M20 7 20 5h6l.2 2Z" />
      {/* 前准星 */}
      <path d="M38.8 8.4 39 5.6l2.4.2-.2 2.6Z" />
    </svg>
  )
}
