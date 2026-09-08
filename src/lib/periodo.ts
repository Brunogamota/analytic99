import { HOJE, MES_ANTERIOR, MES_ATUAL } from '@/data/seed'

export type PeriodoTipo = 'mes_atual' | 'mes_anterior' | 'custom'

export interface Periodo {
  tipo: PeriodoTipo
  inicio: string
  fim: string
}

const MES_LABEL = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

export function ultimoDia(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const iso = `${mes}-${String(total).padStart(2, '0')}`
  return iso > HOJE ? HOJE : iso
}

export function periodoDeMes(mes: string, tipo: PeriodoTipo): Periodo {
  return { tipo, inicio: `${mes}-01`, fim: ultimoDia(mes) }
}

export const PERIODO_PADRAO = periodoDeMes(MES_ATUAL, 'mes_atual')

export function addDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export function diffDias(inicio: string, fim: string): number {
  const a = Date.parse(`${inicio}T00:00:00Z`)
  const b = Date.parse(`${fim}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000) + 1
}

export function listarDias(p: Periodo): string[] {
  const out: string[] = []
  for (let d = p.inicio; d <= p.fim; d = addDias(d, 1)) out.push(d)
  return out
}

/** Meses tocados pelo período — fato_promo e hist_banner têm granularidade mensal. */
export function mesesDoPeriodo(p: Periodo): string[] {
  const set = new Set(listarDias(p).map((d) => d.slice(0, 7)))
  return [...set].sort()
}

/**
 * Período de comparação. Quando o recorte começa no dia 1, compara com o mesmo
 * intervalo de dias do mês anterior (1–8 de setembro vs 1–8 de agosto). Fora
 * disso, desloca o mesmo número de dias para trás.
 */
export function periodoAnterior(p: Periodo): Periodo {
  const n = diffDias(p.inicio, p.fim)
  if (p.inicio.endsWith('-01')) {
    const [y, m] = p.inicio.split('-').map(Number)
    const prev = new Date(Date.UTC(y, m - 2, 1))
    const mes = prev.toISOString().slice(0, 7)
    const inicio = `${mes}-01`
    const fimMax = ultimoDia(mes)
    const fim = addDias(inicio, n - 1)
    return { tipo: 'custom', inicio, fim: fim > fimMax ? fimMax : fim }
  }
  return { tipo: 'custom', inicio: addDias(p.inicio, -n), fim: addDias(p.inicio, -1) }
}

/** Desloca o recorte inteiro para frente ou para trás — usado pelas setas < >. */
export function deslocar(p: Periodo, direcao: -1 | 1): Periodo {
  if (p.tipo !== 'custom' || p.inicio.endsWith('-01')) {
    const [y, m] = p.inicio.split('-').map(Number)
    const alvo = new Date(Date.UTC(y, m - 1 + direcao, 1)).toISOString().slice(0, 7)
    if (alvo > MES_ATUAL) return p
    const tipo: PeriodoTipo =
      alvo === MES_ATUAL ? 'mes_atual' : alvo === MES_ANTERIOR ? 'mes_anterior' : 'custom'
    return periodoDeMes(alvo, tipo)
  }
  const n = diffDias(p.inicio, p.fim)
  const inicio = addDias(p.inicio, direcao * n)
  const fim = addDias(p.fim, direcao * n)
  if (inicio > HOJE) return p
  return { tipo: 'custom', inicio, fim: fim > HOJE ? HOJE : fim }
}

export function podeAvancar(p: Periodo): boolean {
  return p.fim < HOJE
}

export function formatarDia(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MES_LABEL[m - 1]}`
}

export function rotuloPeriodo(p: Periodo): string {
  if (p.inicio.slice(0, 7) === p.fim.slice(0, 7)) {
    const [y, m] = p.inicio.split('-').map(Number)
    const mesInteiro = p.inicio.endsWith('-01') && p.fim === ultimoDia(p.inicio.slice(0, 7))
    if (mesInteiro) return `${MES_LABEL[m - 1]}/${y}`
  }
  return `${formatarDia(p.inicio)} → ${formatarDia(p.fim)}`
}
