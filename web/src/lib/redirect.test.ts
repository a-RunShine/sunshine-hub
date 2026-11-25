import { describe, expect, it } from 'vitest'
import {
  buildLoginPath,
  buildLoginUrl,
  buildRegisterPath,
  resolveNextPath,
  sanitizeNextPath,
} from './redirect'

describe('sanitizeNextPath', () => {
  it.each([
    [null],
    [''],
    ['orders'],
    ['products?kind=VIRTUAL'],
    ['//evil.com'],
    ['///evil.com'],
    ['/\\evil.com'],
    ['https://evil.com'],
    ['http://evil.com/orders'],
    ['javascript:alert(1)'],
    ['/\tevil.com'],
    ['/orders\\bad'],
    ['/login'],
    ['/login?next=%2Forders'],
    ['/login/callback'],
    ['/register'],
    ['/register?next=%2Fsettings'],
    ['/register/step'],
  ])('拒绝非法或嵌套目标 %s 并回退为 /', (raw) => {
    expect(sanitizeNextPath(raw)).toBe('/')
  })

  it.each([
    ['/'],
    ['/orders'],
    ['/settings'],
    ['/products?kind=VIRTUAL&page=2'],
    ['/campaigns/1?tab=spec#countdown'],
    ['/?from=banner'],
  ])('保留站内合法路径与参数 %s', (raw) => {
    expect(sanitizeNextPath(raw)).toBe(raw)
  })
})

describe('resolveNextPath / buildLoginPath / buildRegisterPath', () => {
  it('从查询串提取并清洗 next 参数', () => {
    expect(resolveNextPath('?next=%2Forders%3Ftab%3D1')).toBe('/orders?tab=1')
    expect(resolveNextPath('?next=https%3A%2F%2Fevil.com')).toBe('/')
    expect(resolveNextPath('')).toBe('/')
  })

  it('构建登录与注册路径时在目标为 / 时省略冗余 next 参数，其余保留编码', () => {
    expect(buildLoginPath('/')).toBe('/login')
    expect(buildRegisterPath('/')).toBe('/register')
    expect(buildLoginPath('https://evil.com')).toBe('/login')
    expect(buildRegisterPath('//evil.com')).toBe('/register')
    expect(buildLoginPath('/settings?tab=security')).toBe('/login?next=%2Fsettings%3Ftab%3Dsecurity')
    expect(buildRegisterPath('/campaigns/4')).toBe('/register?next=%2Fcampaigns%2F4')
  })
})

describe('buildLoginUrl', () => {
  it('在 /login 或 /register 上只保留清洗后的 next，避免嵌套跳回登录页', () => {
    expect(buildLoginUrl({ pathname: '/login', search: '?next=%2Forders' })).toBe(
      '/login?next=%2Forders',
    )
    expect(buildLoginUrl({ pathname: '/register', search: '?next=%2Fcampaigns%2F4' })).toBe(
      '/login?next=%2Fcampaigns%2F4',
    )
    expect(buildLoginUrl({ pathname: '/login', search: '?next=%2Flogin' })).toBe('/login')
    expect(buildLoginUrl({ pathname: '/register', search: '?next=https%3A%2F%2Fevil.com' })).toBe(
      '/login',
    )
    expect(buildLoginUrl({ pathname: '/login', search: '' })).toBe('/login')
  })

  it('非认证页保留完整的 pathname + search 编码', () => {
    expect(buildLoginUrl({ pathname: '/', search: '' })).toBe('/login?next=%2F')
    expect(buildLoginUrl({ pathname: '/products', search: '?kind=VIRTUAL' })).toBe(
      '/login?next=%2Fproducts%3Fkind%3DVIRTUAL',
    )
  })
})
