interface LocationLike {
  pathname: string
  search: string
}

export function buildLoginUrl(location: LocationLike): string {
  return `/login?next=${encodeURIComponent(location.pathname + location.search)}`
}
