import { dataset } from '@/data/seed'
import type { Papel as PapelEquipe } from './equipe'
import { fmtDec, fmtInt, fmtPct } from './format'
import type { Filtros, Snapshot } from './queries'

/**
 * Quem está olhando o dashboard. A gestora é o `gerente` de `equipe.ts` visto do
 * lado de quem usa a tela; o executivo é o mesmo papel, sem tradução.
 */
export type Papel = 'gestora' | Extract<PapelEquipe, 'executivo'>

export interface PerfilGestora {
  tipo: 'gestora'
}

export interface PerfilExecutivo {
  tipo: 'executivo'
  id_executivo: string
  nome: string
}

export type PerfilAtivo = PerfilGestora | PerfilExecutivo

export const PERFIL_GESTORA: PerfilAtivo = { tipo: 'gestora' }

export const ROTULO_PERFIL = (p: PerfilAtivo): string =>
  p.tipo === 'gestora' ? 'Gestora' : p.nome

export function perfisDisponiveis(): PerfilAtivo[] {
  return [
    PERFIL_GESTORA,
    ...dataset.executivos.map<PerfilAtivo>((e) => ({
      tipo: 'executivo',
      id_executivo: e.id_executivo,
      nome: e.nome,
    })),
  ]
}

/**
 * O recorte do perfil. Para o executivo o filtro é imposto, não sugerido:
 * gerente e praça voltam ao aberto para que nada herdado da visão da gestora
 * esvazie ou estreite a carteira dele — o período é a única coisa que sobrevive.
 */
export function filtrosDoPerfil(perfil: PerfilAtivo, base: Filtros): Filtros {
  if (perfil.tipo === 'gestora') return base
  return {
    periodo: base.periodo,
    gerentes: [],
    executivos: [perfil.id_executivo],
    praca: null,
  }
}

// ---------------------------------------------------------------------------
// Metas do executivo
// ---------------------------------------------------------------------------

export type UnidadeMeta = 'percentual' | 'parceiros' | 'razao' | 'taxa'

export interface MetaExecutivo {
  rotulo: string
  valor: number
  meta: number
  unidade: UnidadeMeta
  atingido: boolean
}

/** Só a carteira do executivo dentro do snapshot recebido. */
function carteiraDe(s: Snapshot, id_executivo: string) {
  const parceiros = s.parceiros.filter((p) => p.id_executivo === id_executivo)
  const ids = new Set(parceiros.map((p) => p.id_parceiro))
  return { parceiros, ids, promos: s.promos.filter((x) => ids.has(x.id_parceiro)) }
}

export function metasDoExecutivo(s: Snapshot, id_executivo: string): MetaExecutivo[] {
  const { parceiros, ids, promos } = carteiraDe(s, id_executivo)

  let diasAderencia = 0
  let diasPeriodo = 0
  let budgetReal = 0
  let budgetNeeded = 0
  for (const p of promos) {
    diasAderencia += p.dias_aderencia
    diasPeriodo += p.dias_periodo
    budgetReal += p.budget_real
    budgetNeeded += p.budget_needed
  }
  const aderencia = diasPeriodo === 0 ? 0 : diasAderencia / diasPeriodo
  const budget = budgetNeeded === 0 ? 0 : budgetReal / budgetNeeded

  const ativos = parceiros.filter((p) => (s.horasPorParceiro.get(p.id_parceiro) ?? 0) > 0).length

  let reclamacoes = 0
  let pedidos = 0
  for (const id of ids) {
    reclamacoes += s.reclamacoes.get(id) ?? 0
    pedidos += s.pedidosPorParceiro.get(id) ?? 0
  }
  const taxa = pedidos === 0 ? 0 : (reclamacoes / pedidos) * 100

  return [
    {
      rotulo: 'Aderência das promoções',
      valor: aderencia,
      meta: 0.8,
      unidade: 'percentual',
      atingido: aderencia >= 0.8,
    },
    {
      rotulo: 'Parceiros ativos',
      valor: ativos,
      meta: parceiros.length,
      unidade: 'parceiros',
      atingido: parceiros.length > 0 && ativos === parceiros.length,
    },
    {
      rotulo: 'Budget consumido',
      valor: budget,
      meta: 1,
      unidade: 'razao',
      atingido: budget >= 0.9 && budget <= 1.1,
    },
    {
      rotulo: 'Reclamações por 100 pedidos',
      valor: taxa,
      meta: 3,
      unidade: 'taxa',
      atingido: taxa <= 3,
    },
  ]
}

export function formatarMeta(valor: number, unidade: UnidadeMeta): string {
  switch (unidade) {
    case 'percentual':
    case 'razao':
      return fmtPct(valor, 0)
    case 'parceiros':
      return fmtInt(valor)
    case 'taxa':
      return fmtDec(valor, 1)
  }
}

export function textoDaMeta(m: MetaExecutivo): string {
  switch (m.unidade) {
    case 'percentual':
      return `Meta ${fmtPct(m.meta, 0)} ou mais`
    case 'parceiros':
      return `Meta ${fmtInt(m.meta)} — a carteira inteira`
    case 'razao':
      return 'Meta entre 90% e 110% do previsto'
    case 'taxa':
      return `Meta ${fmtDec(m.meta, 1)} ou menos`
  }
}

/**
 * Barra cheia significa a mesma coisa nas quatro metas: cumprida. Sem isso, a
 * de reclamações encheria justamente quando o número está ruim.
 */
export function progressoDaMeta(m: MetaExecutivo): number {
  const limitar = (v: number) => Math.max(0, Math.min(1, v))
  switch (m.unidade) {
    case 'percentual':
    case 'parceiros':
      return m.meta === 0 ? 0 : limitar(m.valor / m.meta)
    case 'razao':
      return m.meta === 0 ? 0 : limitar(1 - Math.abs(m.valor - m.meta) / m.meta)
    case 'taxa':
      return m.valor <= m.meta ? 1 : limitar(m.meta / m.valor)
  }
}
