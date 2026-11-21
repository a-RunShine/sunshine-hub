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
        // 弱文字与分组描边：弱文字统一提到 #7e8798，比原型的 #5d6678 对比度更够
        muted: '#8c94a6',
        faint: '#7e8798',
        line: '#242c40',
        'line-2': '#323c55',
        danger: '#e05a4f',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
