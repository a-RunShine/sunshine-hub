interface BrandMarkProps {
  /** 记号边长（px），默认 16。 */
  readonly size?: number
  readonly className?: string
}

/**
 * 日出 / 光圈品牌记号：外圈光圈 + 地平线 + 半轮日出。
 * 纯 SVG 不携带文案；复用于导航品牌位、倒计时侧栏头部、空状态三处。
 */
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
