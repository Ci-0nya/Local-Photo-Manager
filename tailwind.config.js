/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 语义化主题色（扁平命名，由 data-theme 的 CSS 变量驱动）
        canvas: 'rgb(var(--app-bg) / <alpha-value>)',
        surface: 'rgb(var(--app-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--app-hover) / <alpha-value>)',
        content: 'rgb(var(--app-text) / <alpha-value>)',
        'content-muted': 'rgb(var(--app-muted) / <alpha-value>)',
        'content-subtle': 'rgb(var(--app-subtle) / <alpha-value>)',
        outline: 'rgb(var(--app-border) / <alpha-value>)'
      }
    }
  },
  plugins: []
}