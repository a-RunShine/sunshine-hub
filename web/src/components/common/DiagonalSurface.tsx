import { cn } from '@/lib/utils'

type DiagonalVariant = 'hero' | 'card' | 'accordion' | 'band'

interface DiagonalSurfaceProps {
  /** 几何斜切场景变体，统一管控多处展台的斜切暗面与 1px 基准线角度。 */
  readonly variant: DiagonalVariant
  /** 是否叠加 SVG 1px `#252b28` 斜切线；开放陈列窄带可按需关闭。 */
  readonly showSeam?: boolean
  readonly className?: string
}

const PLANE_CLASS_BY_VARIANT: Record<DiagonalVariant, string> = {
  hero: 'hero-diagonal-plane',
  card: 'card-facet',
  accordion: 'acc-facet',
  band: 'band-diagonal-plane',
}

const DESKTOP_SEAM_COORDS: Record<DiagonalVariant, { x1: number; x2: number }> = {
  hero: { x1: 59, x2: 39 },
  card: { x1: 48, x2: 24 },
  accordion: { x1: 45, x2: 26 },
  band: { x1: 46, x2: 36 },
}

/**
 * 统一斜切暗面几何基底：集中渲染方向 C 的暗绿黑斜切面与 1px 发丝级分割线，
 * 避免在首页、手风琴、商品展台与活动条之间重复内联 `<svg>` 斜线坐标。
 */
export function DiagonalSurface({ variant, showSeam = true, className }: DiagonalSurfaceProps) {
  const coords = DESKTOP_SEAM_COORDS[variant]

  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          PLANE_CLASS_BY_VARIANT[variant],
          className,
        )}
        aria-hidden="true"
      />
      {showSeam && variant === 'hero' && (
        <>
          <svg
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full max-[860px]:hidden"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1={coords.x1}
              y1="0"
              x2={coords.x2}
              y2="100"
              stroke="#252b28"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <svg
            className="pointer-events-none absolute inset-0 z-[2] hidden h-full w-full max-[860px]:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="68"
              y1="0"
              x2="16"
              y2="100"
              stroke="#252b28"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      )}
      {showSeam && variant !== 'hero' && (
        <svg
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] h-full w-full',
            variant === 'accordion' && 'max-[860px]:hidden',
          )}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1={coords.x1}
            y1="0"
            x2={coords.x2}
            y2="100"
            stroke="#252b28"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </>
  )
}
