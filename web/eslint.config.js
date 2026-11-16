import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'src/types/api.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 契约里没有 any，前端也不许有
      '@typescript-eslint/no-explicit-any': 'error',
      // 组件不得直接发请求，这是 CODING_STANDARDS 里那条的机器化
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: '请求统一走 src/api，不要在组件里直接调' }],
        },
      ],
    },
  },
  {
    // api 层是唯一允许碰 axios 的地方
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
)
