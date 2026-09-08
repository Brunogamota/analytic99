/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Títulos de página, como o Manus usa.
        serif: ['Instrument Serif', 'ui-serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        // Neutros quentes do Manus.
        areia: { DEFAULT: '#FAFAF9', barra: '#F2F1EF', ativo: '#E6E4E0' },
        ink: '#1C1B1A',
        muted: '#78716C',
        hairline: '#F0EFED',
        stroke: '#E4E1DD',
        control: '#D6D3D1',
        // Paleta 99: amarelo é identidade, laranja é ação, magenta é o acento
        // que também é a cor da equipe.
        amarelo: { DEFAULT: '#FFDD00', claro: '#FFEB66', fundo: '#FEF6D9' },
        laranja: { DEFAULT: '#FC4C02', escuro: '#C23A02', fundo: '#FDEDE6' },
        rosa: { DEFAULT: '#E31C79', escuro: '#A8125A', fundo: '#FCE9F1' },
        verde: { DEFAULT: '#047857', fundo: '#E7F5EE' },
        noite: { DEFAULT: '#1C1B1A', claro: '#3A3835', texto: '#A8A29E' },
      },
      fontSize: {
        micro: ['11px', '16px'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
