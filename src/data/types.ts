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

export interface Dataset {
  gerentes: DimGerente[]
  executivos: DimExecutivo[]
  parceiros: DimParceiro[]
  promos: FatoPromo[]
  pedidos: FatoPedido[]
  horas: FatoHoras[]
  banners: HistBanner[]
  meses: string[]
  hoje: string
}
