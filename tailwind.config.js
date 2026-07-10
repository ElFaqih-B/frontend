/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        accent: 'var(--accent)',
        bg: 'var(--bg)',
        raised: 'var(--bg-raised)',
        panel: 'var(--bg-panel)',
        hover: 'var(--bg-hover)',
        borderc: 'var(--border)',
        soft: 'var(--border-soft)',
        textc: 'var(--text)',
        dim: 'var(--text-dim)',
        faint: 'var(--text-faint)',
        green: 'var(--green)',
        red: 'var(--red)',
        yellow: 'var(--yellow)',
        blue: 'var(--blue)',
      },
      borderRadius: {
        panel: 'var(--radius)',
      },
    },
  },
  plugins: [],
}
