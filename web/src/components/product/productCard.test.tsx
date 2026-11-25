import { screen } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ProductSummary } from '@/api/catalog'
import { renderWithDataRouter } from '@/test/dataRouter'
import { ProductCard } from './ProductCard'

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
  return renderWithDataRouter([
    { path: '/', element: <ProductCard product={product} /> },
    { path: '/products/:productId', element: <ProbeLocation /> },
  ])
}

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
