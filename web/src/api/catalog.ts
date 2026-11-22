import { client } from './client'
import type { components, paths } from '@/types/api'

export type Category = components['schemas']['Category']
export type ProductSummary = components['schemas']['ProductSummary']
export type ProductKind = ProductSummary['kind']

export type ProductPage = paths['/products']['get']['responses']['200']['content']['application/json']

export interface ProductQueryParams {
  readonly categoryId?: number
  readonly kind?: ProductKind
  readonly page?: number
  readonly size?: number
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get<Category[]>('/categories')
  return data
}

export async function getProducts(params: ProductQueryParams = {}): Promise<ProductPage> {
  const query: Record<string, number | string> = {}
  if (params.categoryId !== undefined) query.categoryId = params.categoryId
  if (params.kind !== undefined) query.kind = params.kind
  if (params.page !== undefined) query.page = params.page
  if (params.size !== undefined) query.size = params.size

  const { data } = await client.get<ProductPage>('/products', { params: query })
  return data
}
