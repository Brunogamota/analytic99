import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tooltip from '@radix-ui/react-tooltip'
import { ChevronDown, Info } from 'lucide-react'
import {
  DIAS_SEMANA,
  HORAS_GRID,
  heatmap as calcularHeatmap,
  type MetricaHeatmap,
  type Snapshot,
} from '@/lib/queries'
import { cn, fmtDec, fmtInt, fmtMoeda } from '@/lib/format'

const METRICAS: { id: MetricaHeatmap; label: string; ajuda: string }[] = [
  {
    id: 'pedidos',
    label: 'Pedidos por dia',
    ajuda: 'Média de pedidos na faixa, dividida pelas ocorrências daquele dia da semana no período.',
  },
  {
    id: 'conversao',
    label: 'Conversão (pedidos/hora online)',
    ajuda: 'Pedidos divididos pelas horas online do mesmo dia da semana.',
  },
  {
    id: 'receita',
    label: 'Receita por dia',
    ajuda: 'Média de receita na faixa, dividida pelas ocorrências daquele dia da semana.',
  },
]

/**
 * Branco → amarelo 99 → laranja 99. Dois estágios porque o amarelo puro é
 * claro demais para marcar o topo da escala sozinho.
 */
function corDaCelula(intensidade: number): string {
  const t = Math.max(0, Math.min(1, intensidade))
  const [de, para, k] =
    t <= 0.5
      ? ([[255, 255, 255], [255, 221, 0], t / 0.5] as const)
      : ([[255, 221, 0], [252, 76, 2], (t - 0.5) / 0.5] as const)
  const canal = (i: number) => Math.round(de[i] + (para[i] - de[i]) * k)
  return `rgb(${canal(0)}, ${canal(1)}, ${canal(2)})`
}

function formatar(v: number, metrica: MetricaHeatmap): string {
  if (metrica === 'receita') return fmtMoeda(v)
  if (metrica === 'conversao') return fmtDec(v, 2)
  return fmtDec(v, 1)
}

function compacto(v: number, metrica: MetricaHeatmap): string {
  if (v === 0) return ''
  if (metrica === 'receita') return v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))
  if (metrica === 'conversao') return v.toFixed(1).replace('.', ',')
  return fmtInt(v)
}

export function Heatmap({
  snapshot,
  metrica,
  onMetricaChange,
}: {
  snapshot: Snapshot
  metrica: MetricaHeatmap
  onMetricaChange: (m: MetricaHeatmap) => void
}) {
  const { celulas, max, top } = calcularHeatmap(snapshot, metrica)
  const atual = METRICAS.find((m) => m.id === metrica) ?? METRICAS[0]

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[16px] font-semibold text-ink">Horários de maior movimento</h2>
          <Tooltip.Provider delayDuration={150}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button type="button" aria-label="Sobre esta métrica" className="text-muted">
                  <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-50 max-w-[260px] rounded-md bg-ink px-2.5 py-1.5 text-[12px] text-white"
                >
                  {atual.ajuda}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">0</span>
            <div
              className="h-2 w-24 rounded-sm"
              style={{ background: 'linear-gradient(to right, #FFFFFF, #F286B7, #E31C79)' }}
            />
            <span className="text-[11px] text-muted">{formatar(max, metrica)}</span>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="chip">
              <span className="text-muted">Métrica</span>
              <span className="font-medium text-ink">{atual.label}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[220px] rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(17,24,39,0.08)]"
              >
                {METRICAS.map((m) => (
                  <DropdownMenu.Item
                    key={m.id}
                    onSelect={() => onMetricaChange(m.id)}
                    className="cursor-pointer rounded px-2 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hairline"
                  >
                    {m.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="mt-5 flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex">
            <div className="w-12 shrink-0" />
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="flex-1 pb-1 text-center text-[11px] text-muted">
                {d}
              </div>
            ))}
          </div>

          {HORAS_GRID.map((hora, l) => (
            <div key={hora} className="flex items-center">
              <div className="w-12 shrink-0 pr-2 text-right text-[11px] text-muted">{hora}h</div>
              {DIAS_SEMANA.map((dia, c) => {
                const v = celulas[l][c]
                const intensidade = max === 0 ? 0 : v / max
                return (
                  <div key={dia} className="flex-1 p-[1px]">
                    <div
                      title={`${dia}, ${hora}h — ${formatar(v, metrica)}`}
                      style={{ backgroundColor: corDaCelula(intensidade) }}
                      className={cn(
                        'flex h-7 items-center justify-center rounded-[3px] text-[11px] font-medium tabular-nums',
                        intensidade > 0.82 ? 'text-white' : 'text-ink',
                        v === 0 && 'border border-hairline',
                      )}
                    >
                      {compacto(v, metrica)}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="w-[190px] shrink-0 border-l border-hairline pl-5">
          <p className="label-track pb-2">Top registros</p>
          {max === 0 ? (
            <p className="text-[13px] text-muted">Sem pedidos no recorte.</p>
          ) : (
            <ul className="space-y-2.5">
              {top.map((t) => (
                <li key={`${t.dia}-${t.hora}`}>
                  <p className="text-[13px] font-semibold text-ink">
                    {t.dia}, {t.hora}h
                  </p>
                  <p className="text-[12px] text-muted">{formatar(t.valor, metrica)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
