import { cn } from '@/lib/utils'

type DiagonalVariant = 'hero' | 'card' | 'accordion' | 'band'

interface DiagonalSurfaceProps {
  readonly variant: DiagonalVariant
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

function DiagonalSeamLine({
  x1,
  x2,
  className,
}: {
  readonly x1: number
  readonly x2: number
  readonly className?: string
}) {
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        x1={x1}
        y1="0"
        x2={x2}
        y2="100"
        stroke="#252b28"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

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
          <DiagonalSeamLine x1={coords.x1} x2={coords.x2} className="z-[2] max-[860px]:hidden" />
          <DiagonalSeamLine x1={68} x2={16} className="z-[2] hidden max-[860px]:block" />
        </>
      )}
      {showSeam && variant !== 'hero' && (
        <DiagonalSeamLine
          x1={coords.x1}
          x2={coords.x2}
          className={cn('z-[1]', variant === 'accordion' && 'max-[860px]:hidden')}
        />
      )}
    </>
  )
}
