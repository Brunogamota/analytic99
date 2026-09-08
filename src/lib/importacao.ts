import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { dataset } from '@/data/seed'

/**
 * Reconhecimento de arquivo por heurística determinística: nome da coluna
 * comparado com sinônimos + formato dos valores da amostra. Não há modelo de
 * linguagem em lugar nenhum — o que existe é pontuação explícita, e por isso
 * ela pode (e deve) ser conferida e corrigida pelo usuário na tela.
 */

export const LIMITE_LINHAS = 500

// ---------------------------------------------------------------------------
// Normalização e conversões
// ---------------------------------------------------------------------------

/** minúsculas, sem acento, com `_`/`-`/`.`/`/` e espaços unificados. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/
const RE_DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/
const RE_MES_ANO = /^\d{4}-\d{2}$/
const RE_ID = /^([A-Za-z]{1,3})(\d{1,10})$/

const VERDADEIRO = new Set(['1', 'sim', 's', 'true', 'v', 'verdadeiro', 'yes', 'y', 'ativo'])
const FALSO = new Set(['0', 'nao', 'n', 'false', 'f', 'falso', 'no', 'inativo'])

/** Aceita decimal com vírgula e milhar com ponto — senão reprova dado brasileiro correto. */
export function paraNumero(valor: string): number | null {
  const bruto = valor.trim().replace(/\s|R\$/g, '')
  if (bruto === '') return null
  let limpo = bruto
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  else if ((limpo.match(/\./g) ?? []).length > 1) limpo = limpo.replace(/\./g, '')
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

export function ehBooleano(valor: string): boolean {
  const v = normalizar(valor)
  return VERDADEIRO.has(v) || FALSO.has(v)
}

/** Devolve a data em ISO quando reconhece o formato; `null` quando não é data válida. */
export function paraData(valor: string): string | null {
  const v = valor.trim()
  let ano: number
  let mes: number
  let dia: number
  if (RE_DATA.test(v)) [ano, mes, dia] = v.split('-').map(Number)
  else if (RE_DATA_BR.test(v)) {
    const [d, m, a] = v.split('/').map(Number)
    ano = a
    mes = m
    dia = d
  } else return null
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const teste = new Date(Date.UTC(ano, mes - 1, dia))
  if (teste.getUTCMonth() + 1 !== mes || teste.getUTCDate() !== dia) return null
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function ehMesAno(valor: string): boolean {
  const v = valor.trim()
  if (!RE_MES_ANO.test(v)) return false
  const mes = Number(v.slice(5))
  return mes >= 1 && mes <= 12
}

// ---------------------------------------------------------------------------
// Leitura do arquivo
// ---------------------------------------------------------------------------

export interface ArquivoLido {
  colunas: string[]
  linhas: Record<string, string>[]
}

/** Cabeçalhos vazios ou repetidos viram nomes únicos — senão colunas somem no `Record`. */
function cabecalhosUnicos(bruto: unknown[]): string[] {
  const vistos = new Map<string, number>()
  return bruto.map((c, i) => {
    const base = String(c ?? '').trim() || `coluna_${i + 1}`
    const n = (vistos.get(base) ?? 0) + 1
    vistos.set(base, n)
    return n === 1 ? base : `${base} (${n})`
  })
}

function matrizParaLinhas(matriz: unknown[][]): ArquivoLido {
  const semVazias = matriz.filter((l) => l.some((c) => String(c ?? '').trim() !== ''))
  if (semVazias.length === 0) return { colunas: [], linhas: [] }
  const colunas = cabecalhosUnicos(semVazias[0])
  const linhas = semVazias.slice(1, LIMITE_LINHAS + 1).map((linha) => {
    const registro: Record<string, string> = {}
    colunas.forEach((nome, i) => {
      registro[nome] = String(linha[i] ?? '').trim()
    })
    return registro
  })
  return { colunas, linhas }
}

export async function lerArquivo(file: File): Promise<ArquivoLido> {
  const extensao = file.name.toLowerCase().split('.').pop() ?? ''

  if (extensao === 'xlsx' || extensao === 'xls') {
    const buffer = await file.arrayBuffer()
    const pasta = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false })
    const nomeAba = pasta.SheetNames[0]
    if (!nomeAba) throw new Error('A planilha não tem nenhuma aba com dados.')
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(pasta.Sheets[nomeAba], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    })
    return matrizParaLinhas(matriz)
  }

  const texto = await file.text()
  const resultado = Papa.parse<string[]>(texto, {
    header: false,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [';', ',', '\t', '|'],
    preview: LIMITE_LINHAS + 1,
  })
  if (resultado.data.length === 0) throw new Error('O arquivo não tem nenhuma linha legível.')
  return matrizParaLinhas(resultado.data)
}

// ---------------------------------------------------------------------------
// Modelo alvo
// ---------------------------------------------------------------------------

export type TipoCampo = 'texto' | 'numero' | 'data' | 'booleano' | 'id'

export interface CampoAlvo {
  id: string
  tabela: string
  campo: string
  rotulo: string
  tipo: TipoCampo
  sinonimos: string[]
  validar?: (v: string) => boolean
  /** Campo sem o qual a tabela não se sustenta — é o que decide a detecção. */
  obrigatorio?: boolean
  /** Compõe a chave que não pode repetir dentro do arquivo. */
  chave?: boolean
  /** Prefixo esperado dos ids desta coluna: `P07`, `E04`, `O000123`… */
  prefixoId?: string
  /** Quando presente, o id precisa existir no dataset carregado. */
  referencia?: 'parceiros' | 'executivos' | 'gerentes'
  /** Conjunto fechado de valores aceitos. */
  dominio?: string[]
  exemplo: [string, string, string]
}

export const TABELAS: { id: string; rotulo: string; descricao: string }[] = [
  { id: 'dim_gerente', rotulo: 'dim_gerente', descricao: 'Gerentes e suas regiões' },
  { id: 'dim_executivo', rotulo: 'dim_executivo', descricao: 'Executivos e a quem respondem' },
  { id: 'dim_parceiro', rotulo: 'dim_parceiro', descricao: 'Cadastro de lojas parceiras' },
  { id: 'fato_promo', rotulo: 'fato_promo', descricao: 'Budget e aderência por promo/mês' },
  { id: 'fato_pedido', rotulo: 'fato_pedido', descricao: 'Pedidos com hora e valor' },
  { id: 'fato_horas', rotulo: 'fato_horas', descricao: 'Horas online por loja e dia' },
  { id: 'hist_banner', rotulo: 'hist_banner', descricao: 'Banner ativo por mês' },
  { id: 'fato_reclamacao', rotulo: 'fato_reclamacao', descricao: 'Reclamações por tipo e gravidade' },
]

const SIN_PARCEIRO = [
  'parceiro',
  'id parceiro',
  'id do parceiro',
  'cod parceiro',
  'codigo parceiro',
  'codigo do parceiro',
  'loja',
  'id loja',
  'codigo loja',
  'estabelecimento',
  'estab',
  'restaurante',
  'merchant',
  'merchant id',
  'store',
  'store id',
  'partner',
  'partner id',
]

const SIN_EXECUTIVO = [
  'executivo',
  'id executivo',
  'id do executivo',
  'cod executivo',
  'exec',
  'consultor',
  'account manager',
  'executive',
  'sales rep',
  'carteira',
]

const SIN_GERENTE = [
  'gerente',
  'id gerente',
  'id do gerente',
  'cod gerente',
  'manager',
  'manager id',
  'gestor',
  'coordenador',
]

const SIN_DATA = [
  'data',
  'dia',
  'date',
  'data ref',
  'data referencia',
  'data base',
  'data do pedido',
  'dt',
  'day',
]

const SIN_ATIVO = ['ativo', 'ativa', 'status', 'active', 'is active', 'habilitado', 'em atividade']

function campo(c: CampoAlvo): CampoAlvo {
  return c
}

export const CAMPOS: CampoAlvo[] = [
  // ---- dim_gerente --------------------------------------------------------
  campo({
    id: 'dim_gerente.id_gerente',
    tabela: 'dim_gerente',
    campo: 'id_gerente',
    rotulo: 'ID do gerente',
    tipo: 'id',
    sinonimos: SIN_GERENTE,
    obrigatorio: true,
    chave: true,
    prefixoId: 'G',
    exemplo: ['G01', 'G02', 'G03'],
  }),
  campo({
    id: 'dim_gerente.nome',
    tabela: 'dim_gerente',
    campo: 'nome',
    rotulo: 'Nome do gerente',
    tipo: 'texto',
    sinonimos: ['nome', 'nome gerente', 'nome do gerente', 'name', 'manager name', 'responsavel'],
    obrigatorio: true,
    exemplo: ['Marina Prado', 'Diego Fontes', 'Aline Rebouças'],
  }),
  campo({
    id: 'dim_gerente.regiao',
    tabela: 'dim_gerente',
    campo: 'regiao',
    rotulo: 'Região',
    tipo: 'texto',
    sinonimos: ['regiao', 'region', 'area', 'territorio', 'uf', 'estado', 'macro regiao'],
    obrigatorio: true,
    exemplo: ['São Paulo', 'Rio de Janeiro', 'Nordeste'],
  }),

  // ---- dim_executivo ------------------------------------------------------
  campo({
    id: 'dim_executivo.id_executivo',
    tabela: 'dim_executivo',
    campo: 'id_executivo',
    rotulo: 'ID do executivo',
    tipo: 'id',
    sinonimos: SIN_EXECUTIVO,
    obrigatorio: true,
    chave: true,
    prefixoId: 'E',
    exemplo: ['E01', 'E02', 'E03'],
  }),
  campo({
    id: 'dim_executivo.nome',
    tabela: 'dim_executivo',
    campo: 'nome',
    rotulo: 'Nome do executivo',
    tipo: 'texto',
    sinonimos: ['nome', 'nome executivo', 'nome do executivo', 'name', 'rep name'],
    obrigatorio: true,
    exemplo: ['Bruno Tavares', 'Camila Nakamura', 'Rafael Siqueira'],
  }),
  campo({
    id: 'dim_executivo.id_gerente',
    tabela: 'dim_executivo',
    campo: 'id_gerente',
    rotulo: 'Gerente responsável',
    tipo: 'id',
    sinonimos: SIN_GERENTE,
    obrigatorio: true,
    prefixoId: 'G',
    referencia: 'gerentes',
    exemplo: ['G01', 'G01', 'G02'],
  }),
  campo({
    id: 'dim_executivo.ativo',
    tabela: 'dim_executivo',
    campo: 'ativo',
    rotulo: 'Ativo',
    tipo: 'booleano',
    sinonimos: SIN_ATIVO,
    exemplo: ['1', '1', '0'],
  }),

  // ---- dim_parceiro -------------------------------------------------------
  campo({
    id: 'dim_parceiro.id_parceiro',
    tabela: 'dim_parceiro',
    campo: 'id_parceiro',
    rotulo: 'ID do parceiro',
    tipo: 'id',
    sinonimos: SIN_PARCEIRO,
    obrigatorio: true,
    chave: true,
    prefixoId: 'P',
    exemplo: ['P51', 'P52', 'P53'],
  }),
  campo({
    id: 'dim_parceiro.nome',
    tabela: 'dim_parceiro',
    campo: 'nome',
    rotulo: 'Nome da loja',
    tipo: 'texto',
    sinonimos: [
      'nome',
      'nome loja',
      'nome da loja',
      'nome fantasia',
      'razao social',
      'name',
      'store name',
      'merchant name',
    ],
    obrigatorio: true,
    exemplo: ['Pizzaria do Vale', 'Smash Central', 'Sabor da Praça'],
  }),
  campo({
    id: 'dim_parceiro.categoria',
    tabela: 'dim_parceiro',
    campo: 'categoria',
    rotulo: 'Categoria',
    tipo: 'texto',
    sinonimos: ['categoria', 'category', 'segmento', 'vertical', 'tipo de loja', 'cozinha', 'culinaria'],
    obrigatorio: true,
    dominio: ['pizza', 'burger', 'combo'],
    exemplo: ['pizza', 'burger', 'combo'],
  }),
  campo({
    id: 'dim_parceiro.abre_almoco',
    tabela: 'dim_parceiro',
    campo: 'abre_almoco',
    rotulo: 'Abre no almoço',
    tipo: 'booleano',
    sinonimos: [
      'abre almoco',
      'almoco',
      'abre no almoco',
      'atende almoco',
      'abertura almoco',
      'lunch',
      'open lunch',
      'opens lunch',
      'horario almoco',
    ],
    exemplo: ['1', '0', '1'],
  }),
  campo({
    id: 'dim_parceiro.cidade',
    tabela: 'dim_parceiro',
    campo: 'cidade',
    rotulo: 'Cidade',
    tipo: 'texto',
    sinonimos: ['cidade', 'city', 'municipio', 'localidade'],
    exemplo: ['São Paulo', 'Santo André', 'Recife'],
  }),
  campo({
    id: 'dim_parceiro.praca',
    tabela: 'dim_parceiro',
    campo: 'praca',
    rotulo: 'Praça',
    tipo: 'texto',
    sinonimos: ['praca', 'zona', 'cluster', 'polo', 'sub regiao', 'district', 'marketplace'],
    exemplo: ['SP — Zona Sul', 'ABC Paulista', 'Recife'],
  }),
  campo({
    id: 'dim_parceiro.id_executivo',
    tabela: 'dim_parceiro',
    campo: 'id_executivo',
    rotulo: 'Executivo responsável',
    tipo: 'id',
    sinonimos: SIN_EXECUTIVO,
    obrigatorio: true,
    prefixoId: 'E',
    referencia: 'executivos',
    exemplo: ['E01', 'E02', 'E03'],
  }),
  campo({
    id: 'dim_parceiro.ativo',
    tabela: 'dim_parceiro',
    campo: 'ativo',
    rotulo: 'Ativo',
    tipo: 'booleano',
    sinonimos: SIN_ATIVO,
    exemplo: ['1', '1', '1'],
  }),

  // ---- fato_promo ---------------------------------------------------------
  campo({
    id: 'fato_promo.id_parceiro',
    tabela: 'fato_promo',
    campo: 'id_parceiro',
    rotulo: 'ID do parceiro',
    tipo: 'id',
    sinonimos: SIN_PARCEIRO,
    obrigatorio: true,
    chave: true,
    prefixoId: 'P',
    referencia: 'parceiros',
    exemplo: ['P01', 'P01', 'P02'],
  }),
  campo({
    id: 'fato_promo.id_executivo',
    tabela: 'fato_promo',
    campo: 'id_executivo',
    rotulo: 'Executivo responsável',
    tipo: 'id',
    sinonimos: SIN_EXECUTIVO,
    prefixoId: 'E',
    referencia: 'executivos',
    exemplo: ['E01', 'E01', 'E02'],
  }),
  campo({
    id: 'fato_promo.tipo_promo',
    tabela: 'fato_promo',
    campo: 'tipo_promo',
    rotulo: 'Tipo de promo',
    tipo: 'texto',
    sinonimos: [
      'tipo promo',
      'tipo de promo',
      'tipo promocao',
      'promo',
      'promocao',
      'tipo',
      'campanha',
      'tipo campanha',
      'promo type',
    ],
    obrigatorio: true,
    chave: true,
    dominio: ['smart', 'banner', 'special'],
    exemplo: ['smart', 'banner', 'special'],
  }),
  campo({
    id: 'fato_promo.budget_needed',
    tabela: 'fato_promo',
    campo: 'budget_needed',
    rotulo: 'Budget previsto',
    tipo: 'numero',
    sinonimos: [
      'budget needed',
      'budget necessario',
      'budget previsto',
      'budget planejado',
      'budget esperado',
      'verba prevista',
      'verba necessaria',
      'verba planejada',
      'orcamento previsto',
      'meta de budget',
    ],
    obrigatorio: true,
    exemplo: ['4200', '3800,50', '9100'],
  }),
  campo({
    id: 'fato_promo.budget_real',
    tabela: 'fato_promo',
    campo: 'budget_real',
    rotulo: 'Budget realizado',
    tipo: 'numero',
    sinonimos: [
      'budget real',
      'budget gasto',
      'budget realizado',
      'budget executado',
      'verba real',
      'verba gasta',
      'verba realizada',
      'orcamento real',
      'investimento real',
      'gasto',
    ],
    obrigatorio: true,
    exemplo: ['3980', '4110,20', '9800'],
  }),
  campo({
    id: 'fato_promo.aderente',
    tabela: 'fato_promo',
    campo: 'aderente',
    rotulo: 'Aderente',
    tipo: 'booleano',
    sinonimos: ['aderente', 'aderencia', 'adesao', 'cumpriu', 'compliance', 'is compliant'],
    exemplo: ['1', '0', '1'],
  }),
  campo({
    id: 'fato_promo.dias_aderencia',
    tabela: 'fato_promo',
    campo: 'dias_aderencia',
    rotulo: 'Dias de aderência',
    tipo: 'numero',
    sinonimos: [
      'dias aderencia',
      'dias de aderencia',
      'dias aderentes',
      'dias cumpridos',
      'dias com promo',
      'compliant days',
    ],
    exemplo: ['28', '12', '30'],
  }),
  campo({
    id: 'fato_promo.dias_periodo',
    tabela: 'fato_promo',
    campo: 'dias_periodo',
    rotulo: 'Dias do período',
    tipo: 'numero',
    sinonimos: [
      'dias periodo',
      'dias do periodo',
      'dias do mes',
      'dias corridos',
      'total de dias',
      'period days',
    ],
    exemplo: ['31', '31', '30'],
  }),
  campo({
    id: 'fato_promo.data',
    tabela: 'fato_promo',
    campo: 'data',
    rotulo: 'Primeiro dia do mês',
    tipo: 'data',
    sinonimos: [...SIN_DATA, 'competencia', 'mes de referencia', 'inicio do mes'],
    obrigatorio: true,
    chave: true,
    exemplo: ['2026-09-01', '2026-09-01', '2026-09-01'],
  }),

  // ---- fato_pedido --------------------------------------------------------
  campo({
    id: 'fato_pedido.id_pedido',
    tabela: 'fato_pedido',
    campo: 'id_pedido',
    rotulo: 'ID do pedido',
    tipo: 'id',
    sinonimos: [
      'id pedido',
      'pedido',
      'cod pedido',
      'codigo pedido',
      'numero do pedido',
      'nr pedido',
      'order',
      'order id',
      'id order',
    ],
    obrigatorio: true,
    chave: true,
    prefixoId: 'O',
    exemplo: ['O900001', 'O900002', 'O900003'],
  }),
  campo({
    id: 'fato_pedido.id_parceiro',
    tabela: 'fato_pedido',
    campo: 'id_parceiro',
    rotulo: 'ID do parceiro',
    tipo: 'id',
    sinonimos: SIN_PARCEIRO,
    obrigatorio: true,
    prefixoId: 'P',
    referencia: 'parceiros',
    exemplo: ['P01', 'P02', 'P03'],
  }),
  campo({
    id: 'fato_pedido.data',
    tabela: 'fato_pedido',
    campo: 'data',
    rotulo: 'Data do pedido',
    tipo: 'data',
    sinonimos: SIN_DATA,
    obrigatorio: true,
    exemplo: ['2026-09-01', '2026-09-01', '2026-09-02'],
  }),
  campo({
    id: 'fato_pedido.hora',
    tabela: 'fato_pedido',
    campo: 'hora',
    rotulo: 'Hora do pedido',
    tipo: 'numero',
    sinonimos: ['hora', 'hora do pedido', 'horario', 'faixa horaria', 'hour', 'hour of day'],
    obrigatorio: true,
    validar: (v) => {
      const n = paraNumero(v)
      return n !== null && Number.isInteger(n) && n >= 0 && n <= 23
    },
    exemplo: ['19', '20', '12'],
  }),
  campo({
    id: 'fato_pedido.valor',
    tabela: 'fato_pedido',
    campo: 'valor',
    rotulo: 'Valor do pedido',
    tipo: 'numero',
    sinonimos: [
      'valor',
      'valor do pedido',
      'valor total',
      'ticket',
      'preco',
      'total',
      'amount',
      'value',
      'gmv',
      'receita',
      'faturamento',
    ],
    obrigatorio: true,
    exemplo: ['78,40', '54,90', '46,00'],
  }),
  campo({
    id: 'fato_pedido.dia_semana',
    tabela: 'fato_pedido',
    campo: 'dia_semana',
    rotulo: 'Dia da semana (0=dom)',
    tipo: 'numero',
    sinonimos: ['dia semana', 'dia da semana', 'weekday', 'day of week', 'dow'],
    validar: (v) => {
      const n = paraNumero(v)
      return n !== null && Number.isInteger(n) && n >= 0 && n <= 6
    },
    exemplo: ['2', '2', '3'],
  }),

  // ---- fato_horas ---------------------------------------------------------
  campo({
    id: 'fato_horas.id_parceiro',
    tabela: 'fato_horas',
    campo: 'id_parceiro',
    rotulo: 'ID do parceiro',
    tipo: 'id',
    sinonimos: SIN_PARCEIRO,
    obrigatorio: true,
    chave: true,
    prefixoId: 'P',
    referencia: 'parceiros',
    exemplo: ['P01', 'P01', 'P02'],
  }),
  campo({
    id: 'fato_horas.data',
    tabela: 'fato_horas',
    campo: 'data',
    rotulo: 'Dia',
    tipo: 'data',
    sinonimos: SIN_DATA,
    obrigatorio: true,
    chave: true,
    exemplo: ['2026-09-01', '2026-09-02', '2026-09-01'],
  }),
  campo({
    id: 'fato_horas.horas_online',
    tabela: 'fato_horas',
    campo: 'horas_online',
    rotulo: 'Horas online',
    tipo: 'numero',
    sinonimos: [
      'horas online',
      'horas',
      'online hours',
      'tempo online',
      'horas conectado',
      'horas conectadas',
      'horas abertas',
      'horas ativas',
      'tempo conectado',
      'online time',
      'horas de operacao',
      'qtd horas',
    ],
    obrigatorio: true,
    validar: (v) => {
      const n = paraNumero(v)
      return n !== null && n >= 0 && n <= 24
    },
    exemplo: ['8,25', '9,10', '7,80'],
  }),

  // ---- hist_banner --------------------------------------------------------
  campo({
    id: 'hist_banner.id_parceiro',
    tabela: 'hist_banner',
    campo: 'id_parceiro',
    rotulo: 'ID do parceiro',
    tipo: 'id',
    sinonimos: SIN_PARCEIRO,
    obrigatorio: true,
    chave: true,
    prefixoId: 'P',
    referencia: 'parceiros',
    exemplo: ['P01', 'P02', 'P03'],
  }),
  campo({
    id: 'hist_banner.mes_ano',
    tabela: 'hist_banner',
    campo: 'mes_ano',
    rotulo: 'Mês (AAAA-MM)',
    tipo: 'data',
    sinonimos: [
      'mes ano',
      'mes',
      'ano mes',
      'competencia',
      'periodo',
      'month',
      'year month',
      'referencia',
    ],
    obrigatorio: true,
    chave: true,
    exemplo: ['2026-09', '2026-09', '2026-09'],
  }),
  campo({
    id: 'hist_banner.tem_banner',
    tabela: 'hist_banner',
    campo: 'tem_banner',
    rotulo: 'Tem banner',
    tipo: 'booleano',
    sinonimos: ['tem banner', 'banner', 'com banner', 'possui banner', 'has banner', 'banner ativo'],
    obrigatorio: true,
    exemplo: ['1', '0', '1'],
  }),

  // ---- fato_reclamacao ----------------------------------------------------
  campo({
    id: 'fato_reclamacao.id_reclamacao',
    tabela: 'fato_reclamacao',
    campo: 'id_reclamacao',
    rotulo: 'ID da reclamação',
    tipo: 'id',
    sinonimos: [
      'id reclamacao',
      'reclamacao',
      'cod reclamacao',
      'id ocorrencia',
      'ocorrencia',
      'protocolo',
      'complaint',
      'complaint id',
      'chamado',
    ],
    obrigatorio: true,
    chave: true,
    prefixoId: 'R',
    exemplo: ['R900001', 'R900002', 'R900003'],
  }),
  campo({
    id: 'fato_reclamacao.id_parceiro',
    tabela: 'fato_reclamacao',
    campo: 'id_parceiro',
    rotulo: 'ID do parceiro',
    tipo: 'id',
    sinonimos: SIN_PARCEIRO,
    obrigatorio: true,
    prefixoId: 'P',
    referencia: 'parceiros',
    exemplo: ['P09', 'P26', 'P48'],
  }),
  campo({
    id: 'fato_reclamacao.data',
    tabela: 'fato_reclamacao',
    campo: 'data',
    rotulo: 'Data da reclamação',
    tipo: 'data',
    sinonimos: SIN_DATA,
    obrigatorio: true,
    exemplo: ['2026-09-01', '2026-09-02', '2026-09-03'],
  }),
  campo({
    id: 'fato_reclamacao.tipo',
    tabela: 'fato_reclamacao',
    campo: 'tipo',
    rotulo: 'Tipo',
    tipo: 'texto',
    sinonimos: [
      'tipo',
      'tipo reclamacao',
      'tipo da reclamacao',
      'motivo',
      'razao',
      'reason',
      'complaint type',
    ],
    obrigatorio: true,
    dominio: ['atraso', 'pedido_errado', 'qualidade', 'cancelamento'],
    exemplo: ['atraso', 'qualidade', 'pedido_errado'],
  }),
  campo({
    id: 'fato_reclamacao.gravidade',
    tabela: 'fato_reclamacao',
    campo: 'gravidade',
    rotulo: 'Gravidade',
    tipo: 'texto',
    sinonimos: ['gravidade', 'severidade', 'severity', 'criticidade', 'prioridade', 'nivel', 'impacto'],
    obrigatorio: true,
    dominio: ['baixa', 'media', 'alta'],
    exemplo: ['baixa', 'alta', 'media'],
  }),
]

export const camposDaTabela = (tabela: string) => CAMPOS.filter((c) => c.tabela === tabela)
export const campoPorId = (id: string) => CAMPOS.find((c) => c.id === id) ?? null

// ---------------------------------------------------------------------------
// Sinal 1 — nome da coluna
// ---------------------------------------------------------------------------

function tokensCasam(a: string, b: string): boolean {
  if (a === b) return true
  const menor = Math.min(a.length, b.length)
  return menor >= 4 && (a.startsWith(b) || b.startsWith(a))
}

function pontuarNome(nomeNorm: string, alvo: CampoAlvo): number {
  if (nomeNorm === '') return 0
  const candidatos = [alvo.campo, ...alvo.sinonimos].map(normalizar)
  const tokensColuna = nomeNorm.split(' ').filter(Boolean)
  const semEspacoColuna = nomeNorm.replace(/ /g, '')
  let melhor = 0

  for (const bruto of candidatos) {
    if (!bruto) continue
    if (bruto === nomeNorm) return 1
    if (bruto.replace(/ /g, '') === semEspacoColuna) return 0.97

    if (nomeNorm.includes(bruto) || bruto.includes(nomeNorm)) {
      const menor = Math.min(bruto.length, nomeNorm.length)
      const maior = Math.max(bruto.length, nomeNorm.length)
      if (menor >= 4) melhor = Math.max(melhor, 0.45 + 0.35 * (menor / maior))
    }

    const tokensAlvo = bruto.split(' ').filter(Boolean)
    const comuns = tokensAlvo.filter((t) =>
      tokensColuna.some((c) => c.length >= 3 && t.length >= 3 && tokensCasam(t, c)),
    ).length
    if (comuns > 0) {
      const uniao = new Set([...tokensAlvo, ...tokensColuna]).size
      melhor = Math.max(melhor, 0.3 + 0.45 * (comuns / uniao))
    }
  }
  return Math.min(1, melhor)
}

// ---------------------------------------------------------------------------
// Sinal 2 — formato dos valores
// ---------------------------------------------------------------------------

export interface PerfilFormato {
  total: number
  prefixoId: string | null
  fracaoData: number
  fracaoMesAno: number
  fracaoBooleano: number
  fracaoNumero: number
  fracaoInteiro: number
}

export function perfilar(amostra: string[]): PerfilFormato {
  const valores = amostra.map((v) => (v ?? '').trim()).filter((v) => v !== '')
  const total = valores.length
  if (total === 0) {
    return {
      total: 0,
      prefixoId: null,
      fracaoData: 0,
      fracaoMesAno: 0,
      fracaoBooleano: 0,
      fracaoNumero: 0,
      fracaoInteiro: 0,
    }
  }

  let datas = 0
  let mesAno = 0
  let booleanos = 0
  let numeros = 0
  let inteiros = 0
  const prefixos = new Set<string>()
  let comPrefixo = 0

  for (const v of valores) {
    if (paraData(v)) datas++
    if (ehMesAno(v)) mesAno++
    if (ehBooleano(v)) booleanos++
    const n = paraNumero(v)
    if (n !== null) {
      numeros++
      if (Number.isInteger(n)) inteiros++
    }
    const id = RE_ID.exec(v)
    if (id && n === null) {
      prefixos.add(id[1].toUpperCase())
      comPrefixo++
    }
  }

  return {
    total,
    prefixoId: prefixos.size === 1 && comPrefixo / total > 0.9 ? [...prefixos][0] : null,
    fracaoData: datas / total,
    fracaoMesAno: mesAno / total,
    fracaoBooleano: booleanos / total,
    fracaoNumero: numeros / total,
    fracaoInteiro: inteiros / total,
  }
}

function fracaoNoDominio(amostra: string[], dominio: string[]): number {
  const aceitos = new Set(dominio.map(normalizar))
  const valores = amostra.map((v) => (v ?? '').trim()).filter((v) => v !== '')
  if (valores.length === 0) return 0
  return valores.filter((v) => aceitos.has(normalizar(v))).length / valores.length
}

function pontuarFormato(alvo: CampoAlvo, perfil: PerfilFormato, amostra: string[]): number {
  if (perfil.total === 0) return 0.5 // coluna vazia não confirma nem desmente

  switch (alvo.tipo) {
    case 'id': {
      if (alvo.prefixoId) {
        if (perfil.prefixoId === alvo.prefixoId) return 1
        if (perfil.prefixoId) return 0 // id de outra família derruba o palpite pelo nome
        if (perfil.fracaoData > 0.8 || perfil.fracaoBooleano > 0.8) return 0
        if (perfil.fracaoNumero > 0.9) return 0.3
        return 0.35
      }
      return perfil.prefixoId ? 0.6 : 0.35
    }
    case 'data': {
      if (alvo.campo === 'mes_ano') {
        if (perfil.fracaoMesAno > 0.9) return 1
        return perfil.fracaoData > 0.9 ? 0.35 : 0
      }
      if (perfil.fracaoData > 0.9) return 1
      return perfil.fracaoMesAno > 0.9 ? 0.35 : 0
    }
    case 'booleano':
      return perfil.fracaoBooleano > 0.9 ? 1 : 0
    case 'numero': {
      if (perfil.fracaoNumero < 0.9) return 0
      // 0/1 puro é quase sempre flag: não deixa uma medida numérica levar a coluna.
      if (perfil.fracaoBooleano > 0.9) return 0.45
      return 1
    }
    case 'texto': {
      if (alvo.dominio) {
        const dentro = fracaoNoDominio(amostra, alvo.dominio)
        return dentro > 0.9 ? 1 : dentro > 0.4 ? 0.5 : 0
      }
      if (perfil.prefixoId || perfil.fracaoData > 0.9 || perfil.fracaoBooleano > 0.9) return 0.15
      if (perfil.fracaoNumero > 0.9) return 0.25
      return 0.85
    }
  }
}

// ---------------------------------------------------------------------------
// Classificação da coluna
// ---------------------------------------------------------------------------

export const LIMIAR_ACEITE = 0.45

export function pontuarColuna(
  nomeColuna: string,
  amostra: string[],
): { campo: CampoAlvo; confianca: number }[] {
  const nomeNorm = normalizar(nomeColuna)
  const perfil = perfilar(amostra)

  return CAMPOS.map((alvo) => {
    const nome = pontuarNome(nomeNorm, alvo)
    const formato = pontuarFormato(alvo, perfil, amostra)

    let confianca: number
    if (nome === 0) {
      // Sem sinal de nome só o formato de assinatura forte (prefixo de id) sustenta.
      confianca = formato === 1 && alvo.prefixoId ? 0.5 : formato * 0.15
    } else {
      confianca = 0.55 * nome + 0.45 * formato
      if (formato === 0) confianca = Math.min(confianca, 0.22)
    }

    return { campo: alvo, confianca: Number(confianca.toFixed(3)) }
  })
    .filter((c) => c.confianca > 0.05)
    .sort((a, b) => b.confianca - a.confianca)
}

export function rotuloConfianca(c: number): 'alta' | 'média' | 'baixa' {
  return c >= 0.75 ? 'alta' : c >= 0.5 ? 'média' : 'baixa'
}

// ---------------------------------------------------------------------------
// Detecção da tabela
// ---------------------------------------------------------------------------

export function amostraDaColuna(
  linhas: Record<string, string>[],
  coluna: string,
  quantas = 30,
): string[] {
  const out: string[] = []
  for (const linha of linhas) {
    const v = (linha[coluna] ?? '').trim()
    if (v !== '') out.push(v)
    if (out.length >= quantas) break
  }
  return out
}

export interface Deteccao {
  tabela: string
  confianca: number
  mapeamento: Record<string, string | null>
}

/**
 * Casamento guloso por confiança: o par (coluna, campo) mais confiante fecha
 * primeiro, e nenhum campo recebe duas colunas. Coluna sem candidato acima do
 * limiar fica `null` — chute de coluna desconhecida é pior que pedir decisão.
 */
export function mapearParaTabela(
  colunas: string[],
  candidatosPorColuna: Record<string, { campo: CampoAlvo; confianca: number }[]>,
  tabela: string,
): { mapeamento: Record<string, string | null>; confiancas: Record<string, number>; score: number } {
  const pares: { coluna: string; campo: CampoAlvo; confianca: number }[] = []
  for (const coluna of colunas) {
    for (const c of candidatosPorColuna[coluna] ?? []) {
      if (c.campo.tabela === tabela && c.confianca >= LIMIAR_ACEITE) {
        pares.push({ coluna, campo: c.campo, confianca: c.confianca })
      }
    }
  }
  pares.sort((a, b) => b.confianca - a.confianca)

  const mapeamento: Record<string, string | null> = {}
  const confiancas: Record<string, number> = {}
  for (const coluna of colunas) mapeamento[coluna] = null

  const camposUsados = new Set<string>()
  for (const par of pares) {
    if (mapeamento[par.coluna] !== null) continue
    if (camposUsados.has(par.campo.id)) continue
    mapeamento[par.coluna] = par.campo.id
    confiancas[par.coluna] = par.confianca
    camposUsados.add(par.campo.id)
  }

  const obrigatorios = camposDaTabela(tabela).filter((c) => c.obrigatorio)
  const somaObrig = obrigatorios.reduce((soma, campoObrig) => {
    const coluna = colunas.find((c) => mapeamento[c] === campoObrig.id)
    return soma + (coluna ? confiancas[coluna] : 0)
  }, 0)
  const cobertura = obrigatorios.length === 0 ? 0 : somaObrig / obrigatorios.length
  const casadas = colunas.filter((c) => mapeamento[c] !== null).length
  const aproveitamento = colunas.length === 0 ? 0 : casadas / colunas.length

  return { mapeamento, confiancas, score: 0.75 * cobertura + 0.25 * aproveitamento }
}

function candidatosDeTodasAsColunas(colunas: string[], linhas: Record<string, string>[]) {
  const candidatos: Record<string, { campo: CampoAlvo; confianca: number }[]> = {}
  for (const coluna of colunas) {
    candidatos[coluna] = pontuarColuna(coluna, amostraDaColuna(linhas, coluna))
  }
  return candidatos
}

/** Mapeamento contra uma tabela escolhida à mão — o usuário pode discordar da detecção. */
export function mapearColunas(
  colunas: string[],
  linhas: Record<string, string>[],
  tabela: string,
): { mapeamento: Record<string, string | null>; confiancas: Record<string, number>; score: number } {
  return mapearParaTabela(colunas, candidatosDeTodasAsColunas(colunas, linhas), tabela)
}

export function detectarTabela(colunas: string[], linhas: Record<string, string>[]): Deteccao {
  const candidatos = candidatosDeTodasAsColunas(colunas, linhas)

  let melhor: Deteccao = { tabela: TABELAS[0].id, confianca: 0, mapeamento: {} }
  for (const t of TABELAS) {
    const r = mapearParaTabela(colunas, candidatos, t.id)
    if (r.score > melhor.confianca) {
      melhor = { tabela: t.id, confianca: Number(r.score.toFixed(3)), mapeamento: r.mapeamento }
    }
  }
  if (Object.keys(melhor.mapeamento).length === 0) {
    melhor.mapeamento = Object.fromEntries(colunas.map((c) => [c, null]))
  }
  return melhor
}

/** Confiança por coluna de um mapeamento já fechado — usado na tela de conferência. */
export function confiancaDoMapeamento(
  linhas: Record<string, string>[],
  mapeamento: Record<string, string | null>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [coluna, campoId] of Object.entries(mapeamento)) {
    if (!campoId) continue
    const achado = pontuarColuna(coluna, amostraDaColuna(linhas, coluna)).find(
      (c) => c.campo.id === campoId,
    )
    out[coluna] = achado?.confianca ?? 0
  }
  return out
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export interface Problema {
  linha: number
  coluna: string
  valor: string
  motivo: string
}

const REFERENCIAS: Record<'parceiros' | 'executivos' | 'gerentes', Set<string>> = {
  parceiros: new Set(dataset.parceiros.map((p) => p.id_parceiro)),
  executivos: new Set(dataset.executivos.map((e) => e.id_executivo)),
  gerentes: new Set(dataset.gerentes.map((g) => g.id_gerente)),
}

export function tabelaDoMapeamento(mapeamento: Record<string, string | null>): string | null {
  const contagem = new Map<string, number>()
  for (const campoId of Object.values(mapeamento)) {
    const alvo = campoId ? campoPorId(campoId) : null
    if (alvo) contagem.set(alvo.tabela, (contagem.get(alvo.tabela) ?? 0) + 1)
  }
  let melhor: string | null = null
  let maior = 0
  for (const [tabela, n] of contagem) {
    if (n > maior) {
      maior = n
      melhor = tabela
    }
  }
  return melhor
}

export function validar(
  linhas: Record<string, string>[],
  mapeamento: Record<string, string | null>,
): { validas: number; problemas: Problema[] } {
  const problemas: Problema[] = []
  const tabela = tabelaDoMapeamento(mapeamento)
  if (!tabela) {
    return {
      validas: 0,
      problemas: [
        { linha: 0, coluna: '—', valor: '', motivo: 'Nenhuma coluna foi ligada a um campo do modelo.' },
      ],
    }
  }

  const pares: { coluna: string; alvo: CampoAlvo }[] = []
  for (const [coluna, campoId] of Object.entries(mapeamento)) {
    const alvo = campoId ? campoPorId(campoId) : null
    if (alvo && alvo.tabela === tabela) pares.push({ coluna, alvo })
  }

  // Campo obrigatório que ninguém preencheu é problema do arquivo, não da linha.
  for (const obrigatorio of camposDaTabela(tabela).filter((c) => c.obrigatorio)) {
    if (!pares.some((p) => p.alvo.id === obrigatorio.id)) {
      problemas.push({
        linha: 0,
        coluna: '—',
        valor: '',
        motivo: `Campo obrigatório "${obrigatorio.campo}" não foi mapeado por nenhuma coluna.`,
      })
    }
  }

  const camposChave = pares.filter((p) => p.alvo.chave)
  const chavesVistas = new Map<string, number>()
  const linhasComProblema = new Set<number>()

  const anotar = (indice: number, coluna: string, valor: string, motivo: string) => {
    problemas.push({ linha: indice + 2, coluna, valor, motivo })
    linhasComProblema.add(indice)
  }

  linhas.forEach((linha, indice) => {
    for (const { coluna, alvo } of pares) {
      const valor = (linha[coluna] ?? '').trim()

      if (valor === '') {
        if (alvo.obrigatorio) anotar(indice, coluna, '', 'Campo obrigatório vazio.')
        continue
      }

      switch (alvo.tipo) {
        case 'data': {
          const ok = alvo.campo === 'mes_ano' ? ehMesAno(valor) : paraData(valor) !== null
          if (!ok) {
            anotar(
              indice,
              coluna,
              valor,
              alvo.campo === 'mes_ano'
                ? 'Mês fora do formato AAAA-MM.'
                : 'Data fora do formato AAAA-MM-DD (ou DD/MM/AAAA) ou inexistente no calendário.',
            )
            continue
          }
          break
        }
        case 'numero': {
          if (paraNumero(valor) === null) {
            anotar(indice, coluna, valor, 'Não é um número (aceita vírgula como decimal).')
            continue
          }
          break
        }
        case 'booleano': {
          if (!ehBooleano(valor)) {
            anotar(indice, coluna, valor, 'Não é sim/não (aceita 1/0, sim/nao, true/false).')
            continue
          }
          break
        }
        case 'id': {
          if (alvo.prefixoId) {
            const id = RE_ID.exec(valor)
            if (!id || id[1].toUpperCase() !== alvo.prefixoId) {
              anotar(indice, coluna, valor, `ID fora do padrão ${alvo.prefixoId} + número.`)
              continue
            }
          }
          if (alvo.referencia && !REFERENCIAS[alvo.referencia].has(valor.toUpperCase())) {
            anotar(indice, coluna, valor, `${alvo.campo} não existe no dataset atual.`)
            continue
          }
          break
        }
        case 'texto': {
          if (alvo.dominio) {
            const aceitos = new Set(alvo.dominio.map(normalizar))
            if (!aceitos.has(normalizar(valor))) {
              anotar(indice, coluna, valor, `Valor fora da lista: ${alvo.dominio.join(', ')}.`)
              continue
            }
          }
          break
        }
      }

      if (alvo.validar && !alvo.validar(valor)) {
        anotar(indice, coluna, valor, `Valor fora da faixa aceita para ${alvo.campo}.`)
      }
    }

    if (camposChave.length > 0) {
      const partes = camposChave.map(({ coluna }) => (linha[coluna] ?? '').trim().toUpperCase())
      if (partes.every((p) => p !== '')) {
        const chave = partes.join('|')
        const antes = chavesVistas.get(chave)
        if (antes !== undefined) {
          anotar(
            indice,
            camposChave[0].coluna,
            partes.join(' · '),
            `Chave repetida — já apareceu na linha ${antes + 2}.`,
          )
        } else {
          chavesVistas.set(chave, indice)
        }
      }
    }
  })

  return { validas: linhas.length - linhasComProblema.size, problemas }
}

// ---------------------------------------------------------------------------
// Modelo de exemplo
// ---------------------------------------------------------------------------

export function csvExemplo(tabela: string): string {
  const campos = camposDaTabela(tabela)
  if (campos.length === 0) return ''
  const cabecalho = campos.map((c) => c.campo).join(';')
  const linhas = [0, 1, 2].map((i) =>
    campos.map((c) => c.exemplo[i]).join(';'),
  )
  return [cabecalho, ...linhas].join('\r\n') + '\r\n'
}
