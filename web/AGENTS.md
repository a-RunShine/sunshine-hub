# Web 前端工作约定

新建或修改 `web/src/` 下任何页面或业务组件前，先读 [DESIGN.md](DESIGN.md) 与 [CODING_STANDARDS/typescript.md](../CODING_STANDARDS/typescript.md)，并遵守 [GLOSSARY.md](../GLOSSARY.md) 术语口径与 [ADR-0014](../docs/adr/0014-category-as-resource.md)（不按可变 `categoryId` 硬编码样式或规则）。

## 组件复用与边界

- **优先复用既有基元**：
  - `src/components/common/`：`DiagonalSurface`、`ActionButton`、`ActionLink`、`PageState`、`SectionHeader`、`LimitedBadge`、`CoverSilhouette`
  - `src/components/product/`：`ProductCard`、`ProductCover`、`ProductKindMark`
  - `src/components/` 根级共享组件：[BrandMark.tsx](src/components/BrandMark.tsx)、[Price.tsx](src/components/Price.tsx)
- **禁止手改 `src/components/ui/*`**：保持 shadcn 原始源码不动；需要定制行为或外观时在外部新建组件包一层（见 [src/components/ui/README.md](src/components/ui/README.md)）。该目录受 ESLint 边界约束与 `pnpm ui:check` 校验和检查。
- **类型与请求边界**：视图与组件不直接导入 `axios` 或 `@/types/api`（接口类型统一从 `src/api/*` 导出）。
- **样式令牌**：使用 obsidian 语义令牌（`bg-ink-950`、`border-line`、`text-foreground`、`text-muted`、`text-accent`、`text-danger` 等），禁用默认灰度类名与 `rounded-md`。

## 提交前校验

```bash
pnpm --dir web check
```

等价于依次执行 `tsc --noEmit`、`eslint .`、`ui:check`、`vitest run` 与 `vite build`。
