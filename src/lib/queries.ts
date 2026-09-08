import { dataset, diaSemana } from '@/data/seed'
import type { Categoria, DimExecutivo, DimParceiro, FatoPromo, TipoPromo } from '@/data/types'
import { listarDias, mesesDoPeriodo, periodoAnterior, type Periodo } from './periodo'

export interface Filtros {
  periodo: Periodo
  /** Vazio = todos. */
  gerentes: string[]
  /** Vazio = todos os executivos visíveis dado o filtro de gerente. */
  executivos: string[]
  /** null = todas. */
  praca: string | null
}

export const PRACAS = [...new Set(dataset.parceiros.map((p) => p.praca))].sort()

const execPorId = new Map(dataset.executivos.map((e) => [e.id_executivo, e]))
const gerentePorId = new Map(dataset.gerentes.map((g) => [g.id_gerente, g]))
const parceiroPorId = new Map(dataset.parceiros.map((p) => [p.id_parceiro, p]))

export const nomeExecutivo = (id: string) => execPorId.get(id)?.nome ?? id
export const nomeGerente = (id: string) => gerentePorId.get(id)?.nome ?? id
export const nomeParceiro = (id: string) => parceiroPorId.get(id)?.nome ?? id

/** Executivos que o filtro de gerente deixa disponíveis — base do cascateamento. */
export function executivosDisponiveis(gerentes: string[]): DimExecutivo[] {
  return dataset.executivos.filter((e) => gerentes.length === 0 || gerentes.includes(e.id_gerente))
}

export function parceirosNoEscopo(f: Filtros): DimParceiro[] {
  const permitidos = new Set(executivosDisponiveis(f.gerentes).map((e) => e.id_executivo))
  const selecionados = f.executivos.filter((id) => permitidos.has(id))
  const alvo = selecionados.length > 0 ? new Set(selecionados) : permitidos
  return dataset.parceiros.filter(
    (p) => alvo.has(p.id_executivo) && (f.praca === null || p.praca === f.praca),
  )
}

// ---------------------------------------------------------------------------
// Snapshot: todos os fatos recortados por parceiro + período.
// ---------------------------------------------------------------------------

export interface Snapshot {
  periodo: Periodo
  dias: string[]
  meses: string[]
  parceiros: DimParceiro[]
  ids: Set<string>
  promos: FatoPromo[]
  horasPorParceiro: Map<string, number>
  pedidosPorParceiro: Map<string, number>
  receitaPorParceiro: Map<string, number>
  /** Dias do período em que o parceiro registrou pedido sem nenhuma hora online. */
  diasPedidoSemHora: Map<string, number>
  diasSemHora: Map<string, number>
  pedidosWeekend: Map<string, number>
  horasWeekend: Map<string, number>
  pedidosAlmoco: Map<string, number>
  receitaTotal: number
  reclamacoes: Map<string, number>
  reclamacoesGraves: Map<string, number>
  totalPedidos: number
  totalHoras: number
}

const soma = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)

export function snapshot(parceiros: DimParceiro[], periodo: Periodo): Snapshot {
  const ids = new Set(parceiros.map((p) => p.id_parceiro))
  const dias = listarDias(periodo)
  const meses = mesesDoPeriodo(periodo)
  const noPeriodo = (d: string) => d >= periodo.inicio && d <= periodo.fim

  const horasPorParceiro = new Map<string, number>()
  const pedidosPorParceiro = new Map<string, number>()
  const receitaPorParceiro = new Map<string, number>()
  const diasPedidoSemHora = new Map<string, number>()
  const diasSemHora = new Map<string, number>()
  const pedidosWeekend = new Map<string, number>()
  const horasWeekend = new Map<string, number>()
  const pedidosAlmoco = new Map<string, number>()

  const horasPorDia = new Map<string, number>()
  for (const h of dataset.horas) {
    if (!ids.has(h.id_parceiro) || !noPeriodo(h.data)) continue
    horasPorDia.set(`${h.id_parceiro}|${h.data}`, h.horas_online)
    soma(horasPorParceiro, h.id_parceiro, h.horas_online)
    if (h.horas_online === 0) soma(diasSemHora, h.id_parceiro, 1)
    if ([0, 6].includes(diaSemana(h.data))) soma(horasWeekend, h.id_parceiro, h.horas_online)
  }

  const pedidosPorDia = new Map<string, number>()
  let totalPedidos = 0
  for (const o of dataset.pedidos) {
    if (!ids.has(o.id_parceiro) || !noPeriodo(o.data)) continue
    totalPedidos++
    soma(pedidosPorParceiro, o.id_parceiro, 1)
    soma(receitaPorParceiro, o.id_parceiro, o.valor)
    soma(pedidosPorDia, `${o.id_parceiro}|${o.data}`, 1)
    if (o.dia_semana === 0 || o.dia_semana === 6) soma(pedidosWeekend, o.id_parceiro, 1)
    if (o.hora >= 11 && o.hora <= 14) soma(pedidosAlmoco, o.id_parceiro, 1)
  }

  for (const [chave, qtd] of pedidosPorDia) {
    if (qtd > 0 && (horasPorDia.get(chave) ?? 0) === 0) {
      soma(diasPedidoSemHora, chave.split('|')[0], 1)
    }
  }

  const reclamacoes = new Map<string, number>()
  const reclamacoesGraves = new Map<string, number>()
  for (const r of dataset.reclamacoes) {
    if (!ids.has(r.id_parceiro) || !noPeriodo(r.data)) continue
    soma(reclamacoes, r.id_parceiro, 1)
    if (r.gravidade === 'alta') soma(reclamacoesGraves, r.id_parceiro, 1)
  }

  const promos = dataset.promos.filter(
    (p) => ids.has(p.id_parceiro) && meses.includes(p.data.slice(0, 7)),
  )

  let totalHoras = 0
  for (const v of horasPorParceiro.values()) totalHoras += v
  let receitaTotal = 0
  for (const v of receitaPorParceiro.values()) receitaTotal += v

  return {
    periodo,
    dias,
    meses,
    parceiros,
    ids,
    promos,
    horasPorParceiro,
    pedidosPorParceiro,
    receitaPorParceiro,
    diasPedidoSemHora,
    diasSemHora,
    pedidosWeekend,
    horasWeekend,
    pedidosAlmoco,
    receitaTotal,
    reclamacoes,
    reclamacoesGraves,
    totalPedidos,
    totalHoras,
  }
}

export function snapshotsDoFiltro(f: Filtros) {
  const parceiros = parceirosNoEscopo(f)
  return {
    atual: snapshot(parceiros, f.periodo),
    anterior: snapshot(parceiros, periodoAnterior(f.periodo)),
  }
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export interface Kpi {
  chave: string
  label: string
  valor: string
  bruto: number
  delta: number | null
  deltaLabel: string | null
  contexto: string
  alerta: boolean
}

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`

function taxaAderencia(s: Snapshot): number {
  let dias = 0
  let periodo = 0
  for (const p of s.promos) {
    dias += p.dias_aderencia
    periodo += p.dias_periodo
  }
  return periodo === 0 ? 0 : dias / periodo
}

function razaoBudget(s: Snapshot): number {
  let real = 0
  let needed = 0
  for (const p of s.promos) {
    real += p.budget_real
    needed += p.budget_needed
  }
  return needed === 0 ? 0 : real / needed
}

function parceirosAtivos(s: Snapshot): string[] {
  return [...s.horasPorParceiro.entries()].filter(([, h]) => h > 0).map(([id]) => id)
}

export function kpis(atual: Snapshot, anterior: Snapshot): Kpi[] {
  const ativosA = parceirosAtivos(atual).length
  const ativosB = parceirosAtivos(anterior).length
  const comPromoA = new Set(atual.promos.map((p) => p.id_parceiro)).size
  const comPromoB = new Set(anterior.promos.map((p) => p.id_parceiro)).size
  const adA = taxaAderencia(atual)
  const adB = taxaAderencia(anterior)
  const bgA = razaoBudget(atual)
  const bgB = razaoBudget(anterior)

  const delta = (a: number, b: number) => (b === 0 ? null : (a - b) / b)
  const deltaLabel = (d: number | null) =>
    d === null ? null : `${d >= 0 ? '+' : '−'}${Math.abs(d * 100).toFixed(1).replace('.', ',')}%`

  return [
    {
      chave: 'ativos',
      label: 'Parceiros ativos',
      valor: String(ativosA),
      bruto: ativosA,
      delta: delta(ativosA, ativosB),
      deltaLabel: deltaLabel(delta(ativosA, ativosB)),
      contexto: `de ${atual.parceiros.length} na carteira`,
      alerta: false,
    },
    {
      chave: 'promo',
      label: 'Parceiros com promo ativa',
      valor: String(comPromoA),
      bruto: comPromoA,
      delta: delta(comPromoA, comPromoB),
      deltaLabel: deltaLabel(delta(comPromoA, comPromoB)),
      contexto: `${atual.promos.length} promoções no período`,
      alerta: false,
    },
    {
      chave: 'aderencia',
      label: 'Taxa de aderência geral',
      valor: pct(adA),
      bruto: adA,
      delta: adA - adB,
      deltaLabel: `${adA - adB >= 0 ? '+' : '−'}${Math.abs((adA - adB) * 100).toFixed(1).replace('.', ',')} p.p.`,
      contexto: adA < 0.7 ? 'abaixo da meta de 70%' : 'meta de 70% atendida',
      alerta: adA < 0.7,
    },
    {
      chave: 'budget',
      label: 'Budget consumido vs. necessário',
      valor: pct(bgA),
      bruto: bgA,
      delta: bgA - bgB,
      deltaLabel: `${bgA - bgB >= 0 ? '+' : '−'}${Math.abs((bgA - bgB) * 100).toFixed(1).replace('.', ',')} p.p.`,
      contexto: bgA > 1.1 ? 'acima do teto de 110%' : 'dentro do teto de 110%',
      alerta: bgA > 1.1,
    },
  ]
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export type Severidade = 'critico' | 'atencao'

export interface LinhaAlerta {
  id: string
  parceiro: string | null
  executivo: string
  detalhe: string
  valor: string
}

export interface Alerta {
  chave: string
  severidade: Severidade
  titulo: string
  resumo: string
  linhas: LinhaAlerta[]
}

export function alertas(s: Snapshot): Alerta[] {
  const out: Alerta[] = []
  const porParceiro = new Map(s.parceiros.map((p) => [p.id_parceiro, p]))
  const promosPorParceiro = new Map<string, FatoPromo[]>()
  for (const p of s.promos) {
    const lista = promosPorParceiro.get(p.id_parceiro) ?? []
    lista.push(p)
    promosPorParceiro.set(p.id_parceiro, lista)
  }

  // 1. Zero horas online com promo ativa.
  const zeroHoras: LinhaAlerta[] = []
  for (const p of s.parceiros) {
    const h = s.horasPorParceiro.get(p.id_parceiro) ?? 0
    const promos = promosPorParceiro.get(p.id_parceiro) ?? []
    if (h === 0 && promos.length > 0) {
      zeroHoras.push({
        id: p.id_parceiro,
        parceiro: p.nome,
        executivo: nomeExecutivo(p.id_executivo),
        detalhe: promos.map((x) => rotuloPromo(x.tipo_promo)).join(', '),
        valor: `${s.diasSemHora.get(p.id_parceiro) ?? s.dias.length} dias sem horas`,
      })
    }
  }
  if (zeroHoras.length > 0) {
    out.push({
      chave: 'zero_horas',
      severidade: 'critico',
      titulo: 'Parceiros com zero horas e promo ativa',
      resumo: `${zeroHoras.length} ${zeroHoras.length === 1 ? 'parceiro consome' : 'parceiros consomem'} budget de promoção sem ficar um minuto online no período.`,
      linhas: zeroHoras,
    })
  }

  // 2. Promo de pizza no almoço em quem não abre no almoço.
  const pizzaAlmoco: LinhaAlerta[] = []
  for (const p of s.parceiros) {
    if (p.categoria !== 'pizza' || p.abre_almoco) continue
    const temSpecial = (promosPorParceiro.get(p.id_parceiro) ?? []).some(
      (x) => x.tipo_promo === 'special',
    )
    const almoco = s.pedidosAlmoco.get(p.id_parceiro) ?? 0
    if (temSpecial && almoco > 0) {
      pizzaAlmoco.push({
        id: p.id_parceiro,
        parceiro: p.nome,
        executivo: nomeExecutivo(p.id_executivo),
        detalhe: 'promo special de pizza · cadastro diz que não abre no almoço',
        valor: `${almoco} pedidos entre 11h e 14h`,
      })
    }
  }
  if (pizzaAlmoco.length > 0) {
    out.push({
      chave: 'pizza_almoco',
      severidade: 'critico',
      titulo: 'Promo de pizza no almoço em quem não abre no almoço',
      resumo: `${pizzaAlmoco.length} ${pizzaAlmoco.length === 1 ? 'parceiro registra' : 'parceiros registram'} pedido no almoço com o cadastro marcado como fechado — promo mal direcionada ou cadastro errado.`,
      linhas: pizzaAlmoco,
    })
  }

  // 3. Padrões de fraude.
  const fraude: LinhaAlerta[] = []

  for (const p of s.parceiros) {
    const n = s.diasPedidoSemHora.get(p.id_parceiro) ?? 0
    if (n > 0) {
      fraude.push({
        id: `${p.id_parceiro}:sem_hora`,
        parceiro: p.nome,
        executivo: nomeExecutivo(p.id_executivo),
        detalhe: 'Pedidos registrados sem hora online',
        valor: `${n} ${n === 1 ? 'dia' : 'dias'}`,
      })
    }
  }

  for (const promo of s.promos) {
    if (promo.budget_needed === 0) continue
    const r = promo.budget_real / promo.budget_needed
    if (r > 1.5) {
      const p = porParceiro.get(promo.id_parceiro)
      fraude.push({
        id: `${promo.id_parceiro}:${promo.tipo_promo}:${promo.data}:budget`,
        parceiro: p?.nome ?? promo.id_parceiro,
        executivo: nomeExecutivo(promo.id_executivo),
        detalhe: `Budget ${rotuloPromo(promo.tipo_promo)} muito acima do necessário`,
        valor: `${r.toFixed(2).replace('.', ',')}× o previsto`,
      })
    }
  }

  // Aderência cravada em 100% em todos os meses do histórico — sem variação.
  for (const p of s.parceiros) {
    const historico = dataset.promos.filter((x) => x.id_parceiro === p.id_parceiro)
    if (historico.length < dataset.meses.length) continue
    const travado = historico.every((x) => x.dias_aderencia === x.dias_periodo)
    if (travado) {
      fraude.push({
        id: `${p.id_parceiro}:travado`,
        parceiro: p.nome,
        executivo: nomeExecutivo(p.id_executivo),
        detalhe: 'Aderência em 100% todos os dias, sem variação em 3 meses',
        valor: `${historico.length} registros`,
      })
    }
  }

  // Executivo com carteira inteira aderente no período.
  const porExecutivo = new Map<string, FatoPromo[]>()
  for (const promo of s.promos) {
    const lista = porExecutivo.get(promo.id_executivo) ?? []
    lista.push(promo)
    porExecutivo.set(promo.id_executivo, lista)
  }
  for (const [idExec, promos] of porExecutivo) {
    if (promos.length < 3) continue
    if (promos.every((x) => x.dias_aderencia === x.dias_periodo)) {
      fraude.push({
        id: `${idExec}:carteira`,
        parceiro: null,
        executivo: nomeExecutivo(idExec),
        detalhe: 'Carteira inteira com 100% de aderência',
        valor: `${new Set(promos.map((x) => x.id_parceiro)).size} parceiros`,
      })
    }
  }

  if (fraude.length > 0) {
    out.push({
      chave: 'fraude',
      severidade: 'atencao',
      titulo: 'Padrões que pedem verificação',
      resumo: `${fraude.length} ${fraude.length === 1 ? 'ocorrência combina' : 'ocorrências combinam'} sinais que costumam indicar dado inflado ou lançamento indevido.`,
      linhas: fraude,
    })
  }

  // 4. Perdeu banner (só quando o período cobre um mês com mês anterior no histórico).
  const perdeu = statusBanner(s).filter((r) => r.status === 'Perdeu')
  if (perdeu.length > 0) {
    out.push({
      chave: 'perdeu_banner',
      severidade: 'critico',
      titulo: 'Parceiros que perderam o banner',
      resumo: `${perdeu.length} ${perdeu.length === 1 ? 'parceiro tinha' : 'parceiros tinham'} banner no mês anterior e não tem mais neste.`,
      linhas: perdeu.map((r) => ({
        id: r.id_parceiro,
        parceiro: r.parceiro,
        executivo: r.executivo,
        detalhe: 'Tinha banner no mês anterior',
        valor: 'Sem banner agora',
      })),
    })
  }

  return out
}

export function rotuloPromo(t: TipoPromo): string {
  return t === 'smart' ? 'Smart' : t === 'banner' ? 'Banner' : 'Special'
}

// ---------------------------------------------------------------------------
// Tabelas por aba
// ---------------------------------------------------------------------------

export interface LinhaSmart {
  id_parceiro: string
  parceiro: string
  executivo: string
  budget_needed: number
  budget_real: number
  aderente: boolean
  dias_aderencia: number
  dias_periodo: number
  pct_aderencia: number
}

export function tabelaSmart(s: Snapshot): LinhaSmart[] {
  const porParceiro = new Map(s.parceiros.map((p) => [p.id_parceiro, p]))
  const agrupado = new Map<string, LinhaSmart>()
  for (const promo of s.promos) {
    if (promo.tipo_promo !== 'smart') continue
    const p = porParceiro.get(promo.id_parceiro)
    if (!p) continue
    const atual = agrupado.get(promo.id_parceiro)
    if (atual) {
      atual.budget_needed += promo.budget_needed
      atual.budget_real += promo.budget_real
      atual.dias_aderencia += promo.dias_aderencia
      atual.dias_periodo += promo.dias_periodo
      atual.pct_aderencia = atual.dias_aderencia / atual.dias_periodo
      atual.aderente = atual.pct_aderencia >= 0.8
    } else {
      agrupado.set(promo.id_parceiro, {
        id_parceiro: p.id_parceiro,
        parceiro: p.nome,
        executivo: nomeExecutivo(p.id_executivo),
        budget_needed: promo.budget_needed,
        budget_real: promo.budget_real,
        aderente: promo.aderente,
        dias_aderencia: promo.dias_aderencia,
        dias_periodo: promo.dias_periodo,
        pct_aderencia: promo.dias_aderencia / promo.dias_periodo,
      })
    }
  }
  return [...agrupado.values()].sort((a, b) => a.pct_aderencia - b.pct_aderencia)
}

export type StatusBanner = 'Manteve' | 'Perdeu' | 'Ganhou' | 'Nunca teve'

export interface LinhaBanner {
  id_parceiro: string
  parceiro: string
  executivo: string
  tem_agora: boolean
  tinha_antes: boolean
  status: StatusBanner
}

export function statusBanner(s: Snapshot): LinhaBanner[] {
  const mesAtual = s.meses[s.meses.length - 1]
  const idx = dataset.meses.indexOf(mesAtual)
  const mesAnterior = idx > 0 ? dataset.meses[idx - 1] : null

  const agora = new Map(
    dataset.banners.filter((b) => b.mes_ano === mesAtual).map((b) => [b.id_parceiro, b.tem_banner]),
  )
  const antes = new Map(
    mesAnterior
      ? dataset.banners.filter((b) => b.mes_ano === mesAnterior).map((b) => [b.id_parceiro, b.tem_banner])
      : [],
  )

  return s.parceiros.map((p) => {
    const tem_agora = agora.get(p.id_parceiro) ?? false
    const tinha_antes = antes.get(p.id_parceiro) ?? false
    const status: StatusBanner =
      tem_agora && tinha_antes
        ? 'Manteve'
        : !tem_agora && tinha_antes
          ? 'Perdeu'
          : tem_agora && !tinha_antes
            ? 'Ganhou'
            : 'Nunca teve'
    return {
      id_parceiro: p.id_parceiro,
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      tem_agora,
      tinha_antes,
      status,
    }
  })
}

export interface LinhaSpecial {
  id_parceiro: string
  parceiro: string
  categoria: Categoria
  executivo: string
  tem_special: boolean
  aderente: boolean | null
}

export function tabelaSpecial(s: Snapshot): LinhaSpecial[] {
  const specials = new Map<string, FatoPromo[]>()
  for (const promo of s.promos) {
    if (promo.tipo_promo !== 'special') continue
    const lista = specials.get(promo.id_parceiro) ?? []
    lista.push(promo)
    specials.set(promo.id_parceiro, lista)
  }
  return s.parceiros.map((p) => {
    const lista = specials.get(p.id_parceiro)
    const dias = lista?.reduce((acc, x) => acc + x.dias_aderencia, 0) ?? 0
    const periodo = lista?.reduce((acc, x) => acc + x.dias_periodo, 0) ?? 0
    return {
      id_parceiro: p.id_parceiro,
      parceiro: p.nome,
      categoria: p.categoria,
      executivo: nomeExecutivo(p.id_executivo),
      tem_special: !!lista,
      aderente: lista ? dias / periodo >= 0.8 : null,
    }
  })
}

export interface LinhaExecutivo {
  id_executivo: string
  executivo: string
  gerente: string
  parceiros: number
  ativos: number
  com_promo: number
  pct_aderencia: number
  razao_budget: number
  alertas: number
}

export function tabelaExecutivos(s: Snapshot, listaAlertas: Alerta[]): LinhaExecutivo[] {
  const alertasPorExec = new Map<string, number>()
  for (const a of listaAlertas) {
    for (const l of a.linhas) soma(alertasPorExec, l.executivo, 1)
  }

  const porExec = new Map<string, DimParceiro[]>()
  for (const p of s.parceiros) {
    const lista = porExec.get(p.id_executivo) ?? []
    lista.push(p)
    porExec.set(p.id_executivo, lista)
  }

  const out: LinhaExecutivo[] = []
  for (const [idExec, parceiros] of porExec) {
    const ids = new Set(parceiros.map((p) => p.id_parceiro))
    const promos = s.promos.filter((x) => ids.has(x.id_parceiro))
    const dias = promos.reduce((acc, x) => acc + x.dias_aderencia, 0)
    const periodo = promos.reduce((acc, x) => acc + x.dias_periodo, 0)
    const real = promos.reduce((acc, x) => acc + x.budget_real, 0)
    const needed = promos.reduce((acc, x) => acc + x.budget_needed, 0)
    const exec = execPorId.get(idExec)
    const nome = exec?.nome ?? idExec
    out.push({
      id_executivo: idExec,
      executivo: nome,
      gerente: nomeGerente(exec?.id_gerente ?? ''),
      parceiros: parceiros.length,
      ativos: parceiros.filter((p) => (s.horasPorParceiro.get(p.id_parceiro) ?? 0) > 0).length,
      com_promo: new Set(promos.map((x) => x.id_parceiro)).size,
      pct_aderencia: periodo === 0 ? 0 : dias / periodo,
      razao_budget: needed === 0 ? 0 : real / needed,
      alertas: alertasPorExec.get(nome) ?? 0,
    })
  }
  return out.sort((a, b) => a.pct_aderencia - b.pct_aderencia)
}

// ---------------------------------------------------------------------------
// Métricas de melhoria
// ---------------------------------------------------------------------------

export interface LinhaWeekend {
  id_parceiro: string
  parceiro: string
  executivo: string
  conv_weekend: number
  conv_semana: number
  gap: number
}

export function conversaoWeekend(s: Snapshot): { media: number; abaixo: LinhaWeekend[] } {
  const linhas: LinhaWeekend[] = []
  for (const p of s.parceiros) {
    const hw = s.horasWeekend.get(p.id_parceiro) ?? 0
    const ht = s.horasPorParceiro.get(p.id_parceiro) ?? 0
    const pw = s.pedidosWeekend.get(p.id_parceiro) ?? 0
    const pt = s.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    const hs = ht - hw
    if (hw <= 0 || hs <= 0) continue
    const conv_weekend = pw / hw
    const conv_semana = (pt - pw) / hs
    linhas.push({
      id_parceiro: p.id_parceiro,
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      conv_weekend,
      conv_semana,
      gap: conv_weekend - conv_semana,
    })
  }
  const media = linhas.length === 0 ? 0 : linhas.reduce((a, l) => a + l.conv_weekend, 0) / linhas.length
  return {
    media,
    abaixo: linhas.filter((l) => l.conv_weekend < media).sort((a, b) => a.conv_weekend - b.conv_weekend),
  }
}

export interface LinhaCategoria {
  categoria: Categoria
  conversao: number
  conversao_anterior: number
  variacao: number | null
  parceiros: number
  sem_special: { id_parceiro: string; parceiro: string; executivo: string; conversao: number }[]
}

export function conversaoPorCategoria(atual: Snapshot, anterior: Snapshot): LinhaCategoria[] {
  const comSpecial = new Set(
    atual.promos.filter((x) => x.tipo_promo === 'special').map((x) => x.id_parceiro),
  )

  const conv = (s: Snapshot, cat: Categoria) => {
    let pedidos = 0
    let horas = 0
    for (const p of s.parceiros) {
      if (p.categoria !== cat) continue
      pedidos += s.pedidosPorParceiro.get(p.id_parceiro) ?? 0
      horas += s.horasPorParceiro.get(p.id_parceiro) ?? 0
    }
    return horas === 0 ? 0 : pedidos / horas
  }

  const categorias: Categoria[] = ['pizza', 'burger']
  return categorias.map((cat) => {
    const c = conv(atual, cat)
    const cAnt = conv(anterior, cat)
    const alvo = atual.parceiros.filter((p) => p.categoria === cat)
    return {
      categoria: cat,
      conversao: c,
      conversao_anterior: cAnt,
      variacao: cAnt === 0 ? null : (c - cAnt) / cAnt,
      parceiros: alvo.length,
      sem_special: alvo
        .filter((p) => !comSpecial.has(p.id_parceiro))
        .map((p) => {
          const h = atual.horasPorParceiro.get(p.id_parceiro) ?? 0
          return {
            id_parceiro: p.id_parceiro,
            parceiro: p.nome,
            executivo: nomeExecutivo(p.id_executivo),
            conversao: h === 0 ? 0 : (atual.pedidosPorParceiro.get(p.id_parceiro) ?? 0) / h,
          }
        })
        .sort((a, b) => b.conversao - a.conversao),
    }
  })
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

export type MetricaHeatmap = 'pedidos' | 'conversao' | 'receita'

export const HORAS_GRID = [11, 12, 13, 14, 18, 19, 20, 21, 22, 23]
export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
/** Índice do grid (0 = segunda) a partir do getUTCDay (0 = domingo). */
const ordemDia = (dow: number) => (dow + 6) % 7

export interface Heatmap {
  celulas: number[][]
  max: number
  top: { dia: string; hora: number; valor: number }[]
}

export function heatmap(s: Snapshot, metrica: MetricaHeatmap): Heatmap {
  const celulas = HORAS_GRID.map(() => DIAS_SEMANA.map(() => 0))
  const linhaDe = new Map(HORAS_GRID.map((h, i) => [h, i]))
  const noPeriodo = (d: string) => d >= s.periodo.inicio && d <= s.periodo.fim

  for (const o of dataset.pedidos) {
    if (!s.ids.has(o.id_parceiro) || !noPeriodo(o.data)) continue
    const linha = linhaDe.get(o.hora)
    if (linha === undefined) continue
    celulas[linha][ordemDia(o.dia_semana)] += metrica === 'receita' ? o.valor : 1
  }

  if (metrica === 'pedidos' || metrica === 'receita') {
    // Um recorte de 8 dias contém duas terças e uma quarta. Sem dividir pelas
    // ocorrências de cada dia da semana, a coluna repetida parece o dobro.
    const ocorrencias = DIAS_SEMANA.map(() => 0)
    for (const dia of s.dias) ocorrencias[ordemDia(diaSemana(dia))]++
    for (const linha of celulas) {
      for (let c = 0; c < DIAS_SEMANA.length; c++) {
        linha[c] = ocorrencias[c] === 0 ? 0 : linha[c] / ocorrencias[c]
      }
    }
  }

  if (metrica === 'conversao') {
    // Pedidos por hora online: distribui as horas do dia entre as faixas do grid.
    const horasPorColuna = DIAS_SEMANA.map(() => 0)
    for (const h of dataset.horas) {
      if (!s.ids.has(h.id_parceiro) || !noPeriodo(h.data)) continue
      horasPorColuna[ordemDia(diaSemana(h.data))] += h.horas_online
    }
    for (let l = 0; l < celulas.length; l++) {
      for (let c = 0; c < DIAS_SEMANA.length; c++) {
        const base = horasPorColuna[c] / HORAS_GRID.length
        celulas[l][c] = base === 0 ? 0 : celulas[l][c] / base
      }
    }
  }

  let max = 0
  const top: { dia: string; hora: number; valor: number }[] = []
  for (let l = 0; l < celulas.length; l++) {
    for (let c = 0; c < DIAS_SEMANA.length; c++) {
      const v = celulas[l][c]
      if (v > max) max = v
      top.push({ dia: DIAS_SEMANA[c], hora: HORAS_GRID[l], valor: v })
    }
  }
  top.sort((a, b) => b.valor - a.valor)

  return { celulas, max, top: top.slice(0, 5) }
}
