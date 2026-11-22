import { client } from './client'
import type { components, paths } from '@/types/api'

export type Category = components['schemas']['Category']
export type ProductSummary = components['schemas']['ProductSummary']

/**
 * 商品列表响应：从生成契约 `/products` 200 派生（`ProductPage`），
 * 不在 api 层手抄 `{ items: ProductSummary[] }` 包装形状。
 */
export type ProductPage = paths['/products']['get']['responses']['200']['content']['application/json']

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
 * 「全部」口径在服务端，前端不做二次过滤。分页字段随 `ProductPage` 一起返回，
 * 页面只取 `items`，不把包装形状手抄进类型。
 */
export async function getProducts(params: { categoryId?: number } = {}): Promise<ProductPage> {
  const { data } = await client.get<ProductPage>('/products', {
    params: params.categoryId === undefined ? {} : { categoryId: params.categoryId },
  })
  return data
}
