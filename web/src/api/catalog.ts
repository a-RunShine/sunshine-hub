import { client } from './client'
import type { components } from '@/types/api'

export type Category = components['schemas']['Category']
export type ProductSummary = components['schemas']['ProductSummary']

/**
 * 分类列表。GET /categories 不分页，按 sortOrder 升序；名称与排序都来自响应，
 * 前端不硬编码分类名或图标（ADR-0014）。
 */
export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get<Category[]>('/categories')
  return data
}

/**
 * 商品列表。GET /products?categoryId=；`categoryId` 缺省时不带该查询参数，
 * 「全部」口径在服务端，前端不做二次过滤。响应取 `items`，分页字段不进页面状态。
 */
export async function getProducts(params: { categoryId?: number } = {}): Promise<ProductSummary[]> {
  const { data } = await client.get<{ items: ProductSummary[] }>('/products', {
    params: params.categoryId === undefined ? {} : { categoryId: params.categoryId },
  })
  return data.items
}
