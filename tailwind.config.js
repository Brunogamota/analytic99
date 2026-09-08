/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Instrument Serif', 'ui-serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      /**
       * Rosa, branco e preto. A estrutura é a do iFood — uma cor de marca só,
       * sobre branco e preto, com neutros puros. O rosa aqui é o da equipe.
       *
       * Os nomes semânticos continuam existindo para não quebrar chamadas, mas
       * apontam todos para a mesma família: o que precisa de ação sai em rosa,
       * o que está bem fica em preto ou cinza. Cor só onde há decisão.
       */
      colors: {
        rosa: { DEFAULT: '#E31C79', escuro: '#A8125A', claro: '#F286B7', fundo: '#FDEAF2' },
        // Alerta forte e atenção leve: dois pesos do mesmo rosa.
        laranja: { DEFAULT: '#E31C79', escuro: '#A8125A', fundo: '#FDEAF2' },
        amarelo: { DEFAULT: '#F286B7', claro: '#F9C4DC', fundo: '#FDF3F8' },
        // "Positivo" não ganha cor própria: fica no preto do texto.
        verde: { DEFAULT: '#111111', fundo: '#F5F5F5' },
        ink: '#111111',
        muted: '#737373',
        hairline: '#F5F5F5',
        stroke: '#E7E7E7',
        control: '#D4D4D4',
        areia: { DEFAULT: '#FFFFFF', barra: '#FAFAFA', ativo: '#F0F0F0' },
        noite: { DEFAULT: '#111111', claro: '#2A2A2A', texto: '#A3A3A3' },
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
