import { dataset } from '@/data/seed'
import type { DimParceiro } from '@/data/types'
import type { Membro } from './equipe'
import { alertas, nomeExecutivo, type Alerta, type Snapshot } from './queries'

/** Só tokens da paleta: rosa, amarelo, preto, laranja e verde. */
export const CORES_TIME: string[] = ['#E31C79', '#F286B7', '#111111', '#E31C79', '#111111']

export interface Time {
  id: string
  nome: string
  handle: string
  descricao: string
  cor: string
  /** Ids de `Membro` (`equipe.ts`): gerentes `G..`, executivos `E..`. */
  membros: string[]
}

export function handleDe(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Duas letras para o avatar: "Comercial São Paulo" → "CS", "Bruno" → "BR". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

/** O amarelo da marca não sustenta texto branco. */
export const corTexto = (cor: string): string => (cor === '#F286B7' ? '#111111' : '#FFFFFF')

export function timesIniciais(): Time[] {
  return dataset.gerentes.map((g, i) => {
    const executivos = dataset.executivos.filter((e) => e.id_gerente === g.id_gerente)
    const nome = `Comercial ${g.regiao}`
    return {
      id: `T${String(i + 1).padStart(2, '0')}`,
      nome,
      handle: handleDe(nome),
      descricao: `Carteira de ${g.regiao} acompanhada por ${g.nome}.`,
      cor: CORES_TIME[i % CORES_TIME.length],
      membros: [g.id_gerente, ...executivos.map((e) => e.id_executivo)],
    }
  })
}

/**
 * Carteira que responde ao membro. Gerente não tem parceiro no próprio nome: o
 * que ele acompanha é a soma dos executivos dele.
 */
export function executivosDoMembro(m: Membro): string[] {
  if (m.papel === 'executivo') return [m.id]
  if (m.papel === 'gerente') {
    return dataset.executivos.filter((e) => e.id_gerente === m.id).map((e) => e.id_executivo)
  }
  return []
}

export function executivosDoTime(membros: Membro[]): string[] {
  return [...new Set(membros.flatMap(executivosDoMembro))]
}

export function parceirosDoTime(s: Snapshot, idsExecutivos: string[]): DimParceiro[] {
  const alvo = new Set(idsExecutivos)
  return s.parceiros.filter((p) => alvo.has(p.id_executivo))
}

export interface MetricasTime {
  parceiros: number
  ativos: number
  aderencia: number
  receita: number
}

export function metricasTime(s: Snapshot, idsExecutivos: string[]): MetricasTime {
  const parceiros = parceirosDoTime(s, idsExecutivos)
  const ids = new Set(parceiros.map((p) => p.id_parceiro))

  let dias = 0
  let periodo = 0
  for (const promo of s.promos) {
    if (!ids.has(promo.id_parceiro)) continue
    dias += promo.dias_aderencia
    periodo += promo.dias_periodo
  }

  let receita = 0
  let ativos = 0
  for (const id of ids) {
    receita += s.receitaPorParceiro.get(id) ?? 0
    if ((s.horasPorParceiro.get(id) ?? 0) > 0) ativos++
  }

  return {
    parceiros: parceiros.length,
    ativos,
    aderencia: periodo === 0 ? 0 : dias / periodo,
    receita,
  }
}

/** Os alertas do recorte que caem no colo dos executivos deste time. */
export function alertasDoTime(s: Snapshot, idsExecutivos: string[]): Alerta[] {
  const nomes = new Set(idsExecutivos.map(nomeExecutivo))
  const out: Alerta[] = []
  for (const a of alertas(s)) {
    const linhas = a.linhas.filter((l) => nomes.has(l.executivo))
    if (linhas.length > 0) out.push({ ...a, linhas })
  }
  return out
}

export function totalAlertas(lista: Alerta[]): number {
  return lista.reduce((acc, a) => acc + a.linhas.length, 0)
}
