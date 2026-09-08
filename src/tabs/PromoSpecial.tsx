import { useMemo } from 'react'
import { Coluna, DataTable } from '@/components/DataTable'
import { Badge } from '@/components/ui'
import { tabelaSpecial, type LinhaSpecial, type Snapshot } from '@/lib/queries'

const CATEGORIA_LABEL = { pizza: 'Pizza', burger: 'Burger', combo: 'Combo' } as const

export function PromoSpecial({ atual }: { atual: Snapshot }) {
  const linhas = useMemo(() => tabelaSpecial(atual), [atual])
  const com = linhas.filter((l) => l.tem_special).length

  const colunas: Coluna<LinhaSpecial>[] = [
    { chave: 'parceiro', label: 'Parceiro', valor: (l) => l.parceiro, larguraMin: '200px' },
    {
      chave: 'categoria',
      label: 'Categoria',
      valor: (l) => l.categoria,
      render: (l) => <Badge tom="rosa">{CATEGORIA_LABEL[l.categoria]}</Badge>,
    },
    { chave: 'executivo', label: 'Executivo', valor: (l) => l.executivo, larguraMin: '160px' },
    {
      chave: 'tem',
      label: 'Tem promo special?',
      valor: (l) => l.tem_special,
      render: (l) =>
        l.tem_special ? <Badge tom="verde">Sim</Badge> : <Badge tom="cinza">Não</Badge>,
    },
    {
      chave: 'aderente',
      label: 'Aderente?',
      valor: (l) => (l.aderente === null ? -1 : l.aderente ? 1 : 0),
      render: (l) =>
        l.aderente === null ? (
          <Badge tom="cinza">Sem dado</Badge>
        ) : l.aderente ? (
          <Badge tom="verde">Aderente</Badge>
        ) : (
          <Badge tom="laranja">Não aderente</Badge>
        ),
    },
  ]

  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        {com} de {linhas.length} parceiros com promo special ativa no período.
      </p>
      <DataTable
        colunas={colunas}
        linhas={linhas}
        chaveDe={(l) => l.id_parceiro}
        ordemInicial={{ chave: 'tem', asc: true }}
        busca={{ placeholder: 'Buscar parceiro ou executivo', campos: (l) => `${l.parceiro} ${l.executivo}` }}
        vazio={{
          titulo: 'Nenhum parceiro no recorte',
          dica: 'Ajuste os filtros de gerente, executivo ou praça para ver a carteira.',
        }}
      />
    </div>
  )
}
