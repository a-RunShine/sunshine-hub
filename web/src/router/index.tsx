import { createBrowserRouter } from 'react-router-dom'
import Placeholder from '@/views/Placeholder'
import CampaignPage from '@/views/campaign/CampaignPage'
import HomePage from '@/views/home/HomePage'
import ProductsPage from '@/views/products/ProductsPage'
import { AppShell } from '@/components/layout/AppShell'
import RequireAuth from './RequireAuth'

export const router = createBrowserRouter([
  { path: '/', element: <AppShell layout="full-bleed"><HomePage /></AppShell> },
  { path: '/products', element: <AppShell><ProductsPage /></AppShell> },
  { path: '/products/:productId', element: <Placeholder title="商品详情" note="含规格选择" /> },
  { path: '/campaigns/:campaignId', element: <CampaignPage /> },
  {
    path: '/orders',
    element: (
      <RequireAuth>
        <Placeholder title="我的订单" />
      </RequireAuth>
    ),
  },
  {
    path: '/orders/:orderNo',
    element: (
      <RequireAuth>
        <Placeholder title="订单详情" note="含剩余支付秒数" />
      </RequireAuth>
    ),
  },
  {
    path: '/items',
    element: (
      <RequireAuth>
        <Placeholder title="我的道具库" note="虚拟道具与限量藏品" />
      </RequireAuth>
    ),
  },
  {
    path: '/fulfillments',
    element: (
      <RequireAuth>
        <Placeholder title="履约单" note="发货状态与物流单号" />
      </RequireAuth>
    ),
  },
  {
    path: '/refunds/:refundNo',
    element: (
      <RequireAuth>
        <Placeholder title="退款详情" />
      </RequireAuth>
    ),
  },
  { path: '/announcements', element: <Placeholder title="公告" /> },
  { path: '/announcements/:announcementId', element: <Placeholder title="公告详情" /> },
  { path: '/events', element: <Placeholder title="活动" /> },
  { path: '/events/:eventId', element: <Placeholder title="活动详情" /> },
  { path: '/login', element: <Placeholder title="登录" /> },
  { path: '/register', element: <Placeholder title="注册" /> },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <Placeholder title="运营后台" note="商品、配额、发货、退款审核" />
      </RequireAuth>
    ),
  },
])
