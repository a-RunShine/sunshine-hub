import { useState } from 'react'
import { getCategories, getProducts, type Category, type ProductKind } from '@/api/catalog'
import { PageState } from '@/components/common/PageState'
import { PRODUCT_KIND_LABEL, ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { useResource } from '@/hooks/useResource'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

const KIND_OPTIONS: ReadonlyArray<{ value: ProductKind | undefined; label: string }> = [
  { value: undefined, label: '全部形态' },
  { value: 'VIRTUAL', label: PRODUCT_KIND_LABEL.VIRTUAL },
  { value: 'PHYSICAL', label: PRODUCT_KIND_LABEL.PHYSICAL },
]

/**
 * 经典商品选择页（/products）：分类 Tab + 商品形态切换 + 3 列商品网格 + 分页。
 * 筛选条件与当前页码为页面内状态（刷新即丢，不进全局 store），全由服务端接口口径驱动。
 */
export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [selectedKind, setSelectedKind] = useState<ProductKind | undefined>(undefined)
  const [page, setPage] = useState(1)

  const categories = useResource<Category[]>(() => getCategories(), [])
  const products = useResource(
    () =>
      getProducts({
        categoryId: selectedCategoryId,
        kind: selectedKind,
        page,
        size: PAGE_SIZE,
      }),
    [selectedCategoryId, selectedKind, page],
  )

  const categoryNameById = new Map(
    categories.state.status === 'ready'
      ? categories.state.data.map((category) => [category.id, category.name] as const)
      : [],
  )

  function selectCategory(categoryId: number | undefined) {
    setSelectedCategoryId(categoryId)
    setPage(1)
  }

  function selectKind(kind: ProductKind | undefined) {
    setSelectedKind(kind)
    setPage(1)
  }

  const pageData = products.state.status === 'ready' ? products.state.data : null
  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.total / pageData.size)) : 1

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.01em] text-foreground">
          全部军需
        </h1>
        {pageData && (
          <span className="text-[14px] tabular-nums text-muted" aria-live="polite">
            共 {pageData.total} 件
          </span>
        )}
      </div>

      <section
        aria-label="筛选条件"
        className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line max-[860px]:flex-col max-[860px]:items-stretch max-[860px]:gap-3 max-[860px]:border-b-0"
      >
        <div className="-mb-px min-w-0 flex-1 max-[860px]:mb-0 max-[860px]:w-full max-[860px]:flex-none max-[860px]:border-b max-[860px]:border-line">
          {categories.state.status === 'loading' && <PageState variant="loading" />}
          {categories.state.status === 'error' && (
            <PageState
              variant="error"
              message={categories.state.message}
              onRetry={categories.reload}
            />
          )}
          {categories.state.status === 'ready' && categories.state.data.length === 0 && (
            <PageState variant="empty" />
          )}
          {categories.state.status === 'ready' && categories.state.data.length > 0 && (
            <div
              role="group"
              aria-label="商品分类"
              className="flex max-w-full items-center gap-[clamp(18px,2.2vw,28px)] overflow-x-auto"
            >
              <button
                type="button"
                aria-pressed={selectedCategoryId === undefined}
                onClick={() => selectCategory(undefined)}
                className={cn(
                  'relative inline-flex h-[44px] shrink-0 items-center whitespace-nowrap pb-[10px] text-[14px] leading-5 transition-colors',
                  selectedCategoryId === undefined
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-muted hover:text-foreground',
                )}
              >
                全部
                {selectedCategoryId === undefined && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
                )}
              </button>
              {categories.state.data.map((category) => {
                const active = selectedCategoryId === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectCategory(category.id)}
                    className={cn(
                      'relative inline-flex h-[44px] shrink-0 items-center whitespace-nowrap pb-[10px] text-[14px] leading-5 transition-colors',
                      active
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted hover:text-foreground',
                    )}
                  >
                    {category.name}
                    {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div
          role="group"
          aria-label="商品形态"
          className="mb-[10px] inline-flex shrink-0 items-center rounded-[2px] border border-line bg-ink-900 p-0.5 max-[860px]:mb-3 max-[860px]:flex max-[860px]:w-full"
        >
          {KIND_OPTIONS.map((option) => {
            const active = selectedKind === option.value
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                onClick={() => selectKind(option.value)}
                className={cn(
                  'whitespace-nowrap rounded-[2px] px-3 py-1 text-[13px] leading-5 transition-colors max-[860px]:flex-1',
                  active
                    ? 'bg-ink-700 font-semibold text-foreground'
                    : 'font-medium text-muted hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </section>

      <section aria-label="商品列表">
        {products.state.status === 'loading' && <PageState variant="loading" />}
        {products.state.status === 'error' && (
          <PageState
            variant="error"
            message={products.state.message}
            onRetry={products.reload}
          />
        )}
        {pageData && pageData.items.length === 0 && <PageState variant="empty" />}
        {pageData && pageData.items.length > 0 && (
          <>
            <div
              key={`${selectedCategoryId ?? 'all'}-${selectedKind ?? 'all'}-${page}`}
              className="catalog-enter grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {pageData.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={categoryNameById.get(product.categoryId)}
                />
              ))}
            </div>

            {pageData.total > pageData.size && (
              <nav aria-label="分页导航" className="mt-10 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-[2px] border-line text-[13px] text-foreground hover:border-line-2 hover:bg-ink-900"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  上一页
                </Button>
                <span className="font-mono text-[13px] tabular-nums text-muted">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-[2px] border-line text-[13px] text-foreground hover:border-line-2 hover:bg-ink-900"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  下一页
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  )
}
