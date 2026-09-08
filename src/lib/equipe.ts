import { dataset } from '@/data/seed'

export type Papel = 'gerente' | 'executivo' | 'analista'

export const ROTULO_PAPEL: Record<Papel, string> = {
  gerente: 'Gerente',
  executivo: 'Executivo',
  analista: 'Analista',
}

export const PAPEIS: Papel[] = ['gerente', 'executivo', 'analista']

export interface Permissao {
  id: string
  rotulo: string
  descricao: string
}

export const PERMISSOES: Permissao[] = [
  {
    id: 'ver_dashboard',
    rotulo: 'Ver dashboard',
    descricao: 'Abrir as abas e acompanhar os indicadores do recorte.',
  },
  {
    id: 'ver_financeiro',
    rotulo: 'Ver budget e receita',
    descricao: 'Enxergar os valores de budget e a receita dos parceiros.',
  },
  {
    id: 'editar_promo',
    rotulo: 'Criar e editar promoções',
    descricao: 'Montar e alterar promo smart, banner e special.',
  },
  {
    id: 'aprovar_budget',
    rotulo: 'Aprovar budget acima do previsto',
    descricao: 'Liberar gasto acima do budget needed do parceiro.',
  },
  {
    id: 'gerir_equipe',
    rotulo: 'Adicionar e remover membros',
    descricao: 'Mudar quem faz parte do time e o que cada um pode fazer.',
  },
  {
    id: 'exportar_dados',
    rotulo: 'Exportar relatórios',
    descricao: 'Baixar as tabelas do recorte em arquivo.',
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
  /** null para quem não responde a um gerente. */
  id_gerente: string | null
  pracas: string[]
  permissoes: string[]
  ativo: boolean
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

export const rotuloPermissao = (id: string): string =>
  PERMISSOES.find((p) => p.id === id)?.rotulo ?? id

export const listarPermissoes = (ids: string[]): string =>
  ids.length === 0 ? 'Nenhuma permissão' : ids.map(rotuloPermissao).join(', ')

const ordenar = (valores: Iterable<string>) =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'pt-BR'))

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
      id_gerente: null,
      pracas: ordenar(pracas),
      permissoes: [...PERMISSOES_PADRAO.gerente],
      ativo: true,
    }
  })

  const executivos: Membro[] = dataset.executivos.map((e) => ({
    id: e.id_executivo,
    nome: e.nome,
    email: emailDe(e.nome),
    papel: 'executivo',
    id_gerente: e.id_gerente,
    pracas: ordenar(pracasPorExecutivo.get(e.id_executivo) ?? []),
    permissoes: [...PERMISSOES_PADRAO.executivo],
    ativo: e.ativo,
  }))

  return [...gerentes, ...executivos]
}
