import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Placeholder from './Placeholder'

describe('Placeholder', () => {
  it('渲染传入的标题', () => {
    render(<Placeholder title="我的订单" />)
    expect(screen.getByRole('heading', { name: '我的订单' })).toBeInTheDocument()
  })
})
