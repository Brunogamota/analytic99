import { dataset } from '@/data/seed'
import type { Categoria, DimParceiro, FatoPromo, TipoPromo } from '@/data/types'
import { ultimoDia, type Periodo } from './periodo'
import {
  nomeExecutivo,
  nomeGerente,
  rotuloPromo,
  statusBanner,
  type Snapshot,
  type StatusBanner,
} from './queries'

export type Dimensao = 'praca' | 'categoria' | 'gerente' | 'executivo'

export const DIMENSOES: { chave: Dimensao; rotulo: string }[] = [
  { chave: 'praca', rotulo: 'Praça' },
  { chave: 'categoria', rotulo: 'Categoria' },
  { chave: 'gerente', rotulo: 'Gerente' },
  { chave: 'executivo', rotulo: 'Executivo' },
]

export const ROTULO_DIMENSAO: Record<Dimensao, string> = {
  praca: 'Praça',
  categoria: 'Categoria',
  gerente: 'Gerente',
  executivo: 'Executivo',
}

export interface LinhaResumo {
  chave: string
  rotulo: string
  parceiros: number
  ativos: number
  pedidos: number
  receita: number
  horas: number
  conversao: number
  conversao_anterior: number
  var_conversao: number | null
  receita_anterior: number
  var_receita: number | null
  pct_aderencia: number
  budget_needed: number
  budget_real: number
  razao_budget: number
}

export interface LinhaParceiro {
  id_parceiro: string
  parceiro: string
  categoria: Categoria
  praca: string
  executivo: string
  gerente: string
  dias_ativos: number
  horas: number
  pedidos: number
  receita: number
  ticket_medio: number
  conversao: number
  conversao_anterior: number
  var_conversao: number | null
  pct_aderencia: number
  budget_needed: number
  budget_real: number
  promos: string
  banner: StatusBanner
}

const ROTULO_CATEGORIA: Record<Categoria, string> = {
  pizza: 'Pizza',
  burger: 'Burger',
  combo: 'Combo',
}

export const rotuloCategoria = (c: Categoria) => ROTULO_CATEGORIA[c] ?? c

const gerentePorExecutivo = new Map(dataset.executivos.map((e) => [e.id_executivo, e.id_gerente]))

export const nomeGerenteDoExecutivo = (idExecutivo: string) =>
  nomeGerente(gerentePorExecutivo.get(idExecutivo) ?? '')

/** Base zero não tem variação: devolve null para a interface mostrar "—". */
export function variacao(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : (atual - anterior) / anterior
}

/** Taxa por 100 — mesma regra: sem denominador não existe número, existe "—". */
export function porCem(parte: number, total: number): number | null {
  return total === 0 ? null : (parte * 100) / total
}

/** Sufixo do arquivo exportado: `2026-09` no mês inteiro, o intervalo cru fora dele. */
export function sufixoPeriodo(p: Periodo): string {
  const mes = p.inicio.slice(0, 7)
  const mesInteiro = p.inicio.endsWith('-01') && p.fim === ultimoDia(mes)
  return mesInteiro ? mes : `${p.inicio}_a_${p.fim}`
}

export function conversao(pedidos: number, horas: number): number {
  return horas === 0 ? 0 : pedidos / horas
}

function chaveDimensao(p: DimParceiro, d: Dimensao): string {
  if (d === 'praca') return p.praca
  if (d === 'categoria') return p.categoria
  if (d === 'gerente') return gerentePorExecutivo.get(p.id_executivo) ?? ''
  return p.id_executivo
}

function rotuloDaChave(chave: string, d: Dimensao): string {
  if (d === 'categoria') return ROTULO_CATEGORIA[chave as Categoria] ?? chave
  if (d === 'gerente') return nomeGerente(chave)
  if (d === 'executivo') return nomeExecutivo(chave)
  return chave
}

interface Agregado {
  parceiros: number
  ativos: number
  pedidos: number
  receita: number
  horas: number
  dias_aderencia: number
  dias_periodo: number
  budget_needed: number
  budget_real: number
}

const vazio = (): Agregado => ({
  parceiros: 0,
  ativos: 0,
  pedidos: 0,
  receita: 0,
  horas: 0,
  dias_aderencia: 0,
  dias_periodo: 0,
  budget_needed: 0,
  budget_real: 0,
})

function promosPorParceiro(s: Snapshot): Map<string, FatoPromo[]> {
  const out = new Map<string, FatoPromo[]>()
  for (const promo of s.promos) {
    const lista = out.get(promo.id_parceiro) ?? []
    lista.push(promo)
    out.set(promo.id_parceiro, lista)
  }
  return out
}

function agregar(s: Snapshot, d: Dimensao): Map<string, Agregado> {
  const promos = promosPorParceiro(s)
  const out = new Map<string, Agregado>()
  for (const p of s.parceiros) {
    const chave = chaveDimensao(p, d)
    const acc = out.get(chave) ?? vazio()
    const horas = s.horasPorParceiro.get(p.id_parceiro) ?? 0
    acc.parceiros++
    if (horas > 0) acc.ativos++
    acc.horas += horas
    acc.pedidos += s.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    acc.receita += s.receitaPorParceiro.get(p.id_parceiro) ?? 0
    for (const promo of promos.get(p.id_parceiro) ?? []) {
      acc.dias_aderencia += promo.dias_aderencia
      acc.dias_periodo += promo.dias_periodo
      acc.budget_needed += promo.budget_needed
      acc.budget_real += promo.budget_real
    }
    out.set(chave, acc)
  }
  return out
}

export function resumoPorDimensao(
  atual: Snapshot,
  anterior: Snapshot,
  dimensao: Dimensao,
): LinhaResumo[] {
  const agora = agregar(atual, dimensao)
  const antes = agregar(anterior, dimensao)

  const linhas: LinhaResumo[] = []
  for (const [chave, a] of agora) {
    const b = antes.get(chave) ?? vazio()
    const conv = conversao(a.pedidos, a.horas)
    const convAnterior = conversao(b.pedidos, b.horas)
    linhas.push({
      chave,
      rotulo: rotuloDaChave(chave, dimensao),
      parceiros: a.parceiros,
      ativos: a.ativos,
      pedidos: a.pedidos,
      receita: a.receita,
      horas: a.horas,
      conversao: conv,
      conversao_anterior: convAnterior,
      var_conversao: variacao(conv, convAnterior),
      receita_anterior: b.receita,
      var_receita: variacao(a.receita, b.receita),
      pct_aderencia: a.dias_periodo === 0 ? 0 : a.dias_aderencia / a.dias_periodo,
      budget_needed: a.budget_needed,
      budget_real: a.budget_real,
      razao_budget: a.budget_needed === 0 ? 0 : a.budget_real / a.budget_needed,
    })
  }
  return linhas.sort((x, y) => y.receita - x.receita)
}

/** Dias do recorte com hora online registrada acima de zero. */
function diasAtivos(s: Snapshot): Map<string, number> {
  const out = new Map<string, number>()
  for (const h of dataset.horas) {
    if (!s.ids.has(h.id_parceiro) || h.horas_online <= 0) continue
    if (h.data < s.periodo.inicio || h.data > s.periodo.fim) continue
    out.set(h.id_parceiro, (out.get(h.id_parceiro) ?? 0) + 1)
  }
  return out
}

const ORDEM_PROMO: TipoPromo[] = ['smart', 'banner', 'special']

export function detalhePorParceiro(atual: Snapshot, anterior: Snapshot): LinhaParceiro[] {
  const promos = promosPorParceiro(atual)
  const ativos = diasAtivos(atual)
  const banners = new Map(statusBanner(atual).map((b) => [b.id_parceiro, b.status]))

  return atual.parceiros
    .map((p) => {
      const horas = atual.horasPorParceiro.get(p.id_parceiro) ?? 0
      const pedidos = atual.pedidosPorParceiro.get(p.id_parceiro) ?? 0
      const receita = atual.receitaPorParceiro.get(p.id_parceiro) ?? 0
      const horasAnt = anterior.horasPorParceiro.get(p.id_parceiro) ?? 0
      const pedidosAnt = anterior.pedidosPorParceiro.get(p.id_parceiro) ?? 0
      const lista = promos.get(p.id_parceiro) ?? []

      let dias = 0
      let periodo = 0
      let needed = 0
      let real = 0
      const tipos = new Set<TipoPromo>()
      for (const promo of lista) {
        dias += promo.dias_aderencia
        periodo += promo.dias_periodo
        needed += promo.budget_needed
        real += promo.budget_real
        tipos.add(promo.tipo_promo)
      }

      const conv = conversao(pedidos, horas)
      const convAnterior = conversao(pedidosAnt, horasAnt)

      return {
        id_parceiro: p.id_parceiro,
        parceiro: p.nome,
        categoria: p.categoria,
        praca: p.praca,
        executivo: nomeExecutivo(p.id_executivo),
        gerente: nomeGerenteDoExecutivo(p.id_executivo),
        dias_ativos: ativos.get(p.id_parceiro) ?? 0,
        horas,
        pedidos,
        receita,
        ticket_medio: pedidos === 0 ? 0 : receita / pedidos,
        conversao: conv,
        conversao_anterior: convAnterior,
        var_conversao: variacao(conv, convAnterior),
        pct_aderencia: periodo === 0 ? 0 : dias / periodo,
        budget_needed: needed,
        budget_real: real,
        promos: ORDEM_PROMO.filter((t) => tipos.has(t)).map(rotuloPromo).join(', '),
        banner: banners.get(p.id_parceiro) ?? 'Nunca teve',
      }
    })
    .sort((a, b) => b.receita - a.receita)
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export interface ColunaCsv<T> {
  titulo: string
  valor: (linha: T) => string | number | null
}

function celula(v: string | number | null): string {
  if (v === null) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    const texto = Number.isInteger(v) ? String(v) : v.toFixed(2)
    return texto.replace('.', ',')
  }
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** Ponto e vírgula, decimal com vírgula e BOM: o Excel pt-BR abre sem etapa extra. */
export function paraCsv<T>(linhas: T[], colunas: ColunaCsv<T>[]): string {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(';')
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'))
  return `﻿${[cabecalho, ...corpo].join('\r\n')}\r\n`
}
