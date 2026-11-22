import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/BrandMark'

interface PageStateProps {
  readonly variant: 'loading' | 'empty' | 'error'
  readonly message?: string
  readonly onRetry?: () => void
}

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
      <p className="text-[12px] text-danger">{message ?? '加载失败，请稍后重试'}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-danger text-danger hover:bg-danger/10 hover:text-danger"
        onClick={onRetry}
      >
        重试
      </Button>
    </div>
  )
}
