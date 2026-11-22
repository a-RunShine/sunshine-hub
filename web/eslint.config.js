import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const LEGACY_PALETTE_PATTERN =
  /(?:^|[\s:])(?:text|bg|border(?:-[trblxyse])?|ring|divide|placeholder|outline|from|via|to|stroke|fill)-(?:neutral|gray|zinc|slate|stone)-\d+/
const ROUNDED_MD_PATTERN = /\brounded-md\b/
const UI_FORBIDDEN_CLASS_PATTERN =
  /(?<![\w-])(?:chamfer-cta(?![\w-])|search-chamfer(?![\w-])|(?:bg|text|border)-ink-|border-(?:[trblxyse]-)?line(?:-2)?(?![\w-])|text-(?:muted|danger|faint)(?![\w-]))/

const AXIOS_RESTRICTED_PATH = {
  name: 'axios',
  message: '请求统一走 src/api，不要在业务代码或 mock 里直接引 axios',
}

const API_TYPE_RESTRICTED_PATHS = [
  {
    name: '@/types/api',
    message: '接口类型统一从 src/api/* 导出，不要在业务/组件代码里直接导入 @/types/api',
  },
]

const API_TYPE_RESTRICTED_PATTERNS = [
  {
    group: ['@/types/api.*', '../**/types/api', '../**/types/api.*', './types/api', './types/api.*'],
    message: '接口类型统一从 src/api/* 导出，不要直接导入 @/types/api',
  },
]

function restrictClassPattern(pattern, message) {
  return [
    { selector: `Literal[value=${pattern}]`, message },
    { selector: `TemplateElement[value.raw=${pattern}]`, message },
  ]
}

export default tseslint.config(
  { ignores: ['dist', 'public', 'src/types/api.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [AXIOS_RESTRICTED_PATH, ...API_TYPE_RESTRICTED_PATHS],
          patterns: API_TYPE_RESTRICTED_PATTERNS,
        },
      ],
    },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/mocks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [AXIOS_RESTRICTED_PATH],
        },
      ],
    },
  },
  {
    files: ['src/views/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/router/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictClassPattern(
          LEGACY_PALETTE_PATTERN,
          '禁用 Tailwind 默认灰度类名，请改用 DESIGN.md 定义的 obsidian 语义令牌（如 text-muted、border-line、bg-ink-900）',
        ),
        ...restrictClassPattern(
          ROUNDED_MD_PATTERN,
          '禁用 rounded-md，业务组件请改用直角或 rounded-[2px]（参见 DESIGN.md）',
        ),
      ],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            AXIOS_RESTRICTED_PATH,
            ...API_TYPE_RESTRICTED_PATHS,
            { name: 'react-router-dom', message: 'shadcn 原语不得耦合路由模块 react-router-dom' },
            { name: '@/components/BrandMark', message: 'shadcn 原语不得导入共享组件 @/components/BrandMark' },
            { name: '@/components/Price', message: 'shadcn 原语不得导入共享组件 @/components/Price' },
          ],
          patterns: [
            ...API_TYPE_RESTRICTED_PATTERNS,
            {
              group: [
                '@/api/**',
                '@/stores/**',
                '@/hooks/**',
                '@/views/**',
                '@/types/**',
                '@/router/**',
                '@/components/**',
                '!@/components/ui',
                '!@/components/ui/**',
                '@/mocks/**',
                '@/lib/**',
                '!@/lib/utils',
                '../*',
                '../**',
              ],
              message: 'shadcn 原语层禁止导入业务、应用模块或跨目录相对导入；请在外层业务组件包装定制',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...restrictClassPattern(
          UI_FORBIDDEN_CLASS_PATTERN,
          'shadcn 原语源码禁止引入项目设计类名（chamfer-cta / search-chamfer / *-ink-* / border-line / text-muted / text-danger / text-faint），请在外层包装组件中添加',
        ),
      ],
    },
  },
)
