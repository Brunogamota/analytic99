import { useMemo, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Label,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  CORES_SERIE,
} from '@/components/chart'
import { fmtInt, fmtMoeda, fmtPct } from '@/lib/format'
import {
  META_ADERENCIA,
  serieAderenciaPorExecutivo,
  serieDiaria,
  serieReclamacoesPorTipo,
} from '@/lib/series'
import type { Snapshot } from '@/lib/queries'

/** Eixo de receita: o valor cheio em reais não cabe no tick. */
const receitaCurta = (v: number) =>
  v >= 1000 ? `R$ ${Math.round(v / 1000)}k` : `R$ ${Math.round(v)}`

/** "Priscila Domingues" → "Priscila D.": o nome inteiro no eixo rouba metade do gráfico. */
function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return partes.length < 2 ? nome : `${partes[0]} ${partes[partes.length - 1][0]}.`
}

function Cartao({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo: string
  children: ReactNode
}) {
  return (
    <div className="card p-5">
      <h3 className="text-[16px] font-semibold text-ink">{titulo}</h3>
      <p className="mt-0.5 text-[13px] text-muted">{subtitulo}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SemDados({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-[13px] text-muted">
      {mensagem}
    </div>
  )
}

export function GraficosGerencial({ atual }: { atual: Snapshot }) {
  const diaria = useMemo(() => serieDiaria(atual), [atual])
  const aderencia = useMemo(() => serieAderenciaPorExecutivo(atual), [atual])
  const reclamacoes = useMemo(() => serieReclamacoesPorTipo(atual), [atual])

  const totalReclamacoes = reclamacoes.reduce((a, r) => a + r.total, 0)
  const alturaBarras = Math.max(240, aderencia.length * 30 + 40)

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Pedidos e receita por dia"
        subtitulo="Volume e faturamento do recorte, dia a dia."
      >
        {atual.totalPedidos === 0 ? (
          <SemDados mensagem="Sem pedidos no recorte." />
        ) : (
          <ChartContainer altura={280} initialDimension={{ width: 900, height: 280 }}>
            <AreaChart data={diaria} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-pedidos" x1="0" y1="0" x2="0" y2="1">
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
              {/* O eixo de pedidos fica com o id padrão para o grid encontrar os ticks. */}
              <YAxis
                tickLine={false}
                axisLine={false}
                width={46}
                tickFormatter={(v: number) => fmtInt(v)}
              />
              <YAxis
                yAxisId="receita"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={62}
                tickFormatter={receitaCurta}
              />
              <ChartTooltip
                cursor={{ stroke: 'rgb(var(--stroke))', strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    formatarValor={(v, nome) => (nome === 'Receita' ? fmtMoeda(v) : fmtInt(v))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="pedidos"
                name="Pedidos"
                stroke={CORES_SERIE[0]}
                strokeWidth={2}
                fill="url(#grad-pedidos)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                yAxisId="receita"
                type="monotone"
                dataKey="receita"
                name="Receita"
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
          titulo="Aderência por executivo"
          subtitulo={`Dias aderentes sobre dias de promo. Meta de ${fmtPct(META_ADERENCIA, 0)}.`}
        >
          {aderencia.length === 0 ? (
            <SemDados mensagem="Nenhuma promo no recorte." />
          ) : (
            <ChartContainer
              altura={alturaBarras}
              indicator="square"
              initialDimension={{ width: 440, height: alturaBarras }}
            >
              <BarChart
                data={aderencia}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtPct(v, 0)}
                  tickMargin={8}
                />
                <YAxis
                  type="category"
                  dataKey="executivo"
                  tickLine={false}
                  axisLine={false}
                  width={104}
                  tickMargin={6}
                  tickFormatter={nomeCurto}
                />
                <ChartTooltip
                  cursor={{ fill: 'rgb(var(--hairline))' }}
                  content={
                    <ChartTooltipContent formatarValor={(v) => fmtPct(v)} />
                  }
                />
                <ReferenceLine x={META_ADERENCIA} stroke={CORES_SERIE[1]} strokeDasharray="4 4">
                  <Label value="meta 80%" position="insideTopRight" fill="rgb(var(--muted))" fontSize={11} />
                </ReferenceLine>
                <Bar dataKey="aderencia" name="Aderência" radius={[0, 4, 4, 0]} barSize={14}>
                  {/* A cor separa quem cumpriu a meta de quem não cumpriu — é o
                      que a gestora procura ao bater o olho no gráfico. */}
                  {aderencia.map((linha) => (
                    <Cell
                      key={linha.executivo}
                      fill={linha.aderencia >= META_ADERENCIA ? 'rgb(var(--ink))' : 'rgb(var(--rosa))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </Cartao>

        <Cartao
          titulo="Reclamações por tipo"
          subtitulo={
            totalReclamacoes === 0
              ? 'Nenhuma reclamação no recorte.'
              : `${fmtInt(totalReclamacoes)} reclamações registradas no período.`
          }
        >
          {totalReclamacoes === 0 ? (
            <SemDados mensagem="Nenhuma reclamação no recorte." />
          ) : (
            <ChartContainer
              altura={alturaBarras}
              initialDimension={{ width: 440, height: alturaBarras }}
            >
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent ocultarRotulo formatarValor={(v) => fmtInt(v)} />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Pie
                  data={reclamacoes}
                  dataKey="total"
                  nameKey="tipo"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {reclamacoes.map((r, i) => (
                    <Cell key={r.tipo} fill={CORES_SERIE[i % CORES_SERIE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </Cartao>
      </div>
    </div>
  )
}
