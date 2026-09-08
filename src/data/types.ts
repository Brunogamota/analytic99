export type TipoPromo = 'smart' | 'banner' | 'special'
export type Categoria = 'pizza' | 'burger' | 'combo'

export interface DimGerente {
  id_gerente: string
  nome: string
  regiao: string
}

export interface DimExecutivo {
  id_executivo: string
  nome: string
  id_gerente: string
  ativo: boolean
}

export interface DimParceiro {
  id_parceiro: string
  nome: string
  categoria: Categoria
  abre_almoco: boolean
  cidade: string
  praca: string
  id_executivo: string
  ativo: boolean
}

/** Uma linha por parceiro x tipo_promo x mês. `data` é o primeiro dia do mês. */
export interface FatoPromo {
  id_parceiro: string
  id_executivo: string
  tipo_promo: TipoPromo
  budget_needed: number
  budget_real: number
  aderente: boolean
  dias_aderencia: number
  dias_periodo: number
  data: string
}

export interface FatoPedido {
  id_pedido: string
  id_parceiro: string
  data: string
  hora: number
  valor: number
  dia_semana: number
}

export interface FatoHoras {
  id_parceiro: string
  data: string
  horas_online: number
}

export interface HistBanner {
  id_parceiro: string
  mes_ano: string
  tem_banner: boolean
}

export type TipoReclamacao = 'atraso' | 'pedido_errado' | 'qualidade' | 'cancelamento'

/**
 * Tipagem fina da reclamação. `TipoReclamacao` continua sendo o vocabulário de
 * quatro famílias que as telas antigas agregam — ampliá-lo no lugar quebraria
 * os mapas exaustivos `Record<TipoReclamacao, …>` que já existem fora daqui e
 * faria os gráficos contarem menos linhas do que a base tem. O detalhe entra
 * como campo próprio: cada subtipo pertence a exatamente uma família (ver
 * `FAMILIA_RECLAMACAO` no seed), então os totais das duas leituras batem.
 */
export type SubtipoReclamacao =
  | 'atraso_entrega'
  | 'atraso_preparo'
  | 'pedido_incompleto'
  | 'pedido_trocado'
  | 'comida_fria'
  | 'comida_estragada'
  | 'embalagem_violada'
  | 'cobranca_indevida'
  | 'cancelado_pelo_parceiro'
  | 'cancelado_por_falta_de_entregador'
  | 'cancelado_pelo_cliente'

export type Gravidade = 'baixa' | 'media' | 'alta'

export interface FatoReclamacao {
  id_reclamacao: string
  id_parceiro: string
  data: string
  tipo: TipoReclamacao
  /** Detalhe do `tipo` — sempre dentro da mesma família. */
  subtipo: SubtipoReclamacao
  gravidade: Gravidade
}

// ---------------------------------------------------------------------------
// Operação de problemas: reembolso, estorno, cancelamento e chargeback
// ---------------------------------------------------------------------------

export type TipoOcorrencia = 'reembolso' | 'estorno' | 'cancelamento' | 'chargeback'

export type MotivoOcorrencia =
  | 'pedido_nao_entregue'
  | 'atraso_excessivo'
  | 'item_faltando'
  | 'item_errado'
  | 'qualidade_comida'
  | 'embalagem_danificada'
  | 'cobranca_duplicada'
  | 'fraude_suspeita'
  | 'endereco_incorreto'
  | 'restaurante_fechado'

/** Quem arcou com o prejuízo depois da apuração. */
export type Responsabilidade = 'parceiro' | 'entregador' | 'plataforma' | 'cliente' | 'indefinida'

export interface FatoOcorrencia {
  id_ocorrencia: string
  /** Sempre um pedido existente em `fato_pedidos`. */
  id_pedido: string
  id_parceiro: string
  data: string
  tipo: TipoOcorrencia
  motivo: MotivoOcorrencia
  responsabilidade: Responsabilidade
  /** Valor envolvido na ocorrência. Nunca maior que o valor do pedido. */
  valor: number
  /** Parte do `valor` já devolvida ao cliente. Nunca maior que `valor`. */
  valor_ressarcido: number
  /** O parceiro já teve duas ocorrências do mesmo motivo nos 30 dias anteriores. */
  reincidente: boolean
}

export interface Dataset {
  gerentes: DimGerente[]
  executivos: DimExecutivo[]
  parceiros: DimParceiro[]
  promos: FatoPromo[]
  pedidos: FatoPedido[]
  horas: FatoHoras[]
  banners: HistBanner[]
  reclamacoes: FatoReclamacao[]
  ocorrencias: FatoOcorrencia[]
  meses: string[]
  hoje: string
}
