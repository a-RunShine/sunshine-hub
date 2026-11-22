import { client } from './client'
import type { components, paths } from '@/types/api'

export type Category = components['schemas']['Category']
export type ProductSummary = components['schemas']['ProductSummary']
export type ProductKind = ProductSummary['kind']

/**
 * 商品列表响应：从生成契约 `/products` 200 派生（`ProductPage`），
 * 不在 api 层手抄 `{ items: ProductSummary[] }` 包装形状。
 */
export type ProductPage = paths['/products']['get']['responses']['200']['content']['application/json']

export interface ProductQueryParams {
  readonly categoryId?: number
  readonly kind?: ProductKind
  readonly page?: number
  readonly size?: number
}

/**
 * 分类列表。GET /categories 不分页，按 sortOrder 升序；名称与排序都来自响应，
 * 前端不硬编码分类名或图标（ADR-0014）。
 */
export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get<Category[]>('/categories')
  return data
}

/**
 * 商品列表。仅当参数非 undefined 时附带对应查询参数，
 * 「全部」口径与过滤逻辑都在服务端，前端不做二次筛选。
 */
export async function getProducts(params: ProductQueryParams = {}): Promise<ProductPage> {
  const query: Record<string, number | string> = {}
  if (params.categoryId !== undefined) query.categoryId = params.categoryId
  if (params.kind !== undefined) query.kind = params.kind
  if (params.page !== undefined) query.page = params.page
  if (params.size !== undefined) query.size = params.size

  const { data } = await client.get<ProductPage>('/products', { params: query })
  return data
}
