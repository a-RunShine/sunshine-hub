/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 商城是暗色调，比 shadcn 默认的中性灰更偏冷
        ink: {
          950: '#0b0d12',
          900: '#121620',
          800: '#1a2030',
          700: '#242c40',
        },
        accent: {
          DEFAULT: '#f0b429',
          muted: '#8a6a1f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
