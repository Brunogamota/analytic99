import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Coluna, DataTable } from '@/components/DataTable'
import { Badge, BotaoSecundario, SecaoTitulo, Vazio } from '@/components/ui'
import { cn, fmtDec, fmtInt, fmtMoeda, fmtPct } from '@/lib/format'
import { rotuloPeriodo, ultimoDia, type Periodo } from '@/lib/periodo'
import { type Snapshot } from '@/lib/queries'
import {
  DIMENSOES,
  ROTULO_DIMENSAO,
  conversao as calcularConversao,
  detalhePorParceiro,
  paraCsv,
  resumoPorDimensao,
  rotuloCategoria,
  type ColunaCsv,
  type Dimensao,
  type LinhaParceiro,
  type LinhaResumo,
} from '@/lib/relatorio'

function Variacao({ v }: { v: number | null }) {
  if (v === null) return <span className="text-muted">—</span>
  return (
    <span className={cn(v < 0 && 'text-laranja-escuro')}>
      {v >= 0 ? '+' : '−'}
      {fmtPct(Math.abs(v))}
    </span>
  )
}

const textoVariacao = (v: number | null) => (v === null ? null : v * 100)

function sufixoPeriodo(p: Periodo): string {
  const mes = p.inicio.slice(0, 7)
  const mesInteiro = p.inicio.endsWith('-01') && p.fim === ultimoDia(mes)
  return mesInteiro ? mes : `${p.inicio}_a_${p.fim}`
}

function baixarCsv(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function Relatorios({
  atual,
  anterior,
  comparacao,
}: {
  atual: Snapshot
  anterior: Snapshot
  comparacao: string
}) {
  const [dimensao, setDimensao] = useState<Dimensao>('praca')

  const resumo = useMemo(
    () => resumoPorDimensao(atual, anterior, dimensao),
    [atual, anterior, dimensao],
  )
  const detalhe = useMemo(() => detalhePorParceiro(atual, anterior), [atual, anterior])

  const totais = useMemo(() => {
    let receita = 0
    for (const v of atual.receitaPorParceiro.values()) receita += v
    let dias = 0
    let periodo = 0
    for (const p of atual.promos) {
      dias += p.dias_aderencia
      periodo += p.dias_periodo
    }
    return {
      parceiros: atual.parceiros.length,
      pedidos: atual.totalPedidos,
      receita,
      horas: atual.totalHoras,
      conversao: calcularConversao(atual.totalPedidos, atual.totalHoras),
      aderencia: periodo === 0 ? 0 : dias / periodo,
    }
  }, [atual])

  const cartoes = [
    { chave: 'parceiros', label: 'Parceiros no recorte', valor: fmtInt(totais.parceiros) },
    { chave: 'pedidos', label: 'Pedidos', valor: fmtInt(totais.pedidos) },
    { chave: 'receita', label: 'Receita', valor: fmtMoeda(totais.receita) },
    { chave: 'horas', label: 'Horas online', valor: fmtDec(totais.horas, 1) },
    { chave: 'conversao', label: 'Conversão média', valor: fmtDec(totais.conversao, 2) },
    { chave: 'aderencia', label: '% aderência', valor: fmtPct(totais.aderencia) },
  ]

  const colunasResumo: Coluna<LinhaResumo>[] = [
    {
      chave: 'rotulo',
      label: ROTULO_DIMENSAO[dimensao],
      valor: (l) => l.rotulo,
      larguraMin: '180px',
    },
    { chave: 'parceiros', label: 'Parceiros', numerica: true, valor: (l) => l.parceiros },
    {
      chave: 'ativos',
      label: 'Ativos',
      numerica: true,
      valor: (l) => l.ativos,
      render: (l) => (
        <span className={cn(l.ativos < l.parceiros && 'font-medium text-laranja-escuro')}>
          {fmtInt(l.ativos)}
        </span>
      ),
    },
    {
      chave: 'pedidos',
      label: 'Pedidos',
      numerica: true,
      valor: (l) => l.pedidos,
      render: (l) => fmtInt(l.pedidos),
    },
    {
      chave: 'receita',
      label: 'Receita',
      numerica: true,
      valor: (l) => l.receita,
      render: (l) => fmtMoeda(l.receita),
    },
    {
      chave: 'var_receita',
      label: 'Δ receita',
      numerica: true,
      valor: (l) => l.var_receita,
      render: (l) => <Variacao v={l.var_receita} />,
    },
    {
      chave: 'horas',
      label: 'Horas online',
      numerica: true,
      valor: (l) => l.horas,
      render: (l) => fmtDec(l.horas, 1),
    },
    {
      chave: 'conversao',
      label: 'Conversão',
      numerica: true,
      valor: (l) => l.conversao,
      render: (l) => fmtDec(l.conversao, 2),
    },
    {
      chave: 'var_conversao',
      label: 'Δ conversão',
      numerica: true,
      valor: (l) => l.var_conversao,
      render: (l) => <Variacao v={l.var_conversao} />,
    },
    {
      chave: 'aderencia',
      label: '% aderência',
      numerica: true,
      valor: (l) => l.pct_aderencia,
      render: (l) => fmtPct(l.pct_aderencia),
    },
    {
      chave: 'needed',
      label: 'Budget necessário',
      numerica: true,
      valor: (l) => l.budget_needed,
      render: (l) => fmtMoeda(l.budget_needed),
    },
    {
      chave: 'real',
      label: 'Budget real',
      numerica: true,
      valor: (l) => l.budget_real,
      render: (l) => fmtMoeda(l.budget_real),
    },
    {
      chave: 'razao',
      label: 'Budget vs. necessário',
      numerica: true,
      valor: (l) => l.razao_budget,
      render: (l) => (
        <span className={cn(l.razao_budget > 1.1 && 'font-medium text-laranja-escuro')}>
          {fmtPct(l.razao_budget)}
        </span>
      ),
    },
  ]

  const colunasDetalhe: Coluna<LinhaParceiro>[] = [
    { chave: 'parceiro', label: 'Parceiro', valor: (l) => l.parceiro, larguraMin: '200px' },
    {
      chave: 'categoria',
      label: 'Categoria',
      valor: (l) => rotuloCategoria(l.categoria),
    },
    { chave: 'praca', label: 'Praça', valor: (l) => l.praca, larguraMin: '150px' },
    { chave: 'executivo', label: 'Executivo', valor: (l) => l.executivo, larguraMin: '160px' },
    { chave: 'gerente', label: 'Gerente', valor: (l) => l.gerente, larguraMin: '150px' },
    {
      chave: 'dias_ativos',
      label: 'Dias ativos',
      numerica: true,
      valor: (l) => l.dias_ativos,
      render: (l) => (
        <span className={cn(l.dias_ativos === 0 && 'font-medium text-laranja-escuro')}>
          {fmtInt(l.dias_ativos)}
        </span>
      ),
    },
    {
      chave: 'horas',
      label: 'Horas online',
      numerica: true,
      valor: (l) => l.horas,
      render: (l) => fmtDec(l.horas, 1),
    },
    {
      chave: 'pedidos',
      label: 'Pedidos',
      numerica: true,
      valor: (l) => l.pedidos,
      render: (l) => fmtInt(l.pedidos),
    },
    {
      chave: 'receita',
      label: 'Receita',
      numerica: true,
      valor: (l) => l.receita,
      render: (l) => fmtMoeda(l.receita),
    },
    {
      chave: 'ticket',
      label: 'Ticket médio',
      numerica: true,
      valor: (l) => l.ticket_medio,
      render: (l) => fmtMoeda(l.ticket_medio),
    },
    {
      chave: 'conversao',
      label: 'Conversão',
      numerica: true,
      valor: (l) => l.conversao,
      render: (l) => fmtDec(l.conversao, 2),
    },
    {
      chave: 'conversao_anterior',
      label: `Conversão ${comparacao}`,
      numerica: true,
      valor: (l) => l.conversao_anterior,
      render: (l) => fmtDec(l.conversao_anterior, 2),
    },
    {
      chave: 'var_conversao',
      label: 'Δ conversão',
      numerica: true,
      valor: (l) => l.var_conversao,
      render: (l) => <Variacao v={l.var_conversao} />,
    },
    {
      chave: 'aderencia',
      label: '% aderência',
      numerica: true,
      valor: (l) => l.pct_aderencia,
      render: (l) => fmtPct(l.pct_aderencia),
    },
    {
      chave: 'needed',
      label: 'Budget necessário',
      numerica: true,
      valor: (l) => l.budget_needed,
      render: (l) => fmtMoeda(l.budget_needed),
    },
    {
      chave: 'real',
      label: 'Budget real',
      numerica: true,
      valor: (l) => l.budget_real,
      render: (l) => fmtMoeda(l.budget_real),
    },
    {
      chave: 'promos',
      label: 'Promos ativas',
      valor: (l) => l.promos,
      larguraMin: '160px',
      render: (l) =>
        l.promos === '' ? <span className="text-muted">Sem promo</span> : l.promos,
    },
    {
      chave: 'banner',
      label: 'Banner',
      valor: (l) => l.banner,
      render: (l) => (
        <Badge
          tom={
            l.banner === 'Perdeu'
              ? 'laranja'
              : l.banner === 'Manteve'
                ? 'verde'
                : l.banner === 'Ganhou'
                  ? 'amarelo'
                  : 'cinza'
          }
        >
          {l.banner}
        </Badge>
      ),
    },
  ]

  const csvResumo: ColunaCsv<LinhaResumo>[] = [
    { titulo: ROTULO_DIMENSAO[dimensao], valor: (l) => l.rotulo },
    { titulo: 'Parceiros', valor: (l) => l.parceiros },
    { titulo: 'Parceiros ativos', valor: (l) => l.ativos },
    { titulo: 'Pedidos', valor: (l) => l.pedidos },
    { titulo: 'Receita', valor: (l) => l.receita },
    { titulo: 'Variação de receita (%)', valor: (l) => textoVariacao(l.var_receita) },
    { titulo: 'Horas online', valor: (l) => l.horas },
    { titulo: 'Conversão (pedidos/hora)', valor: (l) => l.conversao },
    { titulo: 'Conversão anterior', valor: (l) => l.conversao_anterior },
    { titulo: 'Variação de conversão (%)', valor: (l) => textoVariacao(l.var_conversao) },
    { titulo: 'Aderência (%)', valor: (l) => l.pct_aderencia * 100 },
    { titulo: 'Budget necessário', valor: (l) => l.budget_needed },
    { titulo: 'Budget real', valor: (l) => l.budget_real },
    { titulo: 'Budget vs. necessário (%)', valor: (l) => l.razao_budget * 100 },
  ]

  const csvDetalhe: ColunaCsv<LinhaParceiro>[] = [
    { titulo: 'Parceiro', valor: (l) => l.parceiro },
    { titulo: 'Categoria', valor: (l) => rotuloCategoria(l.categoria) },
    { titulo: 'Praça', valor: (l) => l.praca },
    { titulo: 'Executivo', valor: (l) => l.executivo },
    { titulo: 'Gerente', valor: (l) => l.gerente },
    { titulo: 'Dias ativos', valor: (l) => l.dias_ativos },
    { titulo: 'Horas online', valor: (l) => l.horas },
    { titulo: 'Pedidos', valor: (l) => l.pedidos },
    { titulo: 'Receita', valor: (l) => l.receita },
    { titulo: 'Ticket médio', valor: (l) => l.ticket_medio },
    { titulo: 'Conversão (pedidos/hora)', valor: (l) => l.conversao },
    { titulo: 'Conversão anterior', valor: (l) => l.conversao_anterior },
    { titulo: 'Variação de conversão (%)', valor: (l) => textoVariacao(l.var_conversao) },
    { titulo: 'Aderência (%)', valor: (l) => l.pct_aderencia * 100 },
    { titulo: 'Budget necessário', valor: (l) => l.budget_needed },
    { titulo: 'Budget real', valor: (l) => l.budget_real },
    { titulo: 'Promos ativas', valor: (l) => l.promos },
    { titulo: 'Banner', valor: (l) => l.banner },
  ]

  const sufixo = sufixoPeriodo(atual.periodo)

  return (
    <div className="space-y-8">
      <p className="text-[13px] text-muted">
        {rotuloPeriodo(atual.periodo)} · {fmtInt(totais.parceiros)}{' '}
        {totais.parceiros === 1 ? 'parceiro' : 'parceiros'} no recorte ·{' '}
        {fmtInt(totais.pedidos)} pedidos · comparado com {comparacao}.
      </p>

      <section>
        {totais.parceiros === 0 ? (
          <div className="card">
            <Vazio
              titulo="Nenhum parceiro no recorte"
              dica="Amplie o período ou remova filtros de gerente, executivo e praça para ver os consolidados."
            />
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-3">
            {cartoes.map((c) => (
              <div key={c.chave} className="card px-5 py-4">
                <p className="text-[12px] text-muted">{c.label}</p>
                <p className="mt-1.5 whitespace-nowrap text-[22px] font-bold leading-8 tracking-[-0.01em] tabular-nums text-ink">
                  {c.valor}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SecaoTitulo
          titulo="Resumo por quebra"
          descricao="A quebra troca a leitura da mesma base — colunas e comparação continuam as mesmas."
          acao={
            <BotaoSecundario
              onClick={() =>
                baixarCsv(`relatorio-${dimensao}-${sufixo}.csv`, paraCsv(resumo, csvResumo))
              }
            >
              <Download className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
              Exportar CSV
            </BotaoSecundario>
          }
        />

        <div className="mb-3 flex items-center gap-1.5">
          {DIMENSOES.map((d) => (
            <button
              key={d.chave}
              type="button"
              aria-pressed={dimensao === d.chave}
              onClick={() => setDimensao(d.chave)}
              className={cn(
                'chip',
                dimensao === d.chave && 'border-ink bg-hairline font-medium',
              )}
            >
              {d.rotulo}
            </button>
          ))}
        </div>

        <DataTable
          colunas={colunasResumo}
          linhas={resumo}
          chaveDe={(l) => l.chave}
          ordemInicial={{ chave: 'receita', asc: false }}
          vazio={{
            titulo: `Nenhuma quebra por ${ROTULO_DIMENSAO[dimensao].toLowerCase()} no recorte`,
            dica: 'Os filtros combinados não deixaram nenhum parceiro para agrupar.',
          }}
        />
      </section>

      <section>
        <SecaoTitulo
          titulo="Detalhe por parceiro"
          descricao="Uma linha por parceiro, com o número que sustenta cada agregado acima."
          acao={
            <BotaoSecundario
              onClick={() =>
                baixarCsv(`relatorio-parceiros-${sufixo}.csv`, paraCsv(detalhe, csvDetalhe))
              }
            >
              <Download className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
              Exportar CSV
            </BotaoSecundario>
          }
        />
        <DataTable
          colunas={colunasDetalhe}
          linhas={detalhe}
          chaveDe={(l) => l.id_parceiro}
          ordemInicial={{ chave: 'receita', asc: false }}
          busca={{
            placeholder: 'Buscar parceiro, praça, executivo ou gerente',
            campos: (l) => `${l.parceiro} ${l.praca} ${l.executivo} ${l.gerente}`,
          }}
          vazio={{
            titulo: 'Nenhum parceiro no recorte',
            dica: 'Os filtros de gerente, executivo e praça combinados não deixaram nenhum parceiro.',
          }}
        />
      </section>
    </div>
  )
}
