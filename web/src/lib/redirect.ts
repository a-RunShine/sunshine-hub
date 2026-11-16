interface LocationLike {
  pathname: string
  search: string
}

/**
 * 构造带 next 回跳参数的登录页地址。
 * 401 拦截器和路由守卫都要用，别各写一遍编码逻辑。
 */
export function buildLoginUrl(location: LocationLike): string {
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`
}
