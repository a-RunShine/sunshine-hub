interface LocationLike {
  pathname: string
  search: string
}

const DEFAULT_NEXT_PATH = '/'
const AUTH_PATHS = new Set(['/login', '/register'])

function isAuthPathname(pathname: string): boolean {
  return AUTH_PATHS.has(pathname) || pathname.startsWith('/login/') || pathname.startsWith('/register/')
}

function hasUnsafeControlOrBackslash(raw: string): boolean {
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return true
  }
  return false
}

export function sanitizeNextPath(raw: string | null): string {
  if (raw === null || raw.length === 0) return DEFAULT_NEXT_PATH
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return DEFAULT_NEXT_PATH
  }
  if (hasUnsafeControlOrBackslash(raw)) {
    return DEFAULT_NEXT_PATH
  }

  let parsed: URL
  try {
    parsed = new URL(raw, 'https://sunshine.local')
  } catch {
    return DEFAULT_NEXT_PATH
  }

  if (parsed.origin !== 'https://sunshine.local') return DEFAULT_NEXT_PATH
  if (parsed.pathname.startsWith('//') || isAuthPathname(parsed.pathname)) {
    return DEFAULT_NEXT_PATH
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function resolveNextPath(search: string): string {
  const params = new URLSearchParams(search)
  return sanitizeNextPath(params.get('next'))
}

function buildAuthPath(base: '/login' | '/register', nextPath: string): string {
  const safeNext = sanitizeNextPath(nextPath)
  return safeNext === DEFAULT_NEXT_PATH ? base : `${base}?next=${encodeURIComponent(safeNext)}`
}

export function buildLoginPath(nextPath: string): string {
  return buildAuthPath('/login', nextPath)
}

export function buildRegisterPath(nextPath: string): string {
  return buildAuthPath('/register', nextPath)
}

export function buildLoginUrl(location: LocationLike): string {
  if (isAuthPathname(location.pathname)) {
    return buildLoginPath(resolveNextPath(location.search))
  }
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`
}
