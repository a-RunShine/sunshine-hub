import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/BrandMark'

interface PageStateProps {
  readonly variant: 'loading' | 'empty' | 'error'
  /** 错误态展示的服务端 / 兜底文案，由 api/errors 的 errorMessage 映射后传入。 */
  readonly message?: string
  /** 错误态重试回调；重新拉取对应请求。 */
  readonly onRetry?: () => void
}

/**
 * 区块三态外壳：加载 / 空 / 错误可重试。
 * 商品网格、分类筛选行、即将开售区块三处独立复用；不做 showXxx 布尔开关。
 */
export function PageState({ variant, message, onRetry }: PageStateProps) {
  if (variant === 'loading') {
    return (
      <div className="flex items-center justify-center px-4 py-10 text-[12px] text-muted">
        正在加载…
      </div>
    )
  }

  if (variant === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
        <BrandMark size={28} className="text-accent" />
        <p className="text-[12px] text-muted">暂时没有内容，稍后再来看看</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <p className="text-[12px] text-muted">{message ?? '加载失败，请稍后重试'}</p>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  )
}
