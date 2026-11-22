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
        // 弱文字与分组描边：弱文字统一提到 #7e8798，比原型的 #5d6678 对比度更够
        muted: '#8c94a6',
        faint: '#7e8798',
        line: '#242c40',
        'line-2': '#323c55',
        danger: '#e05a4f',
        // shadcn 件按 CSS 变量取色；变量值在 src/index.css 的 :root 映射到上方令牌
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
          muted: '#8a6a1f',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
