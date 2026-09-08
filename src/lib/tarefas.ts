import { dataset, HOJE } from '@/data/seed'

/**
 * Modelo das tarefas que a gestora distribui para o time comercial. É um seed
 * determinístico: os parceiros e os responsáveis saem do `dataset`, e o status
 * é derivado da data de referência do produto — tarefa não concluída que já
 * passou do fim aparece como atrasada, sem ninguém precisar marcar.
 */

export type StatusTarefa = {
  id: string
  nome: string
  cor: string
}

export const STATUS: Record<'planejada' | 'andamento' | 'concluida' | 'atrasada', StatusTarefa> = {
  planejada: { id: 'planejada', nome: 'Planejada', cor: 'rgb(var(--muted))' },
  andamento: { id: 'andamento', nome: 'Em andamento', cor: 'rgb(var(--rosa-claro))' },
  concluida: { id: 'concluida', nome: 'Concluída', cor: 'rgb(var(--ink))' },
  atrasada: { id: 'atrasada', nome: 'Atrasada', cor: 'rgb(var(--rosa))' },
}

export type Prioridade = 'urgente' | 'alta' | 'normal' | 'baixa'

export interface NivelPrioridade {
  id: Prioridade
  nome: string
  cor: string
}

/**
 * Quatro níveis na paleta da marca: o que pede ação sai em rosa, o resto fica
 * em preto ou cinza. A ordem do objeto é a ordem que o menu mostra.
 */
export const PRIORIDADES: Record<Prioridade, NivelPrioridade> = {
  urgente: { id: 'urgente', nome: 'Urgente', cor: 'rgb(var(--rosa))' },
  alta: { id: 'alta', nome: 'Alta', cor: 'rgb(var(--rosa-claro))' },
  normal: { id: 'normal', nome: 'Normal', cor: 'rgb(var(--ink))' },
  baixa: { id: 'baixa', nome: 'Baixa', cor: 'rgb(var(--muted))' },
}

export const LISTA_PRIORIDADES: NivelPrioridade[] = Object.values(PRIORIDADES)

export interface Tarefa {
  id: string
  nome: string
  inicio: Date
  fim: Date
  status: StatusTarefa
  responsavel: string
  grupo: string
  prioridade: Prioridade
  descricao: string
}

export const FRENTES = [
  'Ativação de parceiro',
  'Correção de cadastro',
  'Negociação de budget',
  'Plano de qualidade',
] as const

export type Frente = (typeof FRENTES)[number]

/** Data local a partir de `AAAA-MM-DD` — `new Date(iso)` viria em UTC. */
export function dia(iso: string): Date {
  const [ano, mes, d] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, d)
}

export const HOJE_DATA = dia(HOJE)

const porParceiro = new Map(dataset.parceiros.map((p) => [p.id_parceiro, p]))
const porExecutivo = new Map(dataset.executivos.map((e) => [e.id_executivo, e]))

type Marca = 'planejada' | 'andamento' | 'concluida'

interface Rascunho {
  parceiro: string
  grupo: Frente
  titulo: (nome: string) => string
  inicio: string
  fim: string
  marca: Marca
}

const RASCUNHOS: Rascunho[] = [
  // Ativação de parceiro — os que zeraram horas ou perderam banner.
  {
    parceiro: 'P07',
    grupo: 'Ativação de parceiro',
    titulo: (n) => `Reativar ${n}`,
    inicio: '2026-08-24',
    fim: '2026-09-19',
    marca: 'andamento',
  },
  {
    parceiro: 'P23',
    grupo: 'Ativação de parceiro',
    titulo: (n) => `Reativar ${n}`,
    inicio: '2026-08-10',
    fim: '2026-09-04',
    marca: 'andamento',
  },
  {
    parceiro: 'P41',
    grupo: 'Ativação de parceiro',
    titulo: (n) => `Visita de ativação — ${n}`,
    inicio: '2026-09-14',
    fim: '2026-10-02',
    marca: 'planejada',
  },
  {
    parceiro: 'P03',
    grupo: 'Ativação de parceiro',
    titulo: (n) => `Recuperar banner de ${n}`,
    inicio: '2026-07-06',
    fim: '2026-07-31',
    marca: 'concluida',
  },
  {
    parceiro: 'P20',
    grupo: 'Ativação de parceiro',
    titulo: (n) => `Visita de ativação — ${n}`,
    inicio: '2026-10-05',
    fim: '2026-10-23',
    marca: 'planejada',
  },

  // Correção de cadastro — pizzaria sem almoço, horário e cardápio errados.
  {
    parceiro: 'P13',
    grupo: 'Correção de cadastro',
    titulo: (n) => `Corrigir cadastro de almoço — ${n}`,
    inicio: '2026-07-20',
    fim: '2026-08-14',
    marca: 'concluida',
  },
  {
    parceiro: 'P34',
    grupo: 'Correção de cadastro',
    titulo: (n) => `Corrigir cadastro de almoço — ${n}`,
    inicio: '2026-08-17',
    fim: '2026-09-02',
    marca: 'andamento',
  },
  {
    parceiro: 'P11',
    grupo: 'Correção de cadastro',
    titulo: (n) => `Revisar horário de funcionamento — ${n}`,
    inicio: '2026-09-01',
    fim: '2026-09-25',
    marca: 'andamento',
  },
  {
    parceiro: 'P22',
    grupo: 'Correção de cadastro',
    titulo: (n) => `Refazer ficha de cardápio — ${n}`,
    inicio: '2026-10-12',
    fim: '2026-10-30',
    marca: 'planejada',
  },

  // Negociação de budget — estouro de budget e aderência travada.
  {
    parceiro: 'P05',
    grupo: 'Negociação de budget',
    titulo: (n) => `Renegociar budget de promo — ${n}`,
    inicio: '2026-08-03',
    fim: '2026-09-11',
    marca: 'andamento',
  },
  {
    parceiro: 'P28',
    grupo: 'Negociação de budget',
    titulo: (n) => `Renegociar budget de promo — ${n}`,
    inicio: '2026-07-13',
    fim: '2026-08-07',
    marca: 'concluida',
  },
  {
    parceiro: 'P44',
    grupo: 'Negociação de budget',
    titulo: (n) => `Revisar teto de budget — ${n}`,
    inicio: '2026-09-07',
    fim: '2026-10-09',
    marca: 'andamento',
  },
  {
    parceiro: 'P16',
    grupo: 'Negociação de budget',
    titulo: (n) => `Destravar aderência de promo — ${n}`,
    inicio: '2026-08-24',
    fim: '2026-09-04',
    marca: 'planejada',
  },
  {
    parceiro: 'P31',
    grupo: 'Negociação de budget',
    titulo: (n) => `Destravar aderência de promo — ${n}`,
    inicio: '2026-09-21',
    fim: '2026-10-16',
    marca: 'planejada',
  },

  // Plano de qualidade — reclamações subindo no mês atual.
  {
    parceiro: 'P09',
    grupo: 'Plano de qualidade',
    titulo: (n) => `Plano de qualidade — ${n}`,
    inicio: '2026-08-31',
    fim: '2026-10-02',
    marca: 'andamento',
  },
  {
    parceiro: 'P26',
    grupo: 'Plano de qualidade',
    titulo: (n) => `Follow-up de reclamações — ${n}`,
    inicio: '2026-07-27',
    fim: '2026-08-21',
    marca: 'concluida',
  },
  {
    parceiro: 'P48',
    grupo: 'Plano de qualidade',
    titulo: (n) => `Plano de qualidade — ${n}`,
    inicio: '2026-09-28',
    fim: '2026-11-06',
    marca: 'planejada',
  },
  {
    parceiro: 'P37',
    grupo: 'Plano de qualidade',
    titulo: (n) => `Auditoria de banner — ${n}`,
    inicio: '2026-10-19',
    fim: '2026-11-13',
    marca: 'planejada',
  },
]

function statusDe(fim: Date, marca: Marca): StatusTarefa {
  if (marca === 'concluida') return STATUS.concluida
  if (fim < HOJE_DATA) return STATUS.atrasada
  return marca === 'andamento' ? STATUS.andamento : STATUS.planejada
}

export function tarefasIniciais(): Tarefa[] {
  return RASCUNHOS.map((rascunho, indice) => {
    const parceiro = porParceiro.get(rascunho.parceiro)
    if (!parceiro) throw new Error(`Tarefa aponta para parceiro inexistente: ${rascunho.parceiro}`)
    const executivo = porExecutivo.get(parceiro.id_executivo)
    if (!executivo) throw new Error(`Parceiro ${parceiro.id_parceiro} sem executivo no dataset.`)

    const fim = dia(rascunho.fim)
    return {
      id: `T${String(indice + 1).padStart(2, '0')}`,
      nome: rascunho.titulo(parceiro.nome),
      inicio: dia(rascunho.inicio),
      fim,
      status: statusDe(fim, rascunho.marca),
      responsavel: executivo.nome,
      grupo: rascunho.grupo,
      prioridade: 'normal',
      descricao: '',
    }
  })
}

/** Soma dias preservando o horário local — `setDate` já normaliza o mês. */
function somaDias(data: Date, dias: number): Date {
  const d = new Date(data)
  d.setDate(d.getDate() + dias)
  return d
}

export const PRAZO_PADRAO_DIAS = 7

export interface EntradaTarefa {
  nome: string
  responsavel?: string
  grupo?: string
  status?: StatusTarefa
  prioridade?: Prioridade
  inicio?: Date | null
  fim?: Date | null
  descricao?: string
}

/**
 * Erro de preenchimento em uma frase, ou `null` quando dá para criar. A tarefa
 * nasce só com o nome: tudo o mais é opcional.
 */
export function validarTarefa(entrada: EntradaTarefa): string | null {
  if (!entrada.nome.trim()) return 'Dê um nome à tarefa para poder criá-la.'
  if (entrada.inicio && entrada.fim && entrada.fim < entrada.inicio) {
    return 'O fim do prazo não pode ser antes do início.'
  }
  return null
}

/** Sufixo crescente: duas tarefas criadas no mesmo milissegundo não colidem. */
let sequencia = 0

export function novaTarefa(entrada: EntradaTarefa): Tarefa {
  const inicio = entrada.inicio ?? HOJE_DATA
  const fim = entrada.fim ?? somaDias(inicio, PRAZO_PADRAO_DIAS)

  // Status só é derivado quando ninguém escolheu: prazo já vencido nasce
  // atrasado, como acontece com as tarefas do plano inicial.
  const status = entrada.status ?? (fim < HOJE_DATA ? STATUS.atrasada : STATUS.planejada)

  sequencia += 1
  return {
    id: `T-${Date.now().toString(36)}-${sequencia}`,
    nome: entrada.nome.trim(),
    inicio,
    fim,
    status,
    responsavel: entrada.responsavel?.trim() ?? '',
    grupo: entrada.grupo ?? FRENTES[0],
    prioridade: entrada.prioridade ?? 'normal',
    descricao: entrada.descricao?.trim() ?? '',
  }
}

export interface Marcador {
  id: string
  rotulo: string
  data: Date
}

export const MARCADORES: Marcador[] = [
  { id: 'M1', rotulo: 'Fechamento de agosto', data: dia('2026-08-31') },
  { id: 'M2', rotulo: 'Fechamento de setembro', data: dia('2026-09-30') },
  { id: 'M3', rotulo: 'Revisão de budget do trimestre', data: dia('2026-10-15') },
  { id: 'M4', rotulo: 'Prévia da campanha de fim de ano', data: dia('2026-11-13') },
]
