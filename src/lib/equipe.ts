import { dataset } from '@/data/seed'

export type Papel = 'gerente' | 'executivo' | 'analista'

export const ROTULO_PAPEL: Record<Papel, string> = {
  gerente: 'Gerente',
  executivo: 'Executivo',
  analista: 'Analista',
}

export const PAPEIS: Papel[] = ['gerente', 'executivo', 'analista']

export type Area = 'comercial' | 'operacoes' | 'financeiro' | 'qualidade' | 'dados'

export const ROTULO_AREA: Record<Area, string> = {
  comercial: 'Comercial',
  operacoes: 'Operações',
  financeiro: 'Financeiro',
  qualidade: 'Qualidade',
  dados: 'Dados',
}

export const AREAS: Area[] = ['comercial', 'operacoes', 'financeiro', 'qualidade', 'dados']

export type EstadoConvite = 'pendente' | 'aceito' | 'expirado'

export const ROTULO_CONVITE: Record<EstadoConvite, string> = {
  pendente: 'Convite pendente',
  aceito: 'Convite aceito',
  expirado: 'Convite expirado',
}

export interface Permissao {
  id: string
  rotulo: string
  descricao: string
  /** O que a pessoa vê na tela quando esta permissão é negada. */
  semAcesso: string
}

export const PERMISSOES: Permissao[] = [
  {
    id: 'ver_dashboard',
    rotulo: 'Ver dashboard',
    descricao: 'Abrir as abas e acompanhar os indicadores do recorte.',
    semAcesso: 'Sem ver_dashboard, o login abre em uma tela vazia: nenhuma aba carrega.',
  },
  {
    id: 'ver_financeiro',
    rotulo: 'Ver budget e receita',
    descricao: 'Enxergar os valores de budget e a receita dos parceiros.',
    semAcesso: 'Sem ver_financeiro, os campos de budget e receita aparecem como —.',
  },
  {
    id: 'editar_promo',
    rotulo: 'Criar e editar promoções',
    descricao: 'Montar e alterar promo smart, banner e special.',
    semAcesso: 'Sem editar_promo, as promoções ficam só de leitura: nada de criar nem alterar.',
  },
  {
    id: 'aprovar_budget',
    rotulo: 'Aprovar budget acima do previsto',
    descricao: 'Liberar gasto acima do budget needed do parceiro.',
    semAcesso: 'Sem aprovar_budget, o gasto acima do previsto fica esperando outra pessoa.',
  },
  {
    id: 'gerir_equipe',
    rotulo: 'Adicionar e remover membros',
    descricao: 'Mudar quem faz parte do time e o que cada um pode fazer.',
    semAcesso: 'Sem gerir_equipe, a aba Equipe abre sem os botões de convidar e editar.',
  },
  {
    id: 'exportar_dados',
    rotulo: 'Exportar relatórios',
    descricao: 'Baixar as tabelas do recorte em arquivo.',
    semAcesso: 'Sem exportar_dados, o botão de baixar a tabela some do recorte.',
  },
]

export const PERMISSOES_PADRAO: Record<Papel, string[]> = {
  gerente: PERMISSOES.map((p) => p.id),
  executivo: ['ver_dashboard', 'editar_promo'],
  analista: ['ver_dashboard', 'ver_financeiro', 'exportar_dados'],
}

export interface Membro {
  id: string
  nome: string
  email: string
  papel: Papel
  area: Area
  /** Cargo em texto livre — "Executiva de contas pleno", não um enum. */
  funcao: string
  /** null para quem não responde a um gerente. */
  id_gerente: string | null
  pracas: string[]
  permissoes: string[]
  ativo: boolean
  /** Só existe em quem entrou por convite; ausente = membro já efetivado. */
  convite?: { estado: EstadoConvite; enviado_em: string }
}

/** Dados que a gestora preenche no fluxo de convite. */
export interface EntradaConvite {
  nome: string
  email: string
  area: Area
  funcao: string
  papel: Papel
  id_gerente: string | null
  pracas: string[]
  permissoes: string[]
}

export interface Convite {
  id: string
  nome: string
  email: string
  area: Area
  funcao: string
  papel: Papel
  id_gerente: string | null
  pracas: string[]
  permissoes: string[]
  estado: EstadoConvite
  enviado_em: string
}

export function emailDe(nome: string): string {
  const partes = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return partes.length === 0 ? '' : `${partes.join('.')}@99app.com`
}

export const permissaoPorId = (id: string): Permissao | undefined =>
  PERMISSOES.find((p) => p.id === id)

export const rotuloPermissao = (id: string): string =>
  PERMISSOES.find((p) => p.id === id)?.rotulo ?? id

export const listarPermissoes = (ids: string[]): string =>
  ids.length === 0 ? 'Nenhuma permissão' : ids.map(rotuloPermissao).join(', ')

const ordenar = (valores: Iterable<string>) =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// ---------------------------------------------------------------------------
// Convite
// ---------------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function erroNome(nome: string): string | null {
  return nome.trim().length < 3 ? 'Escreva o nome de quem vai receber o convite.' : null
}

export function erroEmail(email: string, membros: Membro[] = []): string | null {
  const alvo = email.trim().toLowerCase()
  if (!EMAIL.test(alvo)) return 'E-mail inválido. Use o formato nome.sobrenome@99app.com.'
  const jaTem = membros.find((m) => m.email.trim().toLowerCase() === alvo)
  return jaTem ? `${jaTem.nome} já usa esse e-mail no time. Cada pessoa entra uma vez só.` : null
}

/** Primeira mensagem de erro do convite, ou `null` quando dá para enviar. */
export function validarConvite(entrada: EntradaConvite, membros: Membro[] = []): string | null {
  return (
    erroNome(entrada.nome) ??
    erroEmail(entrada.email, membros) ??
    (entrada.permissoes.length === 0
      ? 'Marque ao menos um acesso: um convite sem nada liberado não abre o painel.'
      : null)
  )
}

let sequenciaConvite = 0

export function criarConvite(entrada: EntradaConvite): Convite {
  sequenciaConvite += 1
  return {
    id: `CV${sequenciaConvite}-${Date.now().toString(36)}`,
    nome: entrada.nome.trim(),
    email: entrada.email.trim().toLowerCase(),
    area: entrada.area,
    funcao: entrada.funcao.trim(),
    papel: entrada.papel,
    id_gerente: entrada.papel === 'executivo' ? entrada.id_gerente : null,
    pracas: ordenar(entrada.pracas),
    permissoes: PERMISSOES.filter((p) => entrada.permissoes.includes(p.id)).map((p) => p.id),
    estado: 'pendente',
    enviado_em: new Date().toISOString(),
  }
}

/**
 * Separa a lista completa de `PERMISSOES` em concedidas e negadas. Devolve ids
 * — a tela precisa do rótulo e da descrição, que saem de `permissaoPorId`.
 */
export function resumoAcesso(permissoes: string[]): { pode: string[]; naoPode: string[] } {
  const marcadas = new Set(permissoes)
  return {
    pode: PERMISSOES.filter((p) => marcadas.has(p.id)).map((p) => p.id),
    naoPode: PERMISSOES.filter((p) => !marcadas.has(p.id)).map((p) => p.id),
  }
}

/** Convidado entra na tabela sem acesso: só vira membro ativo quando aceitar. */
export function membroDeConvite(convite: Convite): Membro {
  return {
    id: convite.id,
    nome: convite.nome,
    email: convite.email,
    papel: convite.papel,
    area: convite.area,
    funcao: convite.funcao,
    id_gerente: convite.id_gerente,
    pracas: convite.pracas,
    permissoes: convite.permissoes,
    ativo: convite.estado === 'aceito',
    convite: { estado: convite.estado, enviado_em: convite.enviado_em },
  }
}

/**
 * O seed não traz área nem cargo. A distribuição abaixo é fixa (e não aleatória)
 * para que o filtro por área mostre sempre o mesmo recorte entre sessões.
 */
const AREA_DO_EXECUTIVO: Area[] = [
  'comercial',
  'comercial',
  'operacoes',
  'comercial',
  'qualidade',
  'comercial',
  'dados',
  'comercial',
  'operacoes',
  'financeiro',
]

const FUNCAO_POR_AREA: Record<Area, string> = {
  comercial: 'Executivo de contas',
  operacoes: 'Analista de operações',
  financeiro: 'Analista financeiro',
  qualidade: 'Analista de qualidade',
  dados: 'Analista de dados',
}

export function equipeInicial(): Membro[] {
  const pracasPorExecutivo = new Map<string, string[]>()
  for (const p of dataset.parceiros) {
    const lista = pracasPorExecutivo.get(p.id_executivo) ?? []
    lista.push(p.praca)
    pracasPorExecutivo.set(p.id_executivo, lista)
  }

  const gerentes: Membro[] = dataset.gerentes.map((g) => {
    const pracas: string[] = []
    for (const e of dataset.executivos) {
      if (e.id_gerente !== g.id_gerente) continue
      pracas.push(...(pracasPorExecutivo.get(e.id_executivo) ?? []))
    }
    return {
      id: g.id_gerente,
      nome: g.nome,
      email: emailDe(g.nome),
      papel: 'gerente',
      area: 'comercial',
      funcao: `Gerente regional · ${g.regiao}`,
      id_gerente: null,
      pracas: ordenar(pracas),
      permissoes: [...PERMISSOES_PADRAO.gerente],
      ativo: true,
    }
  })

  const executivos: Membro[] = dataset.executivos.map((e, i) => {
    const area = AREA_DO_EXECUTIVO[i % AREA_DO_EXECUTIVO.length]
    return {
      id: e.id_executivo,
      nome: e.nome,
      email: emailDe(e.nome),
      papel: 'executivo',
      area,
      funcao: FUNCAO_POR_AREA[area],
      id_gerente: e.id_gerente,
      pracas: ordenar(pracasPorExecutivo.get(e.id_executivo) ?? []),
      permissoes: [...PERMISSOES_PADRAO.executivo],
      ativo: e.ativo,
    }
  })

  return [...gerentes, ...executivos]
}
