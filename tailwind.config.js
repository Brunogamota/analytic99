/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ink: '#111827',
        muted: '#6B7280',
        hairline: '#F3F4F6',
        stroke: '#E5E7EB',
        control: '#D1D5DB',
        accent: '#7C3AED',
      },
      fontSize: {
        micro: ['11px', '16px'],
      },
    },
  },
  plugins: [],
}
