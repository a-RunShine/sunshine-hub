import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { components } from '@/types/api'
import { ProductCard } from './ProductCard'

type ProductSummary = components['schemas']['ProductSummary']

const limitedProduct: ProductSummary = {
  id: 1,
  name: '暗夜猎手 限定皮肤',
  kind: 'VIRTUAL',
  categoryId: 1,
  coverUrl: '',
  minPrice: 12800,
  limited: true,
}

const regularProduct: ProductSummary = {
  id: 3,
  name: '赛季队服',
  kind: 'PHYSICAL',
  categoryId: 5,
  coverUrl: '',
  minPrice: 19900,
  limited: false,
}

function ProbeLocation() {
  return <div data-testid="probe">{useLocation().pathname}</div>
}

function renderCard(product: ProductSummary) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProductCard product={product} categoryName="服饰" />} />
        <Route path="/products/:productId" element={<ProbeLocation />} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * 商品卡边界：限量 / 常规 badge 文案与整卡跳转不受剪影映射改动影响；
 * 价格只交 Price 组件，卡片内不做分→元换算。
 */
describe('ProductCard 限量标记与跳转', () => {
  it('限量商品渲染「限量」badge，整卡链接指向 /products/:id', () => {
    renderCard(limitedProduct)

    expect(screen.getByText('限量')).toBeInTheDocument()
    expect(screen.queryByText('常规')).not.toBeInTheDocument()
    expect(screen.getByText('暗夜猎手 限定皮肤').closest('a')).toHaveAttribute('href', '/products/1')
  })

  it('常规商品不贴标签，整卡链接指向 /products/:id', () => {
    renderCard(regularProduct)

    expect(screen.queryByText('常规')).not.toBeInTheDocument()
    expect(screen.queryByText('限量')).not.toBeInTheDocument()
    expect(screen.getByText('赛季队服').closest('a')).toHaveAttribute('href', '/products/3')
  })
})
