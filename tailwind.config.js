/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Paleta 99: amarelo é identidade, laranja é ação, preto é âncora.
        amarelo: { DEFAULT: '#FFDD00', claro: '#FFEB66', fundo: '#FFF9D6' },
        laranja: { DEFAULT: '#FC4C02', escuro: '#C23A02', fundo: '#FFF1EB' },
        // Magenta 99Pay — também é a cor da equipe.
        rosa: { DEFAULT: '#E31C79', escuro: '#A8125A', fundo: '#FDEBF3' },
        ink: '#212121',
        muted: '#6B7280',
        hairline: '#F3F4F6',
        stroke: '#E5E7EB',
        control: '#D1D5DB',
        // Sidebar preta da marca.
        noite: { DEFAULT: '#212121', claro: '#333333', texto: '#B8B8B8' },
      },
      fontSize: {
        micro: ['11px', '16px'],
      },
    },
  },
  plugins: [],
}
