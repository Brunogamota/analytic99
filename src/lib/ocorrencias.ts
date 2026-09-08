import { dataset } from '@/data/seed'
import type {
  FatoOcorrencia,
  MotivoOcorrencia,
  Responsabilidade,
  SubtipoReclamacao,
  TipoOcorrencia,
} from '@/data/types'
import { fmtDec, fmtInt, fmtMoeda } from './format'
import { formatarDia } from './periodo'
import { nomeExecutivo, type Snapshot } from './queries'
import { nomeGerenteDoExecutivo, porCem } from './relatorio'

// ---------------------------------------------------------------------------
// Vocabulário
// ---------------------------------------------------------------------------

export const TIPOS_OCORRENCIA: TipoOcorrencia[] = [
  'reembolso',
  'estorno',
  'cancelamento',
  'chargeback',
]

export const MOTIVOS_OCORRENCIA: MotivoOcorrencia[] = [
  'pedido_nao_entregue',
  'atraso_excessivo',
  'item_faltando',
  'item_errado',
  'qualidade_comida',
  'embalagem_danificada',
  'cobranca_duplicada',
  'fraude_suspeita',
  'endereco_incorreto',
  'restaurante_fechado',
]

export const RESPONSABILIDADES: Responsabilidade[] = [
  'parceiro',
  'entregador',
  'plataforma',
  'cliente',
  'indefinida',
]

export const ROTULO_TIPO_OCORRENCIA: Record<TipoOcorrencia, string> = {
  reembolso: 'Reembolso',
  estorno: 'Estorno',
  cancelamento: 'Cancelamento',
  chargeback: 'Chargeback',
}

export const ROTULO_MOTIVO: Record<MotivoOcorrencia, string> = {
  pedido_nao_entregue: 'Pedido não entregue',
  atraso_excessivo: 'Atraso excessivo',
  item_faltando: 'Item faltando',
  item_errado: 'Item errado',
  qualidade_comida: 'Qualidade da comida',
  embalagem_danificada: 'Embalagem danificada',
  cobranca_duplicada: 'Cobrança duplicada',
  fraude_suspeita: 'Suspeita de fraude',
  endereco_incorreto: 'Endereço incorreto',
  restaurante_fechado: 'Restaurante fechado',
}

/** Forma longa para leitura corrida; a curta é para eixo, chip e cabeçalho. */
export const ROTULO_RESPONSABILIDADE: Record<Responsabilidade, string> = {
  parceiro: 'Responsabilidade do parceiro',
  entregador: 'Responsabilidade do entregador',
  plataforma: 'Responsabilidade da plataforma',
  cliente: 'Responsabilidade do cliente',
  indefinida: 'Responsabilidade indefinida',
}

export const ROTULO_RESPONSABILIDADE_CURTO: Record<Responsabilidade, string> = {
  parceiro: 'Parceiro',
  entregador: 'Entregador',
  plataforma: 'Plataforma',
  cliente: 'Cliente',
  indefinida: 'Indefinida',
}

export const ROTULO_SUBTIPO_RECLAMACAO: Record<SubtipoReclamacao, string> = {
  atraso_entrega: 'Atraso na entrega',
  atraso_preparo: 'Atraso no preparo',
  pedido_incompleto: 'Pedido incompleto',
  pedido_trocado: 'Pedido trocado',
  comida_fria: 'Comida fria',
  comida_estragada: 'Comida estragada',
  embalagem_violada: 'Embalagem violada',
  cobranca_indevida: 'Cobrança indevida',
  cancelado_pelo_parceiro: 'Cancelado pelo parceiro',
  cancelado_por_falta_de_entregador: 'Cancelado por falta de entregador',
  cancelado_pelo_cliente: 'Cancelado pelo cliente',
}

export const rotuloTipoOcorrencia = (t: TipoOcorrencia) => ROTULO_TIPO_OCORRENCIA[t] ?? t
export const rotuloMotivo = (m: MotivoOcorrencia) => ROTULO_MOTIVO[m] ?? m
export const rotuloResponsabilidade = (r: Responsabilidade) => ROTULO_RESPONSABILIDADE[r] ?? r
export const rotuloResponsabilidadeCurto = (r: Responsabilidade) =>
  ROTULO_RESPONSABILIDADE_CURTO[r] ?? r
export const rotuloSubtipoReclamacao = (s: SubtipoReclamacao) => ROTULO_SUBTIPO_RECLAMACAO[s] ?? s

// ---------------------------------------------------------------------------
// Recorte
// ---------------------------------------------------------------------------

export interface FiltroOcorrencias {
  /** Vazio = todos. */
  tipos: TipoOcorrencia[]
  motivos: MotivoOcorrencia[]
  responsabilidades: Responsabilidade[]
}

export const FILTRO_VAZIO: FiltroOcorrencias = { tipos: [], motivos: [], responsabilidades: [] }

export function filtroAtivo(f: FiltroOcorrencias): boolean {
  return f.tipos.length > 0 || f.motivos.length > 0 || f.responsabilidades.length > 0
}

/** Ocorrências do recorte: parceiros do snapshot, dias do período e chips aplicados. */
export function ocorrenciasDoSnapshot(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): FatoOcorrencia[] {
  const out: FatoOcorrencia[] = []
  for (const o of dataset.ocorrencias) {
    if (!s.ids.has(o.id_parceiro)) continue
    if (o.data < s.periodo.inicio || o.data > s.periodo.fim) continue
    if (f.tipos.length > 0 && !f.tipos.includes(o.tipo)) continue
    if (f.motivos.length > 0 && !f.motivos.includes(o.motivo)) continue
    if (f.responsabilidades.length > 0 && !f.responsabilidades.includes(o.responsabilidade)) continue
    out.push(o)
  }
  return out
}

/** Denominador zerado não vira NaN nem Infinity: vira ausência de número. */
function razao(numerador: number, denominador: number): number | null {
  return denominador === 0 ? null : numerador / denominador
}

const soma = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)

// ---------------------------------------------------------------------------
// Faixa de totais
// ---------------------------------------------------------------------------

export interface ResumoOcorrencias {
  total: number
  valor: number
  valor_ressarcido: number
  /** Parte do valor que ainda não voltou para o cliente. */
  valor_em_aberto: number
  pedidos: number
  /** Ocorrências por 100 pedidos do recorte. `null` sem pedidos. */
  taxa_por_100: number | null
  /** Fração da receita do recorte comprometida pelas ocorrências. `null` sem receita. */
  pct_receita: number | null
  ticket_medio: number | null
  reincidentes: number
  parceiros_afetados: number
}

export function resumoOcorrencias(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): ResumoOcorrencias {
  const lista = ocorrenciasDoSnapshot(s, f)
  let valor = 0
  let ressarcido = 0
  let reincidentes = 0
  const parceiros = new Set<string>()
  for (const o of lista) {
    valor += o.valor
    ressarcido += o.valor_ressarcido
    if (o.reincidente) reincidentes++
    parceiros.add(o.id_parceiro)
  }

  return {
    total: lista.length,
    valor,
    valor_ressarcido: ressarcido,
    valor_em_aberto: Math.max(0, valor - ressarcido),
    pedidos: s.totalPedidos,
    taxa_por_100: porCem(lista.length, s.totalPedidos),
    pct_receita: razao(valor, s.receitaTotal),
    ticket_medio: razao(valor, lista.length),
    reincidentes,
    parceiros_afetados: parceiros.size,
  }
}

// ---------------------------------------------------------------------------
// Distribuições
// ---------------------------------------------------------------------------

export interface LinhaDistribuicao<T extends string> {
  chave: T
  rotulo: string
  contagem: number
  valor: number
  valor_ressarcido: number
  /** Participação na contagem total do recorte. 0 quando não há ocorrência. */
  pct: number
  pct_valor: number
}

function distribuir<T extends string>(
  lista: FatoOcorrencia[],
  chaveDe: (o: FatoOcorrencia) => T,
  ordem: T[],
  rotuloDe: (chave: T) => string,
): LinhaDistribuicao<T>[] {
  const contagem = new Map<string, number>()
  const valor = new Map<string, number>()
  const ressarcido = new Map<string, number>()
  let totalContagem = 0
  let totalValor = 0
  for (const o of lista) {
    const k = chaveDe(o)
    soma(contagem, k, 1)
    soma(valor, k, o.valor)
    soma(ressarcido, k, o.valor_ressarcido)
    totalContagem++
    totalValor += o.valor
  }

  return ordem
    .filter((k) => (contagem.get(k) ?? 0) > 0)
    .map((k) => {
      const n = contagem.get(k) ?? 0
      const v = valor.get(k) ?? 0
      return {
        chave: k,
        rotulo: rotuloDe(k),
        contagem: n,
        valor: v,
        valor_ressarcido: ressarcido.get(k) ?? 0,
        pct: razao(n, totalContagem) ?? 0,
        pct_valor: razao(v, totalValor) ?? 0,
      }
    })
    .sort((a, b) => b.contagem - a.contagem || b.valor - a.valor)
}

export function porTipo(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): LinhaDistribuicao<TipoOcorrencia>[] {
  return distribuir(
    ocorrenciasDoSnapshot(s, f),
    (o) => o.tipo,
    TIPOS_OCORRENCIA,
    rotuloTipoOcorrencia,
  )
}

export function porMotivo(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): LinhaDistribuicao<MotivoOcorrencia>[] {
  return distribuir(ocorrenciasDoSnapshot(s, f), (o) => o.motivo, MOTIVOS_OCORRENCIA, rotuloMotivo)
}

export function porResponsabilidade(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): LinhaDistribuicao<Responsabilidade>[] {
  return distribuir(
    ocorrenciasDoSnapshot(s, f),
    (o) => o.responsabilidade,
    RESPONSABILIDADES,
    rotuloResponsabilidadeCurto,
  )
}

/** Reclamações do recorte pela tipagem fina — o outro lado do mesmo problema. */
export interface LinhaSubtipoReclamacao {
  chave: SubtipoReclamacao
  rotulo: string
  contagem: number
  graves: number
  pct: number
}

export function porSubtipoReclamacao(s: Snapshot): LinhaSubtipoReclamacao[] {
  const contagem = new Map<string, number>()
  const graves = new Map<string, number>()
  let total = 0
  for (const r of dataset.reclamacoes) {
    if (!s.ids.has(r.id_parceiro)) continue
    if (r.data < s.periodo.inicio || r.data > s.periodo.fim) continue
    soma(contagem, r.subtipo, 1)
    if (r.gravidade === 'alta') soma(graves, r.subtipo, 1)
    total++
  }

  return (Object.keys(ROTULO_SUBTIPO_RECLAMACAO) as SubtipoReclamacao[])
    .filter((k) => (contagem.get(k) ?? 0) > 0)
    .map((k) => {
      const n = contagem.get(k) ?? 0
      return {
        chave: k,
        rotulo: rotuloSubtipoReclamacao(k),
        contagem: n,
        graves: graves.get(k) ?? 0,
        pct: razao(n, total) ?? 0,
      }
    })
    .sort((a, b) => b.contagem - a.contagem)
}

// ---------------------------------------------------------------------------
// Por parceiro
// ---------------------------------------------------------------------------

export interface LinhaOcorrenciaParceiro {
  id_parceiro: string
  parceiro: string
  praca: string
  executivo: string
  gerente: string
  pedidos: number
  receita: number
  ocorrencias: number
  taxa_por_100: number | null
  valor: number
  valor_ressarcido: number
  pct_receita: number | null
  motivo_predominante: MotivoOcorrencia | null
  motivo_predominante_qtd: number
  tipo_predominante: TipoOcorrencia | null
  /** Ocorrências marcadas como reincidentes no recorte. */
  reincidencias: number
  reincidente: boolean
  reclamacoes: number
}

export function porParceiro(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): LinhaOcorrenciaParceiro[] {
  const lista = ocorrenciasDoSnapshot(s, f)

  const porId = new Map<string, FatoOcorrencia[]>()
  for (const o of lista) {
    const atual = porId.get(o.id_parceiro) ?? []
    atual.push(o)
    porId.set(o.id_parceiro, atual)
  }

  const linhas: LinhaOcorrenciaParceiro[] = []
  for (const p of s.parceiros) {
    const doParceiro = porId.get(p.id_parceiro) ?? []
    const pedidos = s.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    // Parceiro sem pedido e sem ocorrência não é linha de relatório: é ruído.
    if (pedidos === 0 && doParceiro.length === 0) continue

    const receita = s.receitaPorParceiro.get(p.id_parceiro) ?? 0
    const contagemMotivo = new Map<string, number>()
    const contagemTipo = new Map<string, number>()
    let valor = 0
    let ressarcido = 0
    let reincidencias = 0
    for (const o of doParceiro) {
      valor += o.valor
      ressarcido += o.valor_ressarcido
      if (o.reincidente) reincidencias++
      soma(contagemMotivo, o.motivo, 1)
      soma(contagemTipo, o.tipo, 1)
    }

    const topMotivo = maior(contagemMotivo, MOTIVOS_OCORRENCIA)
    const topTipo = maior(contagemTipo, TIPOS_OCORRENCIA)

    linhas.push({
      id_parceiro: p.id_parceiro,
      parceiro: p.nome,
      praca: p.praca,
      executivo: nomeExecutivo(p.id_executivo),
      gerente: nomeGerenteDoExecutivo(p.id_executivo),
      pedidos,
      receita,
      ocorrencias: doParceiro.length,
      taxa_por_100: porCem(doParceiro.length, pedidos),
      valor,
      valor_ressarcido: ressarcido,
      pct_receita: razao(valor, receita),
      motivo_predominante: topMotivo?.chave ?? null,
      motivo_predominante_qtd: topMotivo?.qtd ?? 0,
      tipo_predominante: topTipo?.chave ?? null,
      reincidencias,
      reincidente: reincidencias > 0,
      reclamacoes: s.reclamacoes.get(p.id_parceiro) ?? 0,
    })
  }

  return linhas.sort((a, b) => b.valor - a.valor || b.ocorrencias - a.ocorrencias)
}

/** Empate resolve pela ordem canônica do enum — sem isso a linha oscilaria. */
function maior<T extends string>(
  contagem: Map<string, number>,
  ordem: T[],
): { chave: T; qtd: number } | null {
  let melhor: { chave: T; qtd: number } | null = null
  for (const chave of ordem) {
    const qtd = contagem.get(chave) ?? 0
    if (qtd > 0 && (melhor === null || qtd > melhor.qtd)) melhor = { chave, qtd }
  }
  return melhor
}

// ---------------------------------------------------------------------------
// Evolução diária
// ---------------------------------------------------------------------------

export interface PontoOcorrenciaDia {
  dia: string
  rotulo: string
  contagem: number
  valor: number
  valor_ressarcido: number
}

export function evolucaoDiaria(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): PontoOcorrenciaDia[] {
  const contagem = new Map<string, number>()
  const valor = new Map<string, number>()
  const ressarcido = new Map<string, number>()
  for (const o of ocorrenciasDoSnapshot(s, f)) {
    soma(contagem, o.data, 1)
    soma(valor, o.data, o.valor)
    soma(ressarcido, o.data, o.valor_ressarcido)
  }

  // Todos os dias do período, inclusive os limpos: buraco na série é informação.
  return s.dias.map((dia) => ({
    dia,
    rotulo: formatarDia(dia),
    contagem: contagem.get(dia) ?? 0,
    valor: valor.get(dia) ?? 0,
    valor_ressarcido: ressarcido.get(dia) ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Parceiros críticos
// ---------------------------------------------------------------------------

/** Abaixo disso a taxa é ruído de amostra, não sinal de operação. */
export const MINIMO_PEDIDOS_CRITICO = 40
export const MINIMO_OCORRENCIAS_CRITICO = 3
export const FATOR_CRITICO = 2

export interface LinhaCritica extends LinhaOcorrenciaParceiro {
  taxa: number
  vezes_a_media: number
  frase: string
}

export interface ParceirosCriticos {
  /** Ocorrências por 100 pedidos do grupo inteiro. `null` sem pedidos. */
  taxa_grupo: number | null
  /** Linha de corte: `FATOR_CRITICO` × a taxa do grupo. */
  limite: number | null
  minimo_pedidos: number
  minimo_ocorrencias: number
  avaliados: number
  linhas: LinhaCritica[]
}

export function parceirosCriticos(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): ParceirosCriticos {
  const linhas = porParceiro(s, f)
  const total = ocorrenciasDoSnapshot(s, f).length
  const taxa_grupo = porCem(total, s.totalPedidos)
  const limite = taxa_grupo === null ? null : taxa_grupo * FATOR_CRITICO

  const elegiveis = linhas.filter(
    (l) => l.pedidos >= MINIMO_PEDIDOS_CRITICO && l.ocorrencias >= MINIMO_OCORRENCIAS_CRITICO,
  )

  const criticas: LinhaCritica[] =
    limite === null || taxa_grupo === null || taxa_grupo === 0
      ? []
      : elegiveis
          .filter((l) => l.taxa_por_100 !== null && l.taxa_por_100 > limite)
          .map((l) => {
            const taxa = l.taxa_por_100 ?? 0
            const vezes = taxa / taxa_grupo
            const motivo =
              l.motivo_predominante === null
                ? ''
                : ` Motivo predominante: ${rotuloMotivo(l.motivo_predominante).toLowerCase()} (${fmtInt(l.motivo_predominante_qtd)} de ${fmtInt(l.ocorrencias)}).`
            return {
              ...l,
              taxa,
              vezes_a_media: vezes,
              frase:
                `${fmtInt(l.ocorrencias)} ${l.ocorrencias === 1 ? 'ocorrência' : 'ocorrências'} em ${fmtInt(l.pedidos)} pedidos — ` +
                `${fmtDec(taxa, 1)} por 100, ${fmtDec(vezes, 1)}× a média do grupo (${fmtDec(taxa_grupo, 1)}). ` +
                `${fmtMoeda(l.valor)} de prejuízo no recorte.${motivo}`,
            }
          })
          .sort((a, b) => b.valor - a.valor || b.taxa - a.taxa)

  return {
    taxa_grupo,
    limite,
    minimo_pedidos: MINIMO_PEDIDOS_CRITICO,
    minimo_ocorrencias: MINIMO_OCORRENCIAS_CRITICO,
    avaliados: elegiveis.length,
    linhas: criticas,
  }
}

// ---------------------------------------------------------------------------
// Motivo × responsabilidade
// ---------------------------------------------------------------------------

export interface CruzamentoMotivoResponsabilidade {
  motivos: MotivoOcorrencia[]
  responsabilidades: Responsabilidade[]
  /** `celulas[linha][coluna]` — contagem de ocorrências. */
  celulas: number[][]
  valores: number[][]
  totalPorMotivo: number[]
  totalPorResponsabilidade: number[]
  max: number
  total: number
}

export function cruzamentoMotivoResponsabilidade(
  s: Snapshot,
  f: FiltroOcorrencias = FILTRO_VAZIO,
): CruzamentoMotivoResponsabilidade {
  const lista = ocorrenciasDoSnapshot(s, f)
  const responsabilidades =
    f.responsabilidades.length > 0
      ? RESPONSABILIDADES.filter((r) => f.responsabilidades.includes(r))
      : RESPONSABILIDADES

  const contagemMotivo = new Map<string, number>()
  for (const o of lista) soma(contagemMotivo, o.motivo, 1)
  const motivos = MOTIVOS_OCORRENCIA.filter((m) => (contagemMotivo.get(m) ?? 0) > 0).sort(
    (a, b) => (contagemMotivo.get(b) ?? 0) - (contagemMotivo.get(a) ?? 0),
  )

  const linhaDe = new Map(motivos.map((m, i) => [m, i]))
  const colunaDe = new Map(responsabilidades.map((r, i) => [r, i]))
  const celulas = motivos.map(() => responsabilidades.map(() => 0))
  const valores = motivos.map(() => responsabilidades.map(() => 0))

  for (const o of lista) {
    const l = linhaDe.get(o.motivo)
    const c = colunaDe.get(o.responsabilidade)
    if (l === undefined || c === undefined) continue
    celulas[l][c]++
    valores[l][c] += o.valor
  }

  let max = 0
  const totalPorMotivo = motivos.map(() => 0)
  const totalPorResponsabilidade = responsabilidades.map(() => 0)
  for (let l = 0; l < motivos.length; l++) {
    for (let c = 0; c < responsabilidades.length; c++) {
      const v = celulas[l][c]
      if (v > max) max = v
      totalPorMotivo[l] += v
      totalPorResponsabilidade[c] += v
    }
  }

  return {
    motivos,
    responsabilidades,
    celulas,
    valores,
    totalPorMotivo,
    totalPorResponsabilidade,
    max,
    total: lista.length,
  }
}
