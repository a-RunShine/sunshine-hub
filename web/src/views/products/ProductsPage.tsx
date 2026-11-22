import { useMemo, useState } from 'react'
import { getCategories, getProducts, type Category, type ProductKind, type ProductSummary } from '@/api/catalog'
import { ActionButton } from '@/components/common/ActionButton'
import { PageState } from '@/components/common/PageState'
import { SectionHeader } from '@/components/common/SectionHeader'
import { PRODUCT_KIND_LABEL, ProductCard } from '@/components/product/ProductCard'
import { useResource } from '@/hooks/useResource'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

const KIND_OPTIONS: ReadonlyArray<{ value: ProductKind | undefined; label: string }> = [
  { value: undefined, label: '全部形态' },
  { value: 'VIRTUAL', label: PRODUCT_KIND_LABEL.VIRTUAL },
  { value: 'PHYSICAL', label: PRODUCT_KIND_LABEL.PHYSICAL },
]

/** 前端过渡期快速定位关键词（后端全库 keyword 与原型字段由 #80 接手）。 */
const QUICK_SUBJECT_KEYWORDS = ['磁轨', '冲锋枪', '暗夜猎手', '手办', '队服'] as const

function countActiveFunnelOptions(
  selectedKind: ProductKind | undefined,
  onlyLimited: boolean,
  quickKeyword: string | null,
): number {
  let count = 0
  if (selectedKind !== undefined) count += 1
  if (onlyLimited) count += 1
  if (quickKeyword !== null) count += 1
  return count
}

function matchesLocalFilter(
  product: ProductSummary,
  query: string,
  onlyLimited: boolean,
  quickKeyword: string | null,
): boolean {
  if (onlyLimited && !product.limited) return false
  if (quickKeyword && !product.name.toLowerCase().includes(quickKeyword.toLowerCase())) {
    return false
  }
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return (
    product.name.toLowerCase().includes(normalized) ||
    PRODUCT_KIND_LABEL[product.kind].includes(normalized)
  )
}

/**
 * 全部商品目录页（/products · R4-B 混合陈列）：
 * - 默认第 1 页且无筛选/搜索时启用「顶 2 排非对称 + 第 4 件起三列对称（末尾左对齐）」；
 * - 任一分类、漏斗筛选、搜索词激活或翻页后切换为规整三列对称网格，便于横向对比；
 * - categoryId / kind 直接驱动 `/api/products`；搜索与限量筛选在 #80 落契约前作本页即时过滤。
 */
export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [selectedKind, setSelectedKind] = useState<ProductKind | undefined>(undefined)
  const [onlyLimited, setOnlyLimited] = useState(false)
  const [quickKeyword, setQuickKeyword] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [funnelOpen, setFunnelOpen] = useState(false)
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

  const categoryNameById = useMemo(
    () =>
      new Map(
        categories.state.status === 'ready'
          ? categories.state.data.map((category) => [category.id, category.name] as const)
          : [],
      ),
    [categories.state],
  )

  function selectCategory(categoryId: number | undefined) {
    setSelectedCategoryId(categoryId)
    setPage(1)
  }

  function selectKind(kind: ProductKind | undefined) {
    setSelectedKind(kind)
    setPage(1)
  }

  function resetAllFilters() {
    setSelectedCategoryId(undefined)
    setSelectedKind(undefined)
    setOnlyLimited(false)
    setQuickKeyword(null)
    setSearchQuery('')
    setPage(1)
  }

  const pageData = products.state.status === 'ready' ? products.state.data : null
  const visibleItems = useMemo(() => {
    if (!pageData) return []
    return pageData.items.filter((item) =>
      matchesLocalFilter(item, searchQuery, onlyLimited, quickKeyword),
    )
  }, [pageData, searchQuery, onlyLimited, quickKeyword])

  const hasLocalNarrowing =
    onlyLimited || quickKeyword !== null || searchQuery.trim().length > 0
  const activeFunnelCount = countActiveFunnelOptions(selectedKind, onlyLimited, quickKeyword)
  const hasAnyFilter =
    selectedCategoryId !== undefined || activeFunnelCount > 0 || searchQuery.trim().length > 0
  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.total / pageData.size)) : 1

  const isHybridDefault =
    !hasAnyFilter && page === 1 && visibleItems.length >= 4

  return (
    <div>
      <SectionHeader
        as="h1"
        eyebrow="SUNSHINE ARMORY · R4-B 混合陈列"
        title="全部商品"
        className="mb-4"
        right={
          <label className="search-chamfer relative flex w-full items-center border border-[#2b322e] bg-[#111513] transition-colors focus-within:border-accent sm:w-[340px]">
            <span className="pl-3.5 pr-2 text-muted" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20L16.2 16.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              aria-label="搜索商品"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索商品名称或型号"
              className="h-[42px] w-full bg-transparent pr-12 text-[16px] text-foreground outline-none placeholder:text-faint sm:h-[40px] sm:text-[13px]"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-[12px] text-muted transition-colors hover:text-accent"
              >
                清空
              </button>
            )}
          </label>
        }
      />

      <section
        aria-label="筛选条件"
        className="mb-6 border-b border-line pb-1"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
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
                    'relative inline-flex h-[42px] shrink-0 items-center whitespace-nowrap pb-[6px] text-[14px] leading-5 transition-colors',
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
                        'relative inline-flex h-[42px] shrink-0 items-center whitespace-nowrap pb-[6px] text-[14px] leading-5 transition-colors',
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

          <div className="flex shrink-0 items-center gap-4 pb-1">
            {pageData && (
              <span className="text-[13px] tabular-nums text-muted" aria-live="polite">
                {hasLocalNarrowing
                  ? `当前页命中 ${visibleItems.length} 件（共 ${pageData.total} 件）`
                  : `共 ${pageData.total} 件`}
              </span>
            )}

            <button
              type="button"
              aria-expanded={funnelOpen}
              aria-controls="products-funnel-panel"
              onClick={() => setFunnelOpen((open) => !open)}
              className={cn(
                'inline-flex items-center gap-2 rounded-[2px] border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                funnelOpen || activeFunnelCount > 0
                  ? 'border-accent/70 bg-accent/[0.08] text-accent'
                  : 'border-line bg-[#111513] text-foreground hover:border-[#39433d]',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 5H21L14 13.5V19.5L10 21V13.5L3 5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <span>筛选</span>
              {activeFunnelCount > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[2px] bg-accent px-1 font-mono text-[12px] font-bold text-ink-950">
                  {activeFunnelCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {funnelOpen && (
          <div
            id="products-funnel-panel"
            className="mt-3 grid grid-cols-1 gap-5 border-t border-line bg-[#111513] px-5 py-4 md:grid-cols-3"
          >
            <div>
              <div className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-muted">商品形态</div>
              <div role="group" aria-label="商品形态" className="flex flex-wrap gap-2">
                {KIND_OPTIONS.map((option) => {
                  const active = selectedKind === option.value
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectKind(option.value)}
                      className={cn(
                        'rounded-[2px] border px-3 py-1 text-[13px] transition-colors',
                        active
                          ? 'border-accent bg-accent/[0.1] font-semibold text-accent'
                          : 'border-line bg-ink-950 text-muted hover:border-[#3c4640] hover:text-foreground',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-muted">售卖属性</div>
              <div role="group" aria-label="售卖属性" className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={!onlyLimited}
                  onClick={() => setOnlyLimited(false)}
                  className={cn(
                    'rounded-[2px] border px-3 py-1 text-[13px] transition-colors',
                    !onlyLimited
                      ? 'border-accent bg-accent/[0.1] font-semibold text-accent'
                      : 'border-line bg-ink-950 text-muted hover:border-[#3c4640] hover:text-foreground',
                  )}
                >
                  全部属性
                </button>
                <button
                  type="button"
                  aria-pressed={onlyLimited}
                  onClick={() => setOnlyLimited(true)}
                  className={cn(
                    'rounded-[2px] border px-3 py-1 text-[13px] transition-colors',
                    onlyLimited
                      ? 'border-accent bg-accent/[0.1] font-semibold text-accent'
                      : 'border-line bg-ink-950 text-muted hover:border-[#3c4640] hover:text-foreground',
                  )}
                >
                  仅看限量
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div>
                <div className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-muted">
                  快捷关键词定位
                </div>
                <div role="group" aria-label="快捷关键词" className="flex flex-wrap gap-2">
                  {QUICK_SUBJECT_KEYWORDS.map((keyword) => {
                    const active = quickKeyword === keyword
                    return (
                      <button
                        key={keyword}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setQuickKeyword(active ? null : keyword)}
                        className={cn(
                          'rounded-[2px] border px-2.5 py-1 text-[12px] transition-colors',
                          active
                            ? 'border-accent bg-accent/[0.1] font-semibold text-accent'
                            : 'border-line bg-ink-950 text-muted hover:border-[#3c4640] hover:text-foreground',
                        )}
                      >
                        {keyword}
                      </button>
                    )
                  })}
                </div>
              </div>

              {hasAnyFilter && (
                <div className="flex justify-end">
                  <ActionButton intent="link" onClick={resetAllFilters}>
                    清空全部筛选
                  </ActionButton>
                </div>
              )}
            </div>
          </div>
        )}
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
        {pageData && visibleItems.length === 0 && (
          <div className="flex flex-col items-center gap-3">
            <PageState variant="empty" />
            {hasLocalNarrowing && (
              <ActionButton intent="secondary" onClick={resetAllFilters}>
                清空搜索与筛选
              </ActionButton>
            )}
          </div>
        )}
        {pageData && visibleItems.length > 0 && (
          <>
            {isHybridDefault ? (
              <div
                key={`hybrid-${page}`}
                className="catalog-enter flex flex-col gap-6"
              >
                <ProductCard
                  product={visibleItems[0]}
                  categoryName={categoryNameById.get(visibleItems[0].categoryId)}
                  variant="lead"
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
                  {visibleItems.slice(1, 3).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categoryName={categoryNameById.get(product.categoryId)}
                    />
                  ))}
                </div>

                {visibleItems.length > 3 && (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.slice(3).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        categoryName={categoryNameById.get(product.categoryId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                key={`${selectedCategoryId ?? 'all'}-${selectedKind ?? 'all'}-${onlyLimited}-${quickKeyword ?? 'none'}-${searchQuery}-${page}`}
                className="catalog-enter grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleItems.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={categoryNameById.get(product.categoryId)}
                  />
                ))}
              </div>
            )}

            {pageData.total > pageData.size && (
              <nav aria-label="分页导航" className="mt-10 flex items-center justify-center gap-4 border-t border-line pt-6">
                <ActionButton
                  intent="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  上一页
                </ActionButton>
                <span className="font-mono text-[13px] tabular-nums text-muted">
                  第 {page} / {totalPages} 页
                </span>
                <ActionButton
                  intent="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  下一页
                </ActionButton>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  )
}
