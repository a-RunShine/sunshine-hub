import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Placeholder from './Placeholder'

// 只证明测试框架跑得通。阶段 0 不写业务测试，页面实现时再补。
describe('Placeholder', () => {
  it('渲染传入的标题', () => {
    render(<Placeholder title="我的订单" />)
    expect(screen.getByRole('heading', { name: '我的订单' })).toBeInTheDocument()
  })
})
