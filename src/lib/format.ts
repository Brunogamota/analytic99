export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const inteiro = new Intl.NumberFormat('pt-BR')
const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export const fmtInt = (v: number) => inteiro.format(Math.round(v))
export const fmtMoeda = (v: number) => moeda.format(v)
export const fmtPct = (v: number, casas = 1) =>
  `${(v * 100).toFixed(casas).replace('.', ',')}%`
export const fmtDec = (v: number, casas = 2) => v.toFixed(casas).replace('.', ',')
