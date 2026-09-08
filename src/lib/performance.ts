import { dataset } from '@/data/seed'
import type { Categoria, DimParceiro } from '@/data/types'
import { fmtDec, fmtInt, fmtMoeda, fmtPct } from './format'
import { formatarDia } from './periodo'
import { nomeExecutivo, type Snapshot } from './queries'
import { conversao, nomeGerenteDoExecutivo, rotuloCategoria, variacao } from './relatorio'
import { META_ADERENCIA } from './series'

// ---------------------------------------------------------------------------
// Recortes
// ---------------------------------------------------------------------------

export type Recorte = 'pessoa' | 'local' | 'categoria'
export type NivelLocal = 'praca' | 'cidade'

export const RECORTES: { chave: Recorte; rotulo: string; descricao: string }[] = [
  { chave: 'pessoa', rotulo: 'Pessoa', descricao: 'Uma linha por executivo da carteira.' },
  { chave: 'local', rotulo: 'Local', descricao: 'Praça do parceiro, com descida para cidade.' },
  { chave: 'categoria', rotulo: 'Categoria', descricao: 'Pizza, burger e combo lado a lado.' },
]

export const ROTULO_RECORTE: Record<Recorte, string> = {
  pessoa: 'Pessoa',
  local: 'Local',
  categoria: 'Categoria',
}

/** Cabeçalho da primeira coluna da tabela em cada recorte. */
export const ROTULO_COLUNA: Record<Recorte, string> = {
  pessoa: 'Executivo',
  local: 'Local',
  categoria: 'Categoria',
}

// ---------------------------------------------------------------------------
// Chips de filtro
// ---------------------------------------------------------------------------

export type TipoChip = 'executivo' | 'praca' | 'cidade' | 'categoria'

export interface ChipFiltro {
  tipo: TipoChip
  /** Valor comparado contra o cadastro do parceiro (id no caso de executivo). */
  valor: string
  rotulo: string
}

export const ROTULO_TIPO_CHIP: Record<TipoChip, string> = {
  executivo: 'Pessoa',
  praca: 'Praça',
  cidade: 'Cidade',
  categoria: 'Categoria',
}

const valorDoParceiro = (p: DimParceiro, tipo: TipoChip): string =>
  tipo === 'executivo'
    ? p.id_executivo
    : tipo === 'praca'
      ? p.praca
      : tipo === 'cidade'
        ? p.cidade
        : p.categoria

/** Chips do mesmo tipo somam (OU); tipos diferentes se cruzam (E). */
export function aplicarChips(parceiros: DimParceiro[], chips: ChipFiltro[]): DimParceiro[] {
  if (chips.length === 0) return parceiros
  const porTipo = new Map<TipoChip, Set<string>>()
  for (const c of chips) {
    const set = porTipo.get(c.tipo) ?? new Set<string>()
    set.add(c.valor)
    porTipo.set(c.tipo, set)
  }
  return parceiros.filter((p) => {
    for (const [tipo, valores] of porTipo) {
      if (!valores.has(valorDoParceiro(p, tipo))) return false
    }
    return true
  })
}

const rotuloDoValor = (tipo: TipoChip, valor: string): string =>
  tipo === 'executivo'
    ? nomeExecutivo(valor)
    : tipo === 'categoria'
      ? rotuloCategoria(valor as Categoria)
      : valor

export function chipDe(tipo: TipoChip, valor: string): ChipFiltro {
  return { tipo, valor, rotulo: rotuloDoValor(tipo, valor) }
}

/** Valores que ainda podem virar chip, na ordem em que o menu deve mostrá-los. */
export function opcoesDeFiltro(
  parceiros: DimParceiro[],
  chips: ChipFiltro[],
): { tipo: TipoChip; opcoes: ChipFiltro[] }[] {
  const usados = new Set(chips.map((c) => `${c.tipo}|${c.valor}`))
  const tipos: TipoChip[] = ['executivo', 'praca', 'cidade', 'categoria']
  return tipos
    .map((tipo) => {
      const valores = [...new Set(parceiros.map((p) => valorDoParceiro(p, tipo)))]
      const opcoes = valores
        .map((v) => chipDe(tipo, v))
        .filter((c) => !usados.has(`${c.tipo}|${c.valor}`))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
      return { tipo, opcoes }
    })
    .filter((g) => g.opcoes.length > 0)
}

// ---------------------------------------------------------------------------
// A nota 0–100
//
// Quatro parcelas com peso fixo, todas construídas sobre indicador que já
// existe no modelo. Cada parcela vira "quanto dos seus pontos o grupo tirou":
//
//   Aderência (40)  dias_aderencia / dias_periodo, dividido pela meta de 80%.
//                   Bater a meta já leva os 40 pontos; metade da meta leva 20.
//   Conversão (30)  pedidos por hora online sobre a média do grupo no recorte.
//                   A média rende 25 de 30; 120% da média ou mais leva os 30.
//   Budget    (20)  |budget_real / budget_needed − 1| dividido pela tolerância
//                   de 50 p.p. Estourar e não usar caem no mesmo lado: 1,5×
//                   e 0,5× zeram igual, porque as duas coisas custam dinheiro.
//   Qualidade (10)  reclamações por 100 pedidos, invertido contra o limite de
//                   5 por 100. Zero reclamação leva os 10; 5 ou mais zera.
//
// Parcela sem base (grupo sem promo, sem hora online ou sem pedido) não vira
// zero — sai da conta, e os pesos restantes são reescalados para 100. Zero por
// falta de dado seria acusação sem prova.
// ---------------------------------------------------------------------------

export const PESOS = { aderencia: 40, conversao: 30, budget: 20, qualidade: 10 } as const

/** Conversão que leva a nota cheia, em múltiplos da média do grupo. */
export const TETO_CONVERSAO = 1.2
/** Distância de 1,0 na razão de budget que zera a parcela. */
export const TOLERANCIA_BUDGET = 0.5
/** Reclamações por 100 pedidos que zeram a parcela de qualidade. */
export const LIMITE_RECLAMACOES = 5

export type ChaveParcela = 'aderencia' | 'conversao' | 'budget' | 'qualidade'

export interface Parcela {
  chave: ChaveParcela
  rotulo: string
  peso: number
  /** null = sem base para medir; a parcela sai do cálculo. */
  pontos: number | null
  detalhe: string
}

export interface Nota {
  /** null = nenhuma parcela tinha base. A interface mostra "—". */
  valor: number | null
  parcelas: Parcela[]
  /** Soma dos pesos que entraram na conta — 100 quando as quatro valem. */
  peso_considerado: number
}

export interface EntradaNota {
  pct_aderencia: number | null
  conversao: number | null
  media_conversao: number
  razao_budget: number | null
  reclamacoes_por_100: number | null
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function calcularNota(e: EntradaNota): Nota {
  const razaoConversao =
    e.conversao === null || e.media_conversao === 0 ? null : e.conversao / e.media_conversao

  const parcelas: Parcela[] = [
    {
      chave: 'aderencia',
      rotulo: 'Aderência',
      peso: PESOS.aderencia,
      pontos:
        e.pct_aderencia === null
          ? null
          : PESOS.aderencia * clamp01(e.pct_aderencia / META_ADERENCIA),
      detalhe:
        e.pct_aderencia === null
          ? 'sem promo no período'
          : `${fmtPct(e.pct_aderencia)} dos dias · meta ${fmtPct(META_ADERENCIA, 0)}`,
    },
    {
      chave: 'conversao',
      rotulo: 'Conversão',
      peso: PESOS.conversao,
      pontos:
        razaoConversao === null
          ? null
          : PESOS.conversao * clamp01(razaoConversao / TETO_CONVERSAO),
      detalhe:
        razaoConversao === null
          ? 'sem hora online no período'
          : `${fmtPct(razaoConversao)} da média do grupo`,
    },
    {
      chave: 'budget',
      rotulo: 'Disciplina de budget',
      peso: PESOS.budget,
      pontos:
        e.razao_budget === null
          ? null
          : PESOS.budget * clamp01(1 - Math.abs(e.razao_budget - 1) / TOLERANCIA_BUDGET),
      detalhe:
        e.razao_budget === null
          ? 'sem budget previsto'
          : `${fmtPct(e.razao_budget)} do necessário`,
    },
    {
      chave: 'qualidade',
      rotulo: 'Qualidade',
      peso: PESOS.qualidade,
      pontos:
        e.reclamacoes_por_100 === null
          ? null
          : PESOS.qualidade * clamp01(1 - e.reclamacoes_por_100 / LIMITE_RECLAMACOES),
      detalhe:
        e.reclamacoes_por_100 === null
          ? 'sem pedido no período'
          : `${fmtDec(e.reclamacoes_por_100)} reclamações por 100 pedidos`,
    },
  ]

  let pontos = 0
  let peso = 0
  for (const p of parcelas) {
    if (p.pontos === null) continue
    pontos += p.pontos
    peso += p.peso
  }

  return {
    valor: peso === 0 ? null : (100 * pontos) / peso,
    parcelas,
    peso_considerado: peso,
  }
}

export type Faixa = 'excelente' | 'bom' | 'atencao' | 'critico' | 'indefinida'

export interface DescricaoFaixa {
  faixa: Faixa
  rotulo: string
  /** Cor do arco do donut e do ponto de status. Verde → amarelo → laranja. */
  cor: string
  tom: 'verde' | 'amarelo' | 'laranja' | 'cinza'
}

const FAIXAS: Record<Faixa, DescricaoFaixa> = {
  excelente: { faixa: 'excelente', rotulo: 'Excelente', cor: 'rgb(var(--ink))', tom: 'verde' },
  bom: { faixa: 'bom', rotulo: 'Bom', cor: 'rgb(var(--rosa-claro))', tom: 'amarelo' },
  atencao: { faixa: 'atencao', rotulo: 'Precisa de atenção', cor: 'rgb(var(--rosa))', tom: 'laranja' },
  critico: { faixa: 'critico', rotulo: 'Crítico', cor: 'rgb(var(--rosa-escuro))', tom: 'laranja' },
  indefinida: { faixa: 'indefinida', rotulo: 'Sem base', cor: 'rgb(var(--stroke))', tom: 'cinza' },
}

export function faixaNota(valor: number | null): DescricaoFaixa {
  if (valor === null) return FAIXAS.indefinida
  if (valor >= 85) return FAIXAS.excelente
  if (valor >= 70) return FAIXAS.bom
  if (valor >= 50) return FAIXAS.atencao
  return FAIXAS.critico
}

// ---------------------------------------------------------------------------
// Agregação por recorte
//
// `resumoPorDimensao` (lib/relatorio) resolve praça, categoria e executivo, mas
// não desce para cidade, não traz reclamações e devolve 0 tanto para "razão de
// budget zero" quanto para "grupo sem budget previsto" — as três coisas que a
// nota precisa distinguir. A agregação abaixo é a mesma leitura do snapshot com
// esses três buracos fechados; os formatadores e helpers de razão continuam
// vindo de relatorio.ts.
// ---------------------------------------------------------------------------

export interface LinhaPerformance {
  chave: string
  rotulo: string
  /** Gerente responsável — vazio no recorte de categoria. */
  gerente: string
  /** Cidade da praça, praças da cidade; vazio nos outros recortes. */
  sub: string
  tipoChip: TipoChip
  ids: string[]
  parceiros: number
  ativos: number
  pedidos: number
  horas: number
  receita: number
  conversao: number | null
  pct_aderencia: number | null
  razao_budget: number | null
  reclamacoes: number
  reclamacoes_por_100: number | null
  participacao_receita: number
  var_receita: number | null
  var_conversao: number | null
  nota: Nota
}

interface Bruto {
  ids: string[]
  ativos: number
  pedidos: number
  horas: number
  receita: number
  dias_aderencia: number
  dias_periodo: number
  budget_needed: number
  budget_real: number
  reclamacoes: number
  pedidos_ant: number
  horas_ant: number
  receita_ant: number
  gerentes: Set<string>
  subs: Set<string>
}

const brutoVazio = (): Bruto => ({
  ids: [],
  ativos: 0,
  pedidos: 0,
  horas: 0,
  receita: 0,
  dias_aderencia: 0,
  dias_periodo: 0,
  budget_needed: 0,
  budget_real: 0,
  reclamacoes: 0,
  pedidos_ant: 0,
  horas_ant: 0,
  receita_ant: 0,
  gerentes: new Set(),
  subs: new Set(),
})

export function chaveDoParceiro(p: DimParceiro, recorte: Recorte, nivel: NivelLocal): string {
  if (recorte === 'pessoa') return p.id_executivo
  if (recorte === 'categoria') return p.categoria
  return nivel === 'cidade' ? p.cidade : p.praca
}

function rotuloDaChave(chave: string, recorte: Recorte): string {
  if (recorte === 'pessoa') return nomeExecutivo(chave)
  if (recorte === 'categoria') return rotuloCategoria(chave as Categoria)
  return chave
}

function tipoChipDoRecorte(recorte: Recorte, nivel: NivelLocal): TipoChip {
  if (recorte === 'pessoa') return 'executivo'
  if (recorte === 'categoria') return 'categoria'
  return nivel === 'cidade' ? 'cidade' : 'praca'
}

/** Lista, sem repetir, o que couber; acima disso resume pela contagem. */
function resumirConjunto(valores: Set<string>, plural: string): string {
  const lista = [...valores].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  if (lista.length === 0) return ''
  if (lista.length <= 2) return lista.join(', ')
  return `${lista.length} ${plural}`
}

export function linhasDoRecorte(
  atual: Snapshot,
  anterior: Snapshot,
  recorte: Recorte,
  nivel: NivelLocal,
): LinhaPerformance[] {
  const grupos = new Map<string, Bruto>()

  const diasPromo = new Map<string, { dias: number; periodo: number; needed: number; real: number }>()
  for (const promo of atual.promos) {
    const acc = diasPromo.get(promo.id_parceiro) ?? { dias: 0, periodo: 0, needed: 0, real: 0 }
    acc.dias += promo.dias_aderencia
    acc.periodo += promo.dias_periodo
    acc.needed += promo.budget_needed
    acc.real += promo.budget_real
    diasPromo.set(promo.id_parceiro, acc)
  }

  for (const p of atual.parceiros) {
    const chave = chaveDoParceiro(p, recorte, nivel)
    const g = grupos.get(chave) ?? brutoVazio()
    const horas = atual.horasPorParceiro.get(p.id_parceiro) ?? 0
    g.ids.push(p.id_parceiro)
    if (horas > 0) g.ativos++
    g.horas += horas
    g.pedidos += atual.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    g.receita += atual.receitaPorParceiro.get(p.id_parceiro) ?? 0
    g.reclamacoes += atual.reclamacoes.get(p.id_parceiro) ?? 0
    g.horas_ant += anterior.horasPorParceiro.get(p.id_parceiro) ?? 0
    g.pedidos_ant += anterior.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    g.receita_ant += anterior.receitaPorParceiro.get(p.id_parceiro) ?? 0

    const promo = diasPromo.get(p.id_parceiro)
    if (promo) {
      g.dias_aderencia += promo.dias
      g.dias_periodo += promo.periodo
      g.budget_needed += promo.needed
      g.budget_real += promo.real
    }

    g.gerentes.add(nomeGerenteDoExecutivo(p.id_executivo))
    if (recorte === 'local') g.subs.add(nivel === 'cidade' ? p.praca : p.cidade)

    grupos.set(chave, g)
  }

  const receitaTotal = [...grupos.values()].reduce((a, g) => a + g.receita, 0)
  const mediaConversao = conversao(atual.totalPedidos, atual.totalHoras)
  const tipoChip = tipoChipDoRecorte(recorte, nivel)

  const linhas: LinhaPerformance[] = []
  for (const [chave, g] of grupos) {
    const conv = g.horas === 0 ? null : g.pedidos / g.horas
    const convAnterior = g.horas_ant === 0 ? null : g.pedidos_ant / g.horas_ant
    const aderencia = g.dias_periodo === 0 ? null : g.dias_aderencia / g.dias_periodo
    const razaoBudget = g.budget_needed === 0 ? null : g.budget_real / g.budget_needed
    const porCem = g.pedidos === 0 ? null : (100 * g.reclamacoes) / g.pedidos

    linhas.push({
      chave,
      rotulo: rotuloDaChave(chave, recorte),
      gerente: recorte === 'categoria' ? '' : resumirConjunto(g.gerentes, 'gerentes'),
      sub: recorte === 'local' ? resumirConjunto(g.subs, nivel === 'cidade' ? 'praças' : 'cidades') : '',
      tipoChip,
      ids: g.ids,
      parceiros: g.ids.length,
      ativos: g.ativos,
      pedidos: g.pedidos,
      horas: g.horas,
      receita: g.receita,
      conversao: conv,
      pct_aderencia: aderencia,
      razao_budget: razaoBudget,
      reclamacoes: g.reclamacoes,
      reclamacoes_por_100: porCem,
      participacao_receita: receitaTotal === 0 ? 0 : g.receita / receitaTotal,
      var_receita: variacao(g.receita, g.receita_ant),
      var_conversao: conv === null || convAnterior === null ? null : variacao(conv, convAnterior),
      nota: calcularNota({
        pct_aderencia: aderencia,
        conversao: conv,
        media_conversao: mediaConversao,
        razao_budget: razaoBudget,
        reclamacoes_por_100: porCem,
      }),
    })
  }

  return linhas.sort((a, b) => (b.nota.valor ?? -1) - (a.nota.valor ?? -1))
}

// ---------------------------------------------------------------------------
// Bloco de destaque
// ---------------------------------------------------------------------------

export type Status = 'bom' | 'atencao' | 'ruim' | 'neutro'

export const COR_STATUS: Record<Status, string> = {
  bom: 'rgb(var(--ink))',
  atencao: 'rgb(var(--rosa-claro))',
  ruim: 'rgb(var(--rosa))',
  neutro: 'rgb(var(--stroke))',
}

export interface Metrica {
  chave: string
  rotulo: string
  valor: string
  detalhe: string
  status: Status
}

export interface Destaque {
  nota: Nota
  metricas: Metrica[]
  parceiros: number
}

const faixaStatus = (v: number | null, bom: number, atencao: number): Status =>
  v === null ? 'neutro' : v >= bom ? 'bom' : v >= atencao ? 'atencao' : 'ruim'

/** Quanto menor, melhor — a ordem das faixas inverte. */
const faixaStatusInvertida = (v: number | null, bom: number, atencao: number): Status =>
  v === null ? 'neutro' : v <= bom ? 'bom' : v <= atencao ? 'atencao' : 'ruim'

export function destaqueGeral(atual: Snapshot, anterior: Snapshot, comparacao: string): Destaque {
  let dias = 0
  let periodo = 0
  let needed = 0
  let real = 0
  for (const promo of atual.promos) {
    dias += promo.dias_aderencia
    periodo += promo.dias_periodo
    needed += promo.budget_needed
    real += promo.budget_real
  }

  let reclamacoes = 0
  for (const p of atual.parceiros) reclamacoes += atual.reclamacoes.get(p.id_parceiro) ?? 0

  const aderencia = periodo === 0 ? null : dias / periodo
  const razaoBudget = needed === 0 ? null : real / needed
  const conv = atual.totalHoras === 0 ? null : atual.totalPedidos / atual.totalHoras
  const convAnterior = anterior.totalHoras === 0 ? null : anterior.totalPedidos / anterior.totalHoras
  const porCem = atual.totalPedidos === 0 ? null : (100 * reclamacoes) / atual.totalPedidos
  const ativos = atual.parceiros.filter((p) => (atual.horasPorParceiro.get(p.id_parceiro) ?? 0) > 0)
  const varReceita = variacao(atual.receitaTotal, anterior.receitaTotal)

  // A média do grupo é a própria referência da parcela de conversão: no
  // consolidado ela vale sempre 25 de 30, e é isso que a decomposição mostra.
  const nota = calcularNota({
    pct_aderencia: aderencia,
    conversao: conv,
    media_conversao: conv ?? 0,
    razao_budget: razaoBudget,
    reclamacoes_por_100: porCem,
  })

  const metricas: Metrica[] = [
    {
      chave: 'ativos',
      rotulo: 'Parceiros ativos',
      valor: `${fmtInt(ativos.length)} de ${fmtInt(atual.parceiros.length)}`,
      detalhe: 'com hora online no período',
      status:
        atual.parceiros.length === 0
          ? 'neutro'
          : faixaStatus(ativos.length / atual.parceiros.length, 0.95, 0.85),
    },
    {
      chave: 'pedidos',
      rotulo: 'Pedidos',
      valor: fmtInt(atual.totalPedidos),
      detalhe: `${fmtInt(atual.totalHoras)} horas online`,
      status: 'neutro',
    },
    {
      chave: 'receita',
      rotulo: 'Receita',
      valor: fmtMoeda(atual.receitaTotal),
      detalhe:
        varReceita === null
          ? `sem base em ${comparacao}`
          : `${varReceita >= 0 ? '+' : '−'}${fmtPct(Math.abs(varReceita))} vs. ${comparacao}`,
      status: varReceita === null ? 'neutro' : faixaStatus(varReceita, 0, -0.1),
    },
    {
      chave: 'aderencia',
      rotulo: '% aderência',
      valor: aderencia === null ? '—' : fmtPct(aderencia),
      detalhe: `meta de ${fmtPct(META_ADERENCIA, 0)}`,
      status: faixaStatus(aderencia, META_ADERENCIA, 0.7),
    },
    {
      chave: 'conversao',
      rotulo: 'Conversão',
      valor: conv === null ? '—' : fmtDec(conv),
      detalhe:
        convAnterior === null
          ? 'pedidos por hora online'
          : `${fmtDec(convAnterior)} em ${comparacao}`,
      status:
        conv === null || convAnterior === null
          ? 'neutro'
          : faixaStatus(conv - convAnterior, 0, -0.1),
    },
    {
      chave: 'budget',
      rotulo: 'Budget vs. necessário',
      valor: razaoBudget === null ? '—' : fmtPct(razaoBudget),
      detalhe: 'quanto mais perto de 100%, melhor',
      status:
        razaoBudget === null
          ? 'neutro'
          : faixaStatusInvertida(Math.abs(razaoBudget - 1), 0.1, 0.25),
    },
  ]

  return { nota, metricas, parceiros: atual.parceiros.length }
}

// ---------------------------------------------------------------------------
// Série temporal do recorte
// ---------------------------------------------------------------------------

export interface SerieRecorte {
  chave: string
  rotulo: string
  cor: string
}

export interface PontoSerie {
  dia: string
  rotulo: string
  [serie: string]: string | number
}

export interface SerieDoRecorte {
  pontos: PontoSerie[]
  series: SerieRecorte[]
  /** Grupos que ficaram de fora do gráfico por não caberem nas cores. */
  ocultos: number
}

/**
 * Pedidos por dia das primeiras `linhas` do recorte. As chaves das séries são
 * `s0`, `s1`… porque o rótulo do grupo pode colidir com `dia`/`rotulo`.
 */
export function serieDoRecorte(
  atual: Snapshot,
  recorte: Recorte,
  nivel: NivelLocal,
  linhas: LinhaPerformance[],
  cores: readonly string[],
): SerieDoRecorte {
  const escolhidas = linhas.slice(0, cores.length)
  const indicePorChave = new Map(escolhidas.map((l, i) => [l.chave, i]))

  const grupoPorParceiro = new Map<string, number>()
  for (const p of atual.parceiros) {
    const idx = indicePorChave.get(chaveDoParceiro(p, recorte, nivel))
    if (idx !== undefined) grupoPorParceiro.set(p.id_parceiro, idx)
  }

  const porDia = new Map<string, number[]>()
  for (const dia of atual.dias) porDia.set(dia, escolhidas.map(() => 0))

  for (const o of dataset.pedidos) {
    const idx = grupoPorParceiro.get(o.id_parceiro)
    if (idx === undefined) continue
    const linha = porDia.get(o.data)
    if (!linha) continue
    linha[idx]++
  }

  const pontos: PontoSerie[] = atual.dias.map((dia) => {
    const ponto: PontoSerie = { dia, rotulo: formatarDia(dia) }
    const valores = porDia.get(dia) ?? []
    escolhidas.forEach((_, i) => {
      ponto[`s${i}`] = valores[i] ?? 0
    })
    return ponto
  })

  return {
    pontos,
    series: escolhidas.map((l, i) => ({
      chave: `s${i}`,
      rotulo: l.rotulo,
      cor: cores[i % cores.length],
    })),
    ocultos: Math.max(0, linhas.length - escolhidas.length),
  }
}
