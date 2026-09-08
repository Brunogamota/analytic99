import { useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { Plus, X } from 'lucide-react'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  CORES_SERIE,
} from '@/components/chart'
import { Coluna, DataTable } from '@/components/DataTable'
import { Badge, SecaoTitulo, Vazio } from '@/components/ui'
import { cn, fmtDec, fmtInt, fmtMoeda, fmtPct } from '@/lib/format'
import { snapshot, type Snapshot } from '@/lib/queries'
import {
  aplicarChips,
  COR_STATUS,
  destaqueGeral,
  faixaNota,
  linhasDoRecorte,
  opcoesDeFiltro,
  PESOS,
  RECORTES,
  ROTULO_COLUNA,
  ROTULO_TIPO_CHIP,
  serieDoRecorte,
  type ChipFiltro,
  type LinhaPerformance,
  type Nota,
  type NivelLocal,
  type Recorte,
} from '@/lib/performance'

const traco = <span className="text-muted">—</span>

const ou = (v: number | null, render: (n: number) => string) =>
  v === null ? traco : <>{render(v)}</>

function Variacao({ v }: { v: number | null }) {
  if (v === null) return traco
  return (
    <span className={cn(v < 0 && 'text-laranja-escuro')}>
      {v >= 0 ? '+' : '−'}
      {fmtPct(Math.abs(v))}
    </span>
  )
}

function NotaBadge({ nota }: { nota: Nota }) {
  const faixa = faixaNota(nota.valor)
  if (nota.valor === null) return traco
  return <Badge tom={faixa.tom}>{fmtInt(nota.valor)}</Badge>
}

// ---------------------------------------------------------------------------
// Controle segmentado
// ---------------------------------------------------------------------------

function Segmentado({
  recorte,
  onChange,
}: {
  recorte: Recorte
  onChange: (r: Recorte) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Recorte da análise"
      className="inline-flex items-center gap-1 rounded-full border border-stroke bg-areia-barra p-1"
    >
      {RECORTES.map((r) => {
        const ativo = r.chave === recorte
        return (
          <button
            key={r.chave}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(r.chave)}
            className={cn(
              'h-8 rounded-full px-4 text-[13px] outline-none transition-colors',
              ativo
                ? 'bg-white font-semibold text-ink'
                : 'font-medium text-muted hover:text-ink',
            )}
          >
            {r.rotulo}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chips removíveis
// ---------------------------------------------------------------------------

function BarraChips({
  chips,
  grupos,
  onAdicionar,
  onRemover,
  onLimpar,
}: {
  chips: ChipFiltro[]
  grupos: { tipo: ChipFiltro['tipo']; opcoes: ChipFiltro[] }[]
  onAdicionar: (c: ChipFiltro) => void
  onRemover: (c: ChipFiltro) => void
  onLimpar: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={`${c.tipo}|${c.valor}`} className="chip pr-1.5">
          <span className="text-muted">{ROTULO_TIPO_CHIP[c.tipo]}</span>
          <span className="text-muted">é</span>
          <span className="font-medium text-ink">{c.rotulo}</span>
          <button
            type="button"
            aria-label={`Remover filtro ${ROTULO_TIPO_CHIP[c.tipo]} ${c.rotulo}`}
            onClick={() => onRemover(c)}
            className="ml-0.5 rounded-full p-1 text-muted outline-none hover:bg-areia-ativo hover:text-ink"
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        </span>
      ))}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="chip text-muted" disabled={grupos.length === 0}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          Adicionar filtro
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 max-h-[340px] min-w-[220px] overflow-y-auto rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(28,27,26,0.08)]"
          >
            {grupos.map((g) => (
              <DropdownMenu.Group key={g.tipo}>
                <DropdownMenu.Label className="label-track px-2 pb-1 pt-2">
                  {ROTULO_TIPO_CHIP[g.tipo]}
                </DropdownMenu.Label>
                {g.opcoes.map((o) => (
                  <DropdownMenu.Item
                    key={`${o.tipo}|${o.valor}`}
                    onSelect={() => onAdicionar(o)}
                    className="cursor-pointer select-none rounded px-2 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hairline"
                  >
                    {o.rotulo}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Group>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {chips.length > 0 && (
        <button type="button" onClick={onLimpar} className="chip text-muted">
          Limpar
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bloco de destaque: donut + decomposição + grade de métricas
// ---------------------------------------------------------------------------

function Donut({ nota }: { nota: Nota }) {
  const faixa = faixaNota(nota.valor)
  const valor = nota.valor ?? 0
  const dados = [
    { nome: 'nota', v: valor },
    { nome: 'resto', v: 100 - valor },
  ]

  return (
    <div className="relative">
      <ChartContainer altura={196} initialDimension={{ width: 260, height: 196 }}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={dados}
            dataKey="v"
            nameKey="nome"
            innerRadius="74%"
            outerRadius="94%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={nota.valor === null ? '#F5F5F5' : faixa.cor} />
            <Cell fill="#F5F5F5" />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[42px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {nota.valor === null ? '—' : fmtInt(nota.valor)}
        </span>
        <span className="mt-1 text-[11px] text-muted">de 100</span>
      </div>
    </div>
  )
}

function Decomposicao({ nota }: { nota: Nota }) {
  return (
    <ul className="space-y-2.5">
      {nota.parcelas.map((p) => {
        const razao = p.pontos === null ? 0 : p.pontos / p.peso
        const cor = faixaNota(p.pontos === null ? null : razao * 100).cor
        return (
          <li key={p.chave}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-ink">{p.rotulo}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-muted">
                {p.pontos === null ? '—' : fmtDec(p.pontos, 1)}
                <span className="text-muted"> / {p.peso}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full"
                style={{ width: `${razao * 100}%`, backgroundColor: cor }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">{p.detalhe}</p>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Aba
// ---------------------------------------------------------------------------

export function Performance({
  atual,
  anterior,
  comparacao,
}: {
  atual: Snapshot
  anterior: Snapshot
  comparacao: string
}) {
  const [recorte, setRecorte] = useState<Recorte>('pessoa')
  const [nivel, setNivel] = useState<NivelLocal>('praca')
  const [chips, setChips] = useState<ChipFiltro[]>([])

  // Os chips recortam a carteira e os dois snapshots são refeitos sobre ela —
  // sem chip nenhum, o snapshot que veio do App é reaproveitado inteiro.
  const escopo = useMemo(() => {
    if (chips.length === 0) return { atual, anterior }
    const parceiros = aplicarChips(atual.parceiros, chips)
    return {
      atual: snapshot(parceiros, atual.periodo),
      anterior: snapshot(parceiros, anterior.periodo),
    }
  }, [atual, anterior, chips])

  const linhas = useMemo(
    () => linhasDoRecorte(escopo.atual, escopo.anterior, recorte, nivel),
    [escopo, recorte, nivel],
  )
  const destaque = useMemo(
    () => destaqueGeral(escopo.atual, escopo.anterior, comparacao),
    [escopo, comparacao],
  )
  const serie = useMemo(
    () => serieDoRecorte(escopo.atual, recorte, nivel, linhas, CORES_SERIE),
    [escopo, recorte, nivel, linhas],
  )
  const grupos = useMemo(
    () => opcoesDeFiltro(atual.parceiros, chips),
    [atual.parceiros, chips],
  )

  const faixa = faixaNota(destaque.nota.valor)
  const vazio = destaque.parceiros === 0

  const adicionar = (c: ChipFiltro) =>
    setChips((atuais) =>
      atuais.some((x) => x.tipo === c.tipo && x.valor === c.valor) ? atuais : [...atuais, c],
    )

  const colunaRotulo: Coluna<LinhaPerformance> = {
    chave: 'rotulo',
    label: ROTULO_COLUNA[recorte],
    valor: (l) => l.rotulo,
    larguraMin: '190px',
    render: (l) => (
      <span className="flex flex-col">
        <span className="font-medium text-ink">{l.rotulo}</span>
        {l.sub && <span className="text-[11px] text-muted">{l.sub}</span>}
      </span>
    ),
  }

  const colunaGerente: Coluna<LinhaPerformance> = {
    chave: 'gerente',
    label: 'Gerente',
    valor: (l) => l.gerente,
    larguraMin: '150px',
    render: (l) => (l.gerente === '' ? traco : l.gerente),
  }

  const colunasComuns: Coluna<LinhaPerformance>[] = [
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
      chave: 'conversao',
      label: 'Conversão',
      numerica: true,
      valor: (l) => l.conversao ?? -1,
      render: (l) => ou(l.conversao, (v) => fmtDec(v)),
    },
    {
      chave: 'aderencia',
      label: '% aderência',
      numerica: true,
      valor: (l) => l.pct_aderencia ?? -1,
      render: (l) => ou(l.pct_aderencia, (v) => fmtPct(v)),
    },
    {
      chave: 'budget',
      label: 'Budget vs. necessário',
      numerica: true,
      valor: (l) => l.razao_budget ?? -1,
      render: (l) =>
        l.razao_budget === null ? (
          traco
        ) : (
          <span className={cn(Math.abs(l.razao_budget - 1) > 0.25 && 'font-medium text-laranja-escuro')}>
            {fmtPct(l.razao_budget)}
          </span>
        ),
    },
    {
      chave: 'reclamacoes',
      label: 'Reclam./100',
      numerica: true,
      valor: (l) => l.reclamacoes_por_100 ?? -1,
      render: (l) => ou(l.reclamacoes_por_100, (v) => fmtDec(v)),
    },
  ]

  const colunasCategoria: Coluna<LinhaPerformance>[] = [
    {
      chave: 'participacao',
      label: '% receita',
      numerica: true,
      valor: (l) => l.participacao_receita,
      render: (l) => fmtPct(l.participacao_receita),
    },
    {
      chave: 'var_receita',
      label: 'Δ receita',
      numerica: true,
      valor: (l) => l.var_receita,
      render: (l) => <Variacao v={l.var_receita} />,
    },
    {
      chave: 'var_conversao',
      label: 'Δ conv.',
      numerica: true,
      valor: (l) => l.var_conversao,
      render: (l) => <Variacao v={l.var_conversao} />,
    },
  ]

  const colunaNota: Coluna<LinhaPerformance> = {
    chave: 'nota',
    label: 'Nota',
    numerica: true,
    valor: (l) => l.nota.valor ?? -1,
    render: (l) => <NotaBadge nota={l.nota} />,
  }

  // A nota fica logo depois do nome: é a coluna que a página promete, e no
  // recorte de categoria a tabela é larga o bastante para rolar na horizontal.
  const colunas: Coluna<LinhaPerformance>[] = [
    colunaRotulo,
    colunaNota,
    ...(recorte === 'categoria' ? [] : [colunaGerente]),
    ...colunasComuns,
    ...(recorte === 'categoria' ? colunasCategoria : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          recorte={recorte}
          onChange={(r) => {
            setRecorte(r)
            if (r === 'local') setNivel('praca')
          }}
        />

        {recorte === 'local' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted">Agrupar por</span>
            {(
              [
                ['praca', 'Praça'],
                ['cidade', 'Cidade'],
              ] as const
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                aria-pressed={nivel === chave}
                onClick={() => setNivel(chave)}
                className={cn('chip', nivel === chave && 'border-ink bg-hairline font-medium')}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <BarraChips
        chips={chips}
        grupos={grupos}
        onAdicionar={adicionar}
        onRemover={(c) =>
          setChips((atuais) => atuais.filter((x) => !(x.tipo === c.tipo && x.valor === c.valor)))
        }
        onLimpar={() => setChips([])}
      />

      {vazio ? (
        <div className="card">
          <Vazio
            titulo="Nenhum parceiro no recorte"
            dica="Os chips combinados não deixaram nenhum parceiro. Remova um filtro para voltar a ver a página."
          />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-[340px_1fr] gap-4">
            <div className="card p-5">
              <p className="label-track">Nota do recorte</p>
              <Donut nota={destaque.nota} />
              <div className="mt-1 flex items-center justify-center">
                <Badge tom={faixa.tom}>{faixa.rotulo}</Badge>
              </div>
              <div className="mt-4 border-t border-hairline pt-4">
                <p className="label-track pb-2.5">
                  Decomposição · pesos {PESOS.aderencia}/{PESOS.conversao}/{PESOS.budget}/
                  {PESOS.qualidade}
                </p>
                <Decomposicao nota={destaque.nota} />
                {destaque.nota.peso_considerado < 100 && (
                  <p className="mt-3 text-[11px] text-muted">
                    Parcela sem base sai da conta: a nota vale sobre{' '}
                    {destaque.nota.peso_considerado} pontos, reescalados para 100.
                  </p>
                )}
              </div>
            </div>

            <div className="card flex flex-col p-5">
              <p className="label-track">
                Métricas do recorte · comparado com {comparacao}
              </p>
              <div className="mt-4 grid flex-1 auto-rows-fr grid-cols-3 gap-x-6 gap-y-4">
                {destaque.metricas.map((m) => (
                  <div
                    key={m.chave}
                    className="flex flex-col justify-center border-l border-hairline pl-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COR_STATUS[m.status] }}
                      />
                      <span className="text-[12px] text-muted">{m.rotulo}</span>
                    </div>
                    <p className="mt-1.5 whitespace-nowrap text-[24px] font-bold leading-8 tracking-[-0.01em] tabular-nums text-ink">
                      {m.valor}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">{m.detalhe}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <SecaoTitulo
              titulo="Pedidos por dia"
              descricao={
                serie.ocultos > 0
                  ? `Os ${serie.series.length} primeiros do recorte, empilhados. Outros ${serie.ocultos} ficaram fora do gráfico.`
                  : 'Cada faixa é um grupo do recorte, empilhado no total do dia.'
              }
            />
            <div className="card p-5">
              {escopo.atual.totalPedidos === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-[13px] text-muted">
                  Sem pedidos no recorte.
                </div>
              ) : (
                <ChartContainer altura={280} initialDimension={{ width: 900, height: 280 }}>
                  <AreaChart data={serie.pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                      width={46}
                      tickFormatter={(v: number) => fmtInt(v)}
                    />
                    <ChartTooltip
                      cursor={{ stroke: '#E7E7E7', strokeWidth: 1 }}
                      content={<ChartTooltipContent formatarValor={(v) => fmtInt(v)} />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {serie.series.map((s) => (
                      <Area
                        key={s.chave}
                        type="monotone"
                        dataKey={s.chave}
                        name={s.rotulo}
                        stackId="pedidos"
                        stroke={s.cor}
                        strokeWidth={1.5}
                        fill={s.cor}
                        fillOpacity={0.18}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
          </section>

          <section>
            <SecaoTitulo
              titulo={`Detalhe por ${ROTULO_COLUNA[recorte].toLowerCase()}`}
              descricao={
                recorte === 'categoria'
                  ? `Clique em uma linha para transformá-la em filtro da página. As colunas Δ comparam com ${comparacao}.`
                  : 'Clique em uma linha para transformá-la em filtro da página.'
              }
            />
            <DataTable
              colunas={colunas}
              linhas={linhas}
              chaveDe={(l) => l.chave}
              ordemInicial={{ chave: 'nota', asc: false }}
              onLinhaClick={(l) => adicionar({ tipo: l.tipoChip, valor: l.chave, rotulo: l.rotulo })}
              busca={{
                placeholder: `Buscar ${ROTULO_COLUNA[recorte].toLowerCase()}`,
                campos: (l) => `${l.rotulo} ${l.gerente} ${l.sub}`,
              }}
              vazio={{
                titulo: 'Nenhum grupo no recorte',
                dica: 'Os filtros combinados não deixaram nenhum parceiro para agrupar.',
              }}
            />
          </section>
        </>
      )}
    </div>
  )
}
