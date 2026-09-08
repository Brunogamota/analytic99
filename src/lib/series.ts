import { dataset } from '@/data/seed'
import type { TipoReclamacao } from '@/data/types'
import { formatarDia } from './periodo'
import { nomeExecutivo, type Snapshot } from './queries'

/** Conversão do produto inteiro: pedidos por hora online. */
const conversaoDe = (pedidos: number, horas: number) => (horas === 0 ? 0 : pedidos / horas)

export interface PontoDiario {
  dia: string
  rotulo: string
  pedidos: number
  receita: number
  horas: number
  conversao: number
}

export function serieDiaria(s: Snapshot): PontoDiario[] {
  const noPeriodo = (d: string) => d >= s.periodo.inicio && d <= s.periodo.fim

  const pedidos = new Map<string, number>()
  const receita = new Map<string, number>()
  for (const o of dataset.pedidos) {
    if (!s.ids.has(o.id_parceiro) || !noPeriodo(o.data)) continue
    pedidos.set(o.data, (pedidos.get(o.data) ?? 0) + 1)
    receita.set(o.data, (receita.get(o.data) ?? 0) + o.valor)
  }

  const horas = new Map<string, number>()
  for (const h of dataset.horas) {
    if (!s.ids.has(h.id_parceiro) || !noPeriodo(h.data)) continue
    horas.set(h.data, (horas.get(h.data) ?? 0) + h.horas_online)
  }

  return s.dias.map((dia) => {
    const p = pedidos.get(dia) ?? 0
    const h = horas.get(dia) ?? 0
    return {
      dia,
      rotulo: formatarDia(dia),
      pedidos: p,
      receita: receita.get(dia) ?? 0,
      horas: h,
      conversao: conversaoDe(p, h),
    }
  })
}

export const META_ADERENCIA = 0.8

export interface PontoAderencia {
  executivo: string
  aderencia: number
  meta: number
}

export function serieAderenciaPorExecutivo(s: Snapshot): PontoAderencia[] {
  const cumpridos = new Map<string, number>()
  const possiveis = new Map<string, number>()

  for (const promo of s.promos) {
    cumpridos.set(promo.id_executivo, (cumpridos.get(promo.id_executivo) ?? 0) + promo.dias_aderencia)
    possiveis.set(promo.id_executivo, (possiveis.get(promo.id_executivo) ?? 0) + promo.dias_periodo)
  }

  return [...possiveis.entries()]
    .map(([id, total]) => ({
      executivo: nomeExecutivo(id),
      aderencia: total === 0 ? 0 : (cumpridos.get(id) ?? 0) / total,
      meta: META_ADERENCIA,
    }))
    .sort((a, b) => a.aderencia - b.aderencia)
}

const ROTULO_RECLAMACAO: Record<TipoReclamacao, string> = {
  atraso: 'Atraso',
  pedido_errado: 'Pedido errado',
  qualidade: 'Qualidade',
  cancelamento: 'Cancelamento',
}

export interface PontoReclamacao {
  tipo: string
  total: number
}

export function serieReclamacoesPorTipo(s: Snapshot): PontoReclamacao[] {
  const totais = new Map<TipoReclamacao, number>()
  for (const r of dataset.reclamacoes) {
    if (!s.ids.has(r.id_parceiro) || r.data < s.periodo.inicio || r.data > s.periodo.fim) continue
    totais.set(r.tipo, (totais.get(r.tipo) ?? 0) + 1)
  }

  const tipos = Object.keys(ROTULO_RECLAMACAO) as TipoReclamacao[]
  return tipos.map((tipo) => ({ tipo: ROTULO_RECLAMACAO[tipo], total: totais.get(tipo) ?? 0 }))
}
