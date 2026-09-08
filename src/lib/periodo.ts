import { HOJE, MES_ANTERIOR, MES_ATUAL } from '@/data/seed'

export type PeriodoTipo =
  | 'hoje'
  | 'ontem'
  | 'ultimos_7'
  | 'ultimos_30'
  | 'mes_atual'
  | 'mes_anterior'
  | 'custom'

/** Atalhos por mês navegam mês a mês; os por dia deslizam pelo próprio tamanho. */
const TIPOS_MENSAIS: PeriodoTipo[] = ['mes_atual', 'mes_anterior']

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

export const ATALHOS: { tipo: PeriodoTipo; label: string }[] = [
  { tipo: 'hoje', label: 'Hoje' },
  { tipo: 'ontem', label: 'Ontem' },
  { tipo: 'ultimos_7', label: 'Últimos 7 dias' },
  { tipo: 'ultimos_30', label: 'Últimos 30 dias' },
  { tipo: 'mes_atual', label: 'Mês atual' },
  { tipo: 'mes_anterior', label: 'Mês anterior' },
]

export function periodoDoAtalho(tipo: PeriodoTipo): Periodo {
  switch (tipo) {
    case 'hoje':
      return { tipo, inicio: HOJE, fim: HOJE }
    case 'ontem': {
      const d = addDias(HOJE, -1)
      return { tipo, inicio: d, fim: d }
    }
    case 'ultimos_7':
      return { tipo, inicio: addDias(HOJE, -6), fim: HOJE }
    case 'ultimos_30':
      return { tipo, inicio: addDias(HOJE, -29), fim: HOJE }
    case 'mes_anterior':
      return periodoDeMes(MES_ANTERIOR, tipo)
    default:
      return periodoDeMes(MES_ATUAL, 'mes_atual')
  }
}

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
  if (TIPOS_MENSAIS.includes(p.tipo) || (p.tipo === 'custom' && p.inicio.endsWith('-01'))) {
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
  if (p.tipo === 'hoje') return 'Hoje'
  if (p.tipo === 'ontem') return 'Ontem'
  if (p.inicio === p.fim) return formatarDia(p.inicio)
  if (p.inicio.slice(0, 7) === p.fim.slice(0, 7)) {
    const [y, m] = p.inicio.split('-').map(Number)
    const mesInteiro = p.inicio.endsWith('-01') && p.fim === ultimoDia(p.inicio.slice(0, 7))
    if (mesInteiro) return `${MES_LABEL[m - 1]}/${y}`
  }
  return `${formatarDia(p.inicio)} → ${formatarDia(p.fim)}`
}
