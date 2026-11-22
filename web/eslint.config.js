import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const LEGACY_PALETTE_PATTERN = /(?:text|bg|border|ring|divide|placeholder)-(?:neutral|gray|zinc|slate)-\d+/
const ROUNDED_MD_PATTERN = /\brounded-md\b/
const UI_FORBIDDEN_CLASS_PATTERN = /\bchamfer-cta\b|\bsearch-chamfer\b|(?<![\w-])bg-ink-|(?<![\w-])text-muted(?![\w-])/

export default tseslint.config(
  { ignores: ['dist', 'public', 'src/types/api.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 契约里没有 any，前端也不许有
      '@typescript-eslint/no-explicit-any': 'error',
      // 组件与业务代码不得直接发请求或直接导入生成的 OpenAPI 类型定义
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: '请求统一走 src/api，不要在组件里直接调' },
            {
              name: '@/types/api',
              message: '接口类型统一从 src/api/* 导出，不要在业务/组件代码里直接导入 @/types/api',
            },
          ],
          patterns: [
            {
              group: ['../**/types/api', '../**/types/api.*', './types/api', './types/api.*'],
              message: '接口类型统一从 src/api/* 导出，不要直接导入 src/types/api',
            },
          ],
        },
      ],
    },
  },
  {
    // api 层是唯一允许碰 axios 与 @/types/api 的地方
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // mock 层需要按契约构造假数据，允许导入 @/types/api，但仍禁止直接引 axios
    files: ['src/mocks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: '请求统一走 src/api，不要在 mock 里直接引 axios' }],
        },
      ],
    },
  },
  {
    // 页面、业务组件与路由统一使用 obsidian 语义令牌，禁用默认灰度类名与 rounded-md
    files: ['src/views/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/router/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${LEGACY_PALETTE_PATTERN}]`,
          message:
            '禁用 Tailwind 默认灰度类名，请改用 DESIGN.md 定义的 obsidian 语义令牌（如 text-muted、border-line、bg-ink-900）',
        },
        {
          selector: `TemplateElement[value.raw=${LEGACY_PALETTE_PATTERN}]`,
          message:
            '禁用 Tailwind 默认灰度类名，请改用 DESIGN.md 定义的 obsidian 语义令牌（如 text-muted、border-line、bg-ink-900）',
        },
        {
          selector: `Literal[value=${ROUNDED_MD_PATTERN}]`,
          message: '禁用 rounded-md，业务组件请改用直角或 rounded-[2px]（参见 DESIGN.md）',
        },
        {
          selector: `TemplateElement[value.raw=${ROUNDED_MD_PATTERN}]`,
          message: '禁用 rounded-md，业务组件请改用直角或 rounded-[2px]（参见 DESIGN.md）',
        },
      ],
    },
  },
  {
    // 锁定 shadcn 原语源码边界：禁止导入业务/应用模块与项目设计类名
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'shadcn 原语不得导入 axios' },
            { name: 'react-router-dom', message: 'shadcn 原语不得耦合路由模块 react-router-dom' },
            { name: '@/types/api', message: 'shadcn 原语不得导入契约类型 @/types/api' },
            { name: '@/components/BrandMark', message: 'shadcn 原语不得导入共享组件 @/components/BrandMark' },
            { name: '@/components/Price', message: 'shadcn 原语不得导入共享组件 @/components/Price' },
          ],
          patterns: [
            {
              group: [
                '@/api/*',
                '@/stores/*',
                '@/hooks/*',
                '@/views/*',
                '@/types/*',
                '@/router/*',
                '@/components/common/*',
                '@/components/product/*',
                '../common/*',
                '../product/*',
                '../BrandMark',
                '../Price',
                '../**/types/api',
                '../**/types/api.*',
              ],
              message: 'shadcn 原语层禁止导入业务或应用模块；请在外层业务组件包装定制',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${UI_FORBIDDEN_CLASS_PATTERN}]`,
          message:
            'shadcn 原语源码禁止引入项目设计类名（chamfer-cta / search-chamfer / bg-ink- / text-muted），请在外层包装组件中添加',
        },
        {
          selector: `TemplateElement[value.raw=${UI_FORBIDDEN_CLASS_PATTERN}]`,
          message:
            'shadcn 原语源码禁止引入项目设计类名（chamfer-cta / search-chamfer / bg-ink- / text-muted），请在外层包装组件中添加',
        },
      ],
    },
  },
)
