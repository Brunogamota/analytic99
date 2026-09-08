import { useMemo } from 'react'
import { Coluna, DataTable } from '@/components/DataTable'
import { Badge } from '@/components/ui'
import { fmtMoeda, fmtPct } from '@/lib/format'
import { tabelaSmart, type LinhaSmart, type Snapshot } from '@/lib/queries'

export function PromoSmart({ atual }: { atual: Snapshot }) {
  const linhas = useMemo(() => tabelaSmart(atual), [atual])

  const colunas: Coluna<LinhaSmart>[] = [
    { chave: 'parceiro', label: 'Parceiro', valor: (l) => l.parceiro, larguraMin: '200px' },
    { chave: 'executivo', label: 'Executivo', valor: (l) => l.executivo, larguraMin: '160px' },
    {
      chave: 'needed',
      label: 'Budget needed',
      numerica: true,
      valor: (l) => l.budget_needed,
      render: (l) => fmtMoeda(l.budget_needed),
    },
    {
      chave: 'real',
      label: 'Budget real',
      numerica: true,
      valor: (l) => l.budget_real,
      render: (l) => {
        const razao = l.budget_needed === 0 ? 0 : l.budget_real / l.budget_needed
        return (
          <span className={razao > 1.5 ? 'font-medium text-[#C23A02]' : undefined}>
            {fmtMoeda(l.budget_real)}
          </span>
        )
      },
    },
    {
      chave: 'aderente',
      label: 'Aderente?',
      valor: (l) => l.aderente,
      render: (l) =>
        l.aderente ? <Badge tom="verde">Aderente</Badge> : <Badge tom="laranja">Não aderente</Badge>,
    },
    {
      chave: 'dias',
      label: 'Dias aderência',
      numerica: true,
      valor: (l) => l.dias_aderencia,
      render: (l) => `${l.dias_aderencia}/${l.dias_periodo}`,
    },
    {
      chave: 'pct',
      label: '% aderência',
      numerica: true,
      valor: (l) => l.pct_aderencia,
      render: (l) => fmtPct(l.pct_aderencia),
    },
  ]

  const aderentes = linhas.filter((l) => l.aderente).length

  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        {linhas.length} parceiros com promo smart no período · {aderentes} aderentes.
      </p>
      <DataTable
        colunas={colunas}
        linhas={linhas}
        chaveDe={(l) => l.id_parceiro}
        ordemInicial={{ chave: 'pct', asc: true }}
        busca={{ placeholder: 'Buscar parceiro ou executivo', campos: (l) => `${l.parceiro} ${l.executivo}` }}
        vazio={{
          titulo: 'Nenhuma promo smart no recorte',
          dica: 'Nenhum parceiro dos filtros aplicados tinha promo smart no período selecionado.',
        }}
      />
    </div>
  )
}
