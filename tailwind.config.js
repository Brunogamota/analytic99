/** @type {import('tailwindcss').Config} */

/** Token que troca de valor entre os temas — o valor mora no index.css. */
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Instrument Serif', 'ui-serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      /**
       * Rosa, branco e preto, na estrutura do iFood: uma cor de marca só, sobre
       * neutros puros. Todo token vem de CSS variable, então o tema escuro
       * troca os valores sem que nenhum componente saiba disso.
       *
       * Os nomes semânticos apontam todos para a mesma família: o que precisa
       * de ação sai em rosa, o que está bem fica no neutro do texto. Cor só
       * onde há decisão.
       */
      colors: {
        rosa: {
          DEFAULT: v('rosa'),
          escuro: v('rosa-escuro'),
          claro: v('rosa-claro'),
          fundo: v('rosa-fundo'),
        },
        laranja: { DEFAULT: v('rosa'), escuro: v('rosa-escuro'), fundo: v('rosa-fundo') },
        amarelo: { DEFAULT: v('rosa-claro'), claro: v('rosa-claro'), fundo: v('rosa-fundo') },
        verde: { DEFAULT: v('ink'), fundo: v('hairline') },
        ink: v('ink'),
        muted: v('muted'),
        hairline: v('hairline'),
        stroke: v('stroke'),
        control: v('control'),
        /** Superfície de card, diálogo e menu — branca no claro, grafite no escuro. */
        superficie: v('superficie'),
        /** Texto que fica sobre `bg-ink`: inverte junto com ele. */
        'sobre-ink': v('sobre-ink'),
        areia: { DEFAULT: v('areia'), barra: v('areia-barra'), ativo: v('areia-ativo') },
        noite: { DEFAULT: v('ink'), claro: v('noite-claro'), texto: v('muted') },
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
