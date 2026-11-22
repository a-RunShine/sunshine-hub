interface BrandMarkProps {
  readonly size?: number
  readonly className?: string
}

export function BrandMark({ size = 16, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
      <path d="M3.5 11.5h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6.6 11.5a3.4 3.4 0 0 1 6.8 0Z" fill="currentColor" />
    </svg>
  )
}
