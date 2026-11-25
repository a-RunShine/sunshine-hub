# Web 前端工作约定

新建或修改 `web/src/` 下任何页面或业务组件前，先读 [DESIGN.md](DESIGN.md) 与 [CODING_STANDARDS/typescript.md](../CODING_STANDARDS/typescript.md)，并遵守 [GLOSSARY.md](../GLOSSARY.md) 术语口径与 [ADR-0014](../docs/adr/0014-category-as-resource.md)（不按可变 `categoryId` 硬编码样式或规则）。

## 组件复用与边界

- **优先复用既有基元**：
  - `src/components/common/`：`DiagonalSurface`、`ActionButton`、`ActionLink`、`PageState`、`SectionHeader`、`LimitedBadge`、`CoverSilhouette`
  - `src/components/product/`：`ProductCard`、`ProductCover`、`ProductKindMark`
  - `src/components/` 根级共享组件：[BrandMark.tsx](src/components/BrandMark.tsx)、[Price.tsx](src/components/Price.tsx)
- **样式令牌**：使用 obsidian 语义令牌（`bg-ink-950`、`border-line`、`text-foreground`、`text-muted`、`text-accent`、`text-danger` 等）。完整禁用清单与 ESLint 边界由 [eslint.config.js](eslint.config.js) 与 `pnpm ui:check` 机器强制，本文件不复述。
- **shadcn 原语**：`src/components/ui/` 保持官方源码不动，定制写在外部包装组件，见 [src/components/ui/README.md](src/components/ui/README.md)。

## 测试的路由入口

组件与视图测试统一用 [`@/test/dataRouter`](src/test/dataRouter.tsx) 的 `renderWithDataRouter`（`createMemoryRouter` + `<RouterProvider>` + `<StrictMode>`）。测试里从 `react-router-dom` 导入 `MemoryRouter` 会被 ESLint 拦下。该入口内置 data router 所需的 `AbortSignal` 垫片，写用例时不用自己碰。

## 提交前校验

```bash
env -u NODE_ENV pnpm --dir web check
```

等价于依次执行 `tsc --noEmit`、`eslint .`、`ui:check`、`vitest run` 与 `vite build`。`NODE_ENV=production` 已被 [vite.config.ts](vite.config.ts) 拦下，必须先 `env -u NODE_ENV`。前后端与文档一起过一遍用 `./scripts/check-all.sh`。
