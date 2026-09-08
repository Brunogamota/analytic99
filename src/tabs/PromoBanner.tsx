import { useMemo } from 'react'
import { Coluna, DataTable } from '@/components/DataTable'
import { Badge, type Tom } from '@/components/ui'
import { statusBanner, type LinhaBanner, type Snapshot, type StatusBanner as Status } from '@/lib/queries'

const TOM: Record<Status, Tom> = {
  Manteve: 'verde',
  Perdeu: 'vermelho',
  Ganhou: 'azul',
  'Nunca teve': 'cinza',
}

/** Quem perdeu banner vem primeiro — é a linha que exige ação. */
const PRIORIDADE: Record<Status, number> = {
  Perdeu: 0,
  'Nunca teve': 1,
  Ganhou: 2,
  Manteve: 3,
}

const Sim = ({ v }: { v: boolean }) =>
  v ? <Badge tom="verde">Sim</Badge> : <Badge tom="cinza">Não</Badge>

export function PromoBanner({ atual }: { atual: Snapshot }) {
  const linhas = useMemo(() => statusBanner(atual), [atual])
  const perdeu = linhas.filter((l) => l.status === 'Perdeu').length

  const colunas: Coluna<LinhaBanner>[] = [
    { chave: 'parceiro', label: 'Parceiro', valor: (l) => l.parceiro, larguraMin: '200px' },
    { chave: 'executivo', label: 'Executivo', valor: (l) => l.executivo, larguraMin: '160px' },
    {
      chave: 'agora',
      label: 'Tem banner este mês?',
      valor: (l) => l.tem_agora,
      render: (l) => <Sim v={l.tem_agora} />,
    },
    {
      chave: 'antes',
      label: 'Tinha mês passado?',
      valor: (l) => l.tinha_antes,
      render: (l) => <Sim v={l.tinha_antes} />,
    },
    {
      chave: 'status',
      label: 'Status',
      valor: (l) => PRIORIDADE[l.status],
      render: (l) => <Badge tom={TOM[l.status]}>{l.status}</Badge>,
    },
  ]

  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        {perdeu > 0
          ? `${perdeu} ${perdeu === 1 ? 'parceiro perdeu' : 'parceiros perderam'} o banner em relação ao mês anterior.`
          : 'Nenhum parceiro perdeu banner em relação ao mês anterior.'}
      </p>
      <DataTable
        colunas={colunas}
        linhas={linhas}
        chaveDe={(l) => l.id_parceiro}
        ordemInicial={{ chave: 'status', asc: true }}
        busca={{ placeholder: 'Buscar parceiro ou executivo', campos: (l) => `${l.parceiro} ${l.executivo}` }}
        vazio={{
          titulo: 'Nenhum parceiro no recorte',
          dica: 'Os filtros aplicados não deixaram nenhum parceiro para comparar mês a mês.',
        }}
      />
    </div>
  )
}
