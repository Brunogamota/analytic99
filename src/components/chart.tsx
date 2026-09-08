import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import type {
  DefaultLegendContentProps,
  TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/format'

/** Paleta 99 na ordem em que as séries devem consumir as cores. */
export const CORES_SERIE = ['#E31C79', '#111111', '#F286B7', '#A8125A', '#A3A3A3'] as const

const indicadorVariants = cva('shrink-0', {
  variants: {
    indicator: {
      dot: 'h-2.5 w-2.5 rounded-full',
      line: 'h-[3px] w-3.5 rounded-full',
      square: 'h-2.5 w-2.5 rounded-[3px]',
    },
    serie: {
      0: 'bg-rosa',
      1: 'bg-ink',
      2: 'bg-amarelo',
      3: 'bg-laranja',
      4: 'bg-muted',
    },
  },
  defaultVariants: { indicator: 'dot', serie: 0 },
})

type IndicadorVariants = VariantProps<typeof indicadorVariants>
export type ChartIndicator = NonNullable<IndicadorVariants['indicator']>
type SerieIndex = NonNullable<IndicadorVariants['serie']>

/** A paleta tem 5 cores; da sexta série em diante ela recomeça. */
const indiceDaSerie = (i: number): SerieIndex => (i % CORES_SERIE.length) as SerieIndex

interface ChartContextValue {
  indicator: ChartIndicator
  setIndicator: (i: ChartIndicator) => void
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function useChart(): ChartContextValue {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error('useChart só funciona dentro de um <ChartContainer />.')
  return ctx
}

export interface ChartContainerProps {
  children: React.ReactElement
  /** Altura em pixels — o ResponsiveContainer só resolve a largura sozinho. */
  altura?: number
  className?: string
  indicator?: ChartIndicator
  /** Sem isto o Recharts reclama no console enquanto mede o container. */
  initialDimension?: { width: number; height: number }
}

export function ChartContainer({
  children,
  altura = 260,
  className,
  indicator: indicadorInicial = 'dot',
  initialDimension = { width: 640, height: 260 },
}: ChartContainerProps) {
  const [indicator, setIndicator] = React.useState<ChartIndicator>(indicadorInicial)
  const valor = React.useMemo<ChartContextValue>(
    () => ({ indicator, setIndicator }),
    [indicator],
  )

  return (
    <ChartContext.Provider value={valor}>
      <div
        style={{ height: altura }}
        className={cn(
          'w-full',
          // O Recharts v3 desenha os rótulos de tick fora do grupo do eixo, então
          // a classe do próprio <text> é o único gancho estável.
          '[&_.recharts-cartesian-grid_line]:stroke-hairline',
          '[&_.recharts-cartesian-axis-line]:stroke-stroke',
          '[&_.recharts-cartesian-axis-tick-line]:stroke-stroke',
          '[&_.recharts-cartesian-axis-tick-value]:fill-muted',
          '[&_.recharts-cartesian-axis-tick-value]:text-[11px]',
          '[&_.recharts-polar-grid_line]:stroke-hairline',
          '[&_.recharts-sector]:outline-none',
          '[&_.recharts-surface]:outline-none',
          className,
        )}
      >
        <RechartsPrimitive.ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip

export type ChartTooltipContentProps = Partial<TooltipContentProps<ValueType, NameType>> & {
  className?: string
  ocultarRotulo?: boolean
  formatarRotulo?: (rotulo: string | number) => string
  formatarValor?: (valor: number, nome: string) => string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  ocultarRotulo = false,
  formatarRotulo,
  formatarValor,
}: ChartTooltipContentProps) {
  const { indicator } = useChart()
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      className={cn(
        'min-w-[164px] rounded-card border border-stroke bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(28,27,26,0.08)]',
        className,
      )}
    >
      {!ocultarRotulo && label !== undefined && label !== null && (
        <p className="mb-1.5 text-[12px] font-semibold text-ink">
          {formatarRotulo ? formatarRotulo(label) : String(label)}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((item, i) => {
          const nome = String(item.name ?? item.dataKey ?? '')
          const bruto = typeof item.value === 'number' ? item.value : Number(item.value)
          const texto =
            formatarValor && Number.isFinite(bruto)
              ? formatarValor(bruto, nome)
              : String(item.value ?? '—')
          const cor = item.color ?? item.payload?.fill ?? CORES_SERIE[i % CORES_SERIE.length]
          return (
            <li
              key={`${nome}-${i}`}
              className="flex items-center justify-between gap-4 text-[12px]"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={indicadorVariants({ indicator, serie: indiceDaSerie(i) })}
                  style={{ backgroundColor: cor }}
                />
                <span className="truncate text-muted">{nome}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{texto}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const ChartLegend = RechartsPrimitive.Legend

export type ChartLegendContentProps = Partial<DefaultLegendContentProps> & {
  className?: string
}

export function ChartLegendContent({ payload, className }: ChartLegendContentProps) {
  const { indicator } = useChart()
  if (!payload || payload.length === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3',
        className,
      )}
    >
      {payload.map((item, i) => (
        <span key={`${item.value ?? i}`} className="flex items-center gap-1.5 text-[12px] text-muted">
          <span
            className={indicadorVariants({ indicator, serie: indiceDaSerie(i) })}
            style={{ backgroundColor: item.color ?? CORES_SERIE[i % CORES_SERIE.length] }}
          />
          {item.value}
        </span>
      ))}
    </div>
  )
}
