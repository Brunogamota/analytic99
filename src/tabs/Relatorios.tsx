import { useMemo, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Coluna, DataTable } from '@/components/DataTable'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  CORES_SERIE,
} from '@/components/chart'
import { Badge, BotaoSecundario, SecaoTitulo, Vazio } from '@/components/ui'
import { cn, fmtDec, fmtInt, fmtMoeda, fmtPct } from '@/lib/format'
import {
  FILTRO_VAZIO,
  MOTIVOS_OCORRENCIA,
  RESPONSABILIDADES,
  TIPOS_OCORRENCIA,
  cruzamentoMotivoResponsabilidade,
  evolucaoDiaria,
  filtroAtivo,
  parceirosCriticos,
  porMotivo,
  porParceiro,
  porResponsabilidade,
  porSubtipoReclamacao,
  porTipo,
  resumoOcorrencias,
  rotuloMotivo,
  rotuloResponsabilidadeCurto,
  rotuloTipoOcorrencia,
  type FiltroOcorrencias,
  type LinhaOcorrenciaParceiro,
} from '@/lib/ocorrencias'
import { rotuloPeriodo } from '@/lib/periodo'
import { type Snapshot } from '@/lib/queries'
import {
  DIMENSOES,
  ROTULO_DIMENSAO,
  conversao as calcularConversao,
  detalhePorParceiro,
  paraCsv,
  resumoPorDimensao,
  rotuloCategoria,
  sufixoPeriodo,
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

/** Número ausente é "—" na tela e célula vazia no CSV: nunca NaN. */
function ou(v: number | null, formatar: (n: number) => string) {
  return v === null ? <span className="text-muted">—</span> : formatar(v)
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

// ---------------------------------------------------------------------------
// Abas internas
// ---------------------------------------------------------------------------

type Visao = 'operacao' | 'perdas'

const VISOES: { chave: Visao; rotulo: string }[] = [
  { chave: 'operacao', rotulo: 'Operação' },
  { chave: 'perdas', rotulo: 'Perdas e ocorrências' },
]

function AbasInternas({ visao, onChange }: { visao: Visao; onChange: (v: Visao) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Recorte do relatório"
      className="inline-flex items-center gap-1 rounded-full border border-stroke bg-areia-barra p-1"
    >
      {VISOES.map((v) => {
        const ativo = v.chave === visao
        return (
          <button
            key={v.chave}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(v.chave)}
            className={cn(
              'h-8 rounded-full px-4 text-[13px] outline-none transition-colors',
              ativo ? 'bg-white font-semibold text-ink' : 'font-medium text-muted hover:text-ink',
            )}
          >
            {v.rotulo}
          </button>
        )
      })}
    </div>
  )
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
  const [visao, setVisao] = useState<Visao>('operacao')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {rotuloPeriodo(atual.periodo)} · {fmtInt(atual.parceiros.length)}{' '}
          {atual.parceiros.length === 1 ? 'parceiro' : 'parceiros'} no recorte ·{' '}
          {fmtInt(atual.totalPedidos)} pedidos · comparado com {comparacao}.
        </p>
        <AbasInternas visao={visao} onChange={setVisao} />
      </div>

      {visao === 'operacao' ? (
        <Operacao atual={atual} anterior={anterior} comparacao={comparacao} />
      ) : (
        <Perdas atual={atual} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba: Operação
// ---------------------------------------------------------------------------

function Operacao({
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

// ---------------------------------------------------------------------------
// Aba: Perdas e ocorrências
// ---------------------------------------------------------------------------

/** Branco → rosa claro → rosa 99, a mesma escala do heatmap de horários. */
function corDaCelula(intensidade: number): string {
  const t = Math.max(0, Math.min(1, intensidade))
  const [de, para, k] =
    t <= 0.5
      ? ([[255, 255, 255], [242, 134, 183], t / 0.5] as const)
      : ([[242, 134, 183], [227, 28, 121], (t - 0.5) / 0.5] as const)
  const canal = (i: number) => Math.round(de[i] + (para[i] - de[i]) * k)
  return `rgb(${canal(0)}, ${canal(1)}, ${canal(2)})`
}

/** Tick de valor: arredondar o milhar cheio faria 1.200 e 1.600 virarem "1k" e "2k". */
const valorCurto = (v: number) => (v >= 1000 ? `R$ ${fmtDec(v / 1000, 1)}k` : `R$ ${fmtInt(v)}`)

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]
}

function GrupoChips<T extends string>({
  titulo,
  opcoes,
  selecionadas,
  rotulo,
  onToggle,
}: {
  titulo: string
  opcoes: T[]
  selecionadas: T[]
  rotulo: (v: T) => string
  onToggle: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="label-track w-[140px] shrink-0">{titulo}</span>
      {opcoes.map((o) => {
        const ativa = selecionadas.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={ativa}
            onClick={() => onToggle(o)}
            className={cn('chip h-8 px-3 text-[12px]', ativa && 'border-ink bg-hairline font-medium')}
          >
            {rotulo(o)}
          </button>
        )
      })}
    </div>
  )
}

function Cartao({
  titulo,
  subtitulo,
  acao,
  children,
}: {
  titulo: string
  subtitulo: string
  acao?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-ink">{titulo}</h3>
          <p className="mt-0.5 text-[13px] text-muted">{subtitulo}</p>
        </div>
        {acao}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SemDados({ mensagem, altura = 240 }: { mensagem: string; altura?: number }) {
  return (
    <div
      style={{ height: altura }}
      className="flex items-center justify-center text-[13px] text-muted"
    >
      {mensagem}
    </div>
  )
}

/** Lista compacta com barra de participação — o mesmo desenho para os três cortes. */
function ListaDistribuicao({
  linhas,
  vazio,
}: {
  linhas: { chave: string; rotulo: string; contagem: number; valor?: number; pct: number }[]
  vazio: string
}) {
  if (linhas.length === 0) return <SemDados mensagem={vazio} altura={180} />
  return (
    <ul className="space-y-2.5">
      {linhas.map((l) => (
        <li key={l.chave}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-ink">{l.rotulo}</span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
              {fmtInt(l.contagem)}
              <span className="ml-1.5 text-[12px] font-normal text-muted">{fmtPct(l.pct, 0)}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-hairline">
            <div
              className="h-1.5 rounded-full bg-rosa"
              style={{ width: `${Math.max(2, Math.round(l.pct * 100))}%` }}
            />
          </div>
          {l.valor !== undefined && (
            <p className="mt-1 text-[12px] text-muted">{fmtMoeda(l.valor)} em prejuízo</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function Perdas({ atual }: { atual: Snapshot }) {
  const [filtro, setFiltro] = useState<FiltroOcorrencias>(FILTRO_VAZIO)

  const resumo = useMemo(() => resumoOcorrencias(atual, filtro), [atual, filtro])
  const evolucao = useMemo(() => evolucaoDiaria(atual, filtro), [atual, filtro])
  const motivos = useMemo(() => porMotivo(atual, filtro), [atual, filtro])
  const tipos = useMemo(() => porTipo(atual, filtro), [atual, filtro])
  const responsabilidades = useMemo(() => porResponsabilidade(atual, filtro), [atual, filtro])
  const cruzamento = useMemo(
    () => cruzamentoMotivoResponsabilidade(atual, filtro),
    [atual, filtro],
  )
  const linhas = useMemo(() => porParceiro(atual, filtro), [atual, filtro])
  const criticos = useMemo(() => parceirosCriticos(atual, filtro), [atual, filtro])
  const subtipos = useMemo(() => porSubtipoReclamacao(atual), [atual])
  const totalSemFiltro = useMemo(() => resumoOcorrencias(atual).total, [atual])

  const temFiltro = filtroAtivo(filtro)
  const sufixo = sufixoPeriodo(atual.periodo)

  const cartoes = [
    { chave: 'total', label: 'Ocorrências', valor: fmtInt(resumo.total) },
    { chave: 'valor', label: 'Valor total', valor: fmtMoeda(resumo.valor) },
    { chave: 'ressarcido', label: 'Valor ressarcido', valor: fmtMoeda(resumo.valor_ressarcido) },
    { chave: 'aberto', label: 'Ainda em aberto', valor: fmtMoeda(resumo.valor_em_aberto) },
    {
      chave: 'taxa',
      label: 'Por 100 pedidos',
      valor: resumo.taxa_por_100 === null ? '—' : fmtDec(resumo.taxa_por_100, 2),
    },
    {
      chave: 'receita',
      label: '% da receita',
      valor: resumo.pct_receita === null ? '—' : fmtPct(resumo.pct_receita, 2),
    },
  ]

  const colunas: Coluna<LinhaOcorrenciaParceiro>[] = [
    { chave: 'parceiro', label: 'Parceiro', valor: (l) => l.parceiro, larguraMin: '200px' },
    { chave: 'praca', label: 'Praça', valor: (l) => l.praca, larguraMin: '150px' },
    { chave: 'executivo', label: 'Executivo', valor: (l) => l.executivo, larguraMin: '160px' },
    {
      chave: 'pedidos',
      label: 'Pedidos',
      numerica: true,
      valor: (l) => l.pedidos,
      render: (l) => fmtInt(l.pedidos),
    },
    {
      chave: 'ocorrencias',
      label: 'Ocorrências',
      numerica: true,
      valor: (l) => l.ocorrencias,
      render: (l) => fmtInt(l.ocorrencias),
    },
    {
      chave: 'taxa',
      label: 'Por 100 pedidos',
      numerica: true,
      // Sem denominador a linha vai para o fim da ordenação, não para o topo.
      valor: (l) => l.taxa_por_100 ?? -1,
      render: (l) => (
        <span
          className={cn(
            criticos.limite !== null &&
              l.taxa_por_100 !== null &&
              l.taxa_por_100 > criticos.limite &&
              'font-medium text-laranja-escuro',
          )}
        >
          {ou(l.taxa_por_100, (v) => fmtDec(v, 2))}
        </span>
      ),
    },
    {
      chave: 'valor',
      label: 'Valor',
      numerica: true,
      valor: (l) => l.valor,
      render: (l) => fmtMoeda(l.valor),
    },
    {
      chave: 'ressarcido',
      label: 'Ressarcido',
      numerica: true,
      valor: (l) => l.valor_ressarcido,
      render: (l) => fmtMoeda(l.valor_ressarcido),
    },
    {
      chave: 'pct_receita',
      label: '% da receita',
      numerica: true,
      valor: (l) => l.pct_receita ?? -1,
      render: (l) => ou(l.pct_receita, (v) => fmtPct(v, 2)),
    },
    {
      chave: 'motivo',
      label: 'Motivo predominante',
      larguraMin: '190px',
      valor: (l) => (l.motivo_predominante === null ? '' : rotuloMotivo(l.motivo_predominante)),
      render: (l) =>
        l.motivo_predominante === null ? (
          <span className="text-muted">—</span>
        ) : (
          <span>
            {rotuloMotivo(l.motivo_predominante)}
            <span className="ml-1.5 text-[12px] text-muted">
              {fmtInt(l.motivo_predominante_qtd)} de {fmtInt(l.ocorrencias)}
            </span>
          </span>
        ),
    },
    {
      chave: 'tipo',
      label: 'Tipo predominante',
      larguraMin: '140px',
      valor: (l) =>
        l.tipo_predominante === null ? '' : rotuloTipoOcorrencia(l.tipo_predominante),
      render: (l) =>
        l.tipo_predominante === null ? (
          <span className="text-muted">—</span>
        ) : (
          rotuloTipoOcorrencia(l.tipo_predominante)
        ),
    },
    {
      chave: 'reincidente',
      label: 'Reincidente',
      valor: (l) => l.reincidencias,
      render: (l) =>
        l.reincidente ? (
          <Badge tom="rosa">{fmtInt(l.reincidencias)} reincidentes</Badge>
        ) : (
          <span className="text-muted">Não</span>
        ),
    },
    {
      chave: 'reclamacoes',
      label: 'Reclamações',
      numerica: true,
      valor: (l) => l.reclamacoes,
      render: (l) => fmtInt(l.reclamacoes),
    },
  ]

  const csv: ColunaCsv<LinhaOcorrenciaParceiro>[] = [
    { titulo: 'Parceiro', valor: (l) => l.parceiro },
    { titulo: 'Praça', valor: (l) => l.praca },
    { titulo: 'Executivo', valor: (l) => l.executivo },
    { titulo: 'Gerente', valor: (l) => l.gerente },
    { titulo: 'Pedidos', valor: (l) => l.pedidos },
    { titulo: 'Receita', valor: (l) => l.receita },
    { titulo: 'Ocorrências', valor: (l) => l.ocorrencias },
    { titulo: 'Ocorrências por 100 pedidos', valor: (l) => l.taxa_por_100 },
    { titulo: 'Valor', valor: (l) => l.valor },
    { titulo: 'Valor ressarcido', valor: (l) => l.valor_ressarcido },
    { titulo: '% da receita comprometida', valor: (l) => l.pct_receita },
    {
      titulo: 'Motivo predominante',
      valor: (l) => (l.motivo_predominante === null ? null : rotuloMotivo(l.motivo_predominante)),
    },
    { titulo: 'Ocorrências do motivo predominante', valor: (l) => l.motivo_predominante_qtd },
    {
      titulo: 'Tipo predominante',
      valor: (l) =>
        l.tipo_predominante === null ? null : rotuloTipoOcorrencia(l.tipo_predominante),
    },
    { titulo: 'Ocorrências reincidentes', valor: (l) => l.reincidencias },
    { titulo: 'Reincidente', valor: (l) => (l.reincidente ? 'Sim' : 'Não') },
    { titulo: 'Reclamações', valor: (l) => l.reclamacoes },
  ]

  if (atual.parceiros.length === 0) {
    return (
      <div className="card">
        <Vazio
          titulo="Nenhum parceiro no recorte"
          dica="Amplie o período ou remova filtros de gerente, executivo e praça para investigar as perdas."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-6 gap-3">
        {cartoes.map((c) => (
          <div key={c.chave} className="card px-5 py-4">
            <p className="text-[12px] text-muted">{c.label}</p>
            <p className="mt-1.5 whitespace-nowrap text-[22px] font-bold leading-8 tracking-[-0.01em] tabular-nums text-ink">
              {c.valor}
            </p>
          </div>
        ))}
      </section>

      <section className="card space-y-2.5 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-muted">
            {temFiltro ? (
              <>
                {fmtInt(resumo.total)} de {fmtInt(totalSemFiltro)} ocorrências pelo filtro atual ·{' '}
                {fmtInt(resumo.parceiros_afetados)}{' '}
                {resumo.parceiros_afetados === 1 ? 'parceiro afetado' : 'parceiros afetados'}
              </>
            ) : (
              <>
                {fmtInt(resumo.total)} ocorrências · {fmtInt(resumo.parceiros_afetados)}{' '}
                {resumo.parceiros_afetados === 1 ? 'parceiro afetado' : 'parceiros afetados'} ·{' '}
                {fmtInt(resumo.reincidentes)} com reincidência no motivo
              </>
            )}
          </p>
          {temFiltro && (
            <BotaoSecundario onClick={() => setFiltro(FILTRO_VAZIO)}>
              Limpar filtros
            </BotaoSecundario>
          )}
        </div>

        <GrupoChips
          titulo="Tipo"
          opcoes={TIPOS_OCORRENCIA}
          selecionadas={filtro.tipos}
          rotulo={rotuloTipoOcorrencia}
          onToggle={(v) => setFiltro((f) => ({ ...f, tipos: alternar(f.tipos, v) }))}
        />
        <GrupoChips
          titulo="Motivo"
          opcoes={MOTIVOS_OCORRENCIA}
          selecionadas={filtro.motivos}
          rotulo={rotuloMotivo}
          onToggle={(v) => setFiltro((f) => ({ ...f, motivos: alternar(f.motivos, v) }))}
        />
        <GrupoChips
          titulo="Responsabilidade"
          opcoes={RESPONSABILIDADES}
          selecionadas={filtro.responsabilidades}
          rotulo={rotuloResponsabilidadeCurto}
          onToggle={(v) =>
            setFiltro((f) => ({ ...f, responsabilidades: alternar(f.responsabilidades, v) }))
          }
        />
      </section>

      <Cartao
        titulo="Ocorrências e prejuízo por dia"
        subtitulo="Contagem à esquerda, valor envolvido à direita. Dia sem ocorrência aparece no zero."
      >
        {resumo.total === 0 ? (
          <SemDados mensagem="Nenhuma ocorrência no recorte." altura={280} />
        ) : (
          <ChartContainer altura={280} initialDimension={{ width: 900, height: 280 }}>
            <AreaChart data={evolucao} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-ocorrencias" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CORES_SERIE[0]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CORES_SERIE[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
                tickFormatter={(v: number) => fmtInt(v)}
              />
              <YAxis
                yAxisId="valor"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={62}
                tickFormatter={valorCurto}
              />
              <ChartTooltip
                cursor={{ stroke: '#E7E7E7', strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    formatarValor={(v, nome) =>
                      nome === 'Ocorrências' ? fmtInt(v) : fmtMoeda(v)
                    }
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="contagem"
                name="Ocorrências"
                stroke={CORES_SERIE[0]}
                strokeWidth={2}
                fill="url(#grad-ocorrencias)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                yAxisId="valor"
                type="monotone"
                dataKey="valor"
                name="Valor"
                stroke={CORES_SERIE[1]}
                strokeWidth={2}
                fill="none"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </Cartao>

      <div className="grid grid-cols-2 gap-4">
        <Cartao
          titulo="Ocorrências por motivo"
          subtitulo="O que gera o problema, em contagem. O valor de cada motivo está na lista abaixo."
        >
          {motivos.length === 0 ? (
            <SemDados mensagem="Nenhuma ocorrência no recorte." altura={320} />
          ) : (
            <ChartContainer
              altura={Math.max(240, motivos.length * 30 + 30)}
              indicator="square"
              initialDimension={{ width: 460, height: 320 }}
            >
              <BarChart
                data={motivos}
                layout="vertical"
                margin={{ top: 4, right: 20, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickMargin={8}
                  tickFormatter={(v: number) => fmtInt(v)}
                />
                <YAxis
                  type="category"
                  dataKey="rotulo"
                  tickLine={false}
                  axisLine={false}
                  width={148}
                  tickMargin={6}
                />
                <ChartTooltip
                  cursor={{ fill: '#F5F5F5' }}
                  content={<ChartTooltipContent formatarValor={(v) => fmtInt(v)} />}
                />
                <Bar
                  dataKey="contagem"
                  name="Ocorrências"
                  fill={CORES_SERIE[0]}
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
              </BarChart>
            </ChartContainer>
          )}
        </Cartao>

        <Cartao
          titulo="Motivo × responsabilidade"
          subtitulo="Quem arcou com cada motivo. Quanto mais rosa, mais ocorrências na célula."
        >
          {cruzamento.total === 0 ? (
            <SemDados mensagem="Nenhuma ocorrência no recorte." altura={320} />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">
                <div className="flex">
                  <div className="w-[132px] shrink-0" />
                  {cruzamento.responsabilidades.map((r) => (
                    <div key={r} className="flex-1 pb-1 text-center text-[11px] text-muted">
                      {rotuloResponsabilidadeCurto(r)}
                    </div>
                  ))}
                </div>

                {cruzamento.motivos.map((m, l) => (
                  <div key={m} className="flex items-center">
                    <div
                      title={rotuloMotivo(m)}
                      className="w-[132px] shrink-0 truncate pr-2 text-right text-[11px] text-muted"
                    >
                      {rotuloMotivo(m)}
                    </div>
                    {cruzamento.responsabilidades.map((r, c) => {
                      const v = cruzamento.celulas[l][c]
                      const intensidade = cruzamento.max === 0 ? 0 : v / cruzamento.max
                      return (
                        <div key={r} className="flex-1 p-[1px]">
                          <div
                            title={`${rotuloMotivo(m)} · ${rotuloResponsabilidadeCurto(r)} — ${fmtInt(v)} ${v === 1 ? 'ocorrência' : 'ocorrências'} · ${fmtMoeda(cruzamento.valores[l][c])}`}
                            style={{ backgroundColor: corDaCelula(intensidade) }}
                            className={cn(
                              'flex h-7 items-center justify-center rounded-[3px] text-[11px] font-medium tabular-nums',
                              intensidade > 0.82 ? 'text-white' : 'text-ink',
                              v === 0 && 'border border-hairline',
                            )}
                          >
                            {v === 0 ? '' : fmtInt(v)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Cartao>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Cartao titulo="Por tipo" subtitulo="Como o problema foi resolvido no financeiro.">
          <ListaDistribuicao
            linhas={tipos.map((t) => ({ ...t, chave: t.chave as string }))}
            vazio="Nenhuma ocorrência no recorte."
          />
        </Cartao>

        <Cartao titulo="Por responsabilidade" subtitulo="Quem arcou com o prejuízo do recorte.">
          <ListaDistribuicao
            linhas={responsabilidades.map((r) => ({ ...r, chave: r.chave as string }))}
            vazio="Nenhuma ocorrência no recorte."
          />
        </Cartao>

        <Cartao
          titulo="Reclamações por tipo detalhado"
          subtitulo="O que o cliente abriu no recorte — esta lista não segue os chips acima."
        >
          <ListaDistribuicao
            linhas={subtipos.map((s) => ({ chave: s.chave as string, rotulo: s.rotulo, contagem: s.contagem, pct: s.pct }))}
            vazio="Nenhuma reclamação no recorte."
          />
        </Cartao>
      </div>

      <section>
        <SecaoTitulo
          titulo="Parceiros críticos"
          descricao={
            criticos.taxa_grupo === null
              ? 'Sem pedidos no recorte, não há taxa de grupo para comparar.'
              : `Acima de ${fmtDec(criticos.limite ?? 0, 2)} ocorrências por 100 pedidos — o dobro da média do grupo (${fmtDec(criticos.taxa_grupo, 2)}). Entram na conta os ${fmtInt(criticos.avaliados)} parceiros com ao menos ${fmtInt(criticos.minimo_pedidos)} pedidos e ${fmtInt(criticos.minimo_ocorrencias)} ocorrências no recorte.`
          }
        />
        <div className="card p-5">
          {criticos.linhas.length === 0 ? (
            <Vazio
              titulo="Nenhum parceiro acima de 2× a média"
              dica="Com o recorte e os filtros atuais, nenhum parceiro com volume suficiente passou do dobro da taxa do grupo."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {criticos.linhas.map((l) => (
                <li key={l.id_parceiro} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink">{l.parceiro}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {l.praca} · {l.executivo} · {l.gerente}
                    </p>
                    <p className="mt-1 text-[13px] text-ink">{l.frase}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[18px] font-bold tabular-nums text-rosa-escuro">
                      {fmtDec(l.vezes_a_media, 1)}×
                    </p>
                    <p className="text-[12px] text-muted">a média do grupo</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <SecaoTitulo
          titulo="Perdas por parceiro"
          descricao="Uma linha por parceiro do recorte. Ordene por valor para ver onde o prejuízo está concentrado."
          acao={
            <BotaoSecundario
              onClick={() => baixarCsv(`relatorio-ocorrencias-${sufixo}.csv`, paraCsv(linhas, csv))}
            >
              <Download className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
              Exportar CSV
            </BotaoSecundario>
          }
        />
        <DataTable
          colunas={colunas}
          linhas={linhas}
          chaveDe={(l) => l.id_parceiro}
          ordemInicial={{ chave: 'valor', asc: false }}
          busca={{
            placeholder: 'Buscar parceiro, praça ou executivo',
            campos: (l) => `${l.parceiro} ${l.praca} ${l.executivo} ${l.gerente}`,
          }}
          vazio={{
            titulo: 'Nenhum parceiro no recorte',
            dica: 'Os filtros combinados não deixaram nenhum parceiro para comparar.',
          }}
        />
      </section>
    </div>
  )
}
