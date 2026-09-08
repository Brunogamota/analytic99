import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  DndContext,
  useDraggable,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { useMouse } from '@uidotdev/usehooks'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  formatDistance,
  getDate,
  getDaysInMonth,
  isSameDay,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { atom, useAtom } from 'jotai'
import throttle from 'lodash.throttle'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/format'

/**
 * Port do Gantt do roadmap-ui para este dashboard: sem Next.js, sem shadcn e
 * sem tokens de tema — as cores vêm do `tailwind.config.js` daqui e todas as
 * datas passam por `ptBR`.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Range = 'daily' | 'monthly' | 'quarterly'

export interface GanttStatus {
  id: string
  name: string
  color: string
}

export interface GanttFeature {
  id: string
  name: string
  startAt: Date
  endAt: Date
  status: GanttStatus
}

export type TimelineData = {
  year: number
  quarters: { months: { days: number }[] }[]
}[]

interface GanttContextValue {
  range: Range
  zoom: number
  larguraColuna: number
  larguraSidebar: number
  alturaCabecalho: number
  alturaLinha: number
  timelineData: TimelineData
  inicioTimeline: Date
  onAddItem?: (data: Date) => void
}

// ---------------------------------------------------------------------------
// Estado compartilhado (jotai): quem arrasta e onde está o scroll horizontal.
// Fica fora do contexto porque muda a cada frame e não deve rerenderizar tudo.
// ---------------------------------------------------------------------------

const arrastandoAtom = atom(false)
const scrollXAtom = atom(0)

export const useGanttDragging = () => useAtom(arrastandoAtom)
export const useGanttScrollX = () => useAtom(scrollXAtom)

// ---------------------------------------------------------------------------
// Medidas
// ---------------------------------------------------------------------------

const LARGURA_BASE: Record<Range, number> = { daily: 50, monthly: 150, quarterly: 100 }
const LARGURA_SIDEBAR = 300
const ALTURA_CABECALHO = 60
const ALTURA_LINHA = 36

const GanttCtx = createContext<GanttContextValue | null>(null)

function useGantt(): GanttContextValue {
  const ctx = useContext(GanttCtx)
  if (!ctx) throw new Error('Os componentes do Gantt precisam estar dentro de <GanttProvider>.')
  return ctx
}

/** No modo diário a coluna é um dia; nos outros dois, um mês. */
const unidade = (range: Range): 'dia' | 'mes' => (range === 'daily' ? 'dia' : 'mes')

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function criarAno(ano: number): TimelineData[number] {
  return {
    year: ano,
    quarters: Array.from({ length: 4 }, (_, q) => ({
      months: Array.from({ length: 3 }, (_, m) => ({
        days: getDaysInMonth(new Date(ano, q * 3 + m, 1)),
      })),
    })),
  }
}

function timelineInicial(hoje: Date): TimelineData {
  const ano = hoje.getFullYear()
  return [criarAno(ano - 1), criarAno(ano), criarAno(ano + 1)]
}

function mesesDoAno(ano: TimelineData[number]): { days: number }[] {
  return ano.quarters.flatMap((q) => q.months)
}

/** Posição da data em colunas (fracionária) a partir do começo da timeline. */
function colunaDaData(data: Date, inicio: Date, range: Range): number {
  if (unidade(range) === 'dia') return differenceInCalendarDays(data, inicio)
  const meses = differenceInCalendarMonths(data, inicio)
  return meses + (getDate(data) - 1) / getDaysInMonth(data)
}

function larguraColunaEfetiva(range: Range, zoom: number): number {
  return (LARGURA_BASE[range] * zoom) / 100
}

function offsetDaData(data: Date, ctx: GanttContextValue): number {
  return colunaDaData(data, ctx.inicioTimeline, ctx.range) * ctx.larguraColuna
}

/** A barra é inclusiva no último dia, por isso o fim vira "fim + 1 dia". */
function larguraDaBarra(inicio: Date, fim: Date, ctx: GanttContextValue): number {
  const a = colunaDaData(inicio, ctx.inicioTimeline, ctx.range)
  const b = colunaDaData(addDays(fim, 1), ctx.inicioTimeline, ctx.range)
  return Math.max((b - a) * ctx.larguraColuna, 18)
}

function pixelsPorDia(ctx: GanttContextValue, referencia: Date): number {
  return unidade(ctx.range) === 'dia'
    ? ctx.larguraColuna
    : ctx.larguraColuna / getDaysInMonth(referencia)
}

/** Inverso de `offsetDaData`: usado pelo trigger de marcador e pelas colunas. */
function dataDoOffset(px: number, ctx: GanttContextValue): Date {
  const colunas = px / ctx.larguraColuna
  if (unidade(ctx.range) === 'dia') return addDays(ctx.inicioTimeline, Math.floor(colunas))
  const mes = Math.floor(colunas)
  const base = addMonths(ctx.inicioTimeline, mes)
  const dia = Math.floor((colunas - mes) * getDaysInMonth(base))
  return addDays(base, dia)
}

function larguraDoAno(ano: TimelineData[number], ctx: { range: Range; larguraColuna: number }): number {
  if (unidade(ctx.range) === 'mes') return 12 * ctx.larguraColuna
  const dias = mesesDoAno(ano).reduce((soma, m) => soma + m.days, 0)
  return dias * ctx.larguraColuna
}

function larguraTotal(ctx: GanttContextValue): number {
  return ctx.timelineData.reduce((soma, ano) => soma + larguraDoAno(ano, ctx), 0)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface GanttProviderProps {
  range?: Range
  zoom?: number
  hoje?: Date
  onAddItem?: (data: Date) => void
  className?: string
  children: ReactNode
}

export function GanttProvider({
  range = 'monthly',
  zoom = 100,
  hoje,
  onAddItem,
  className,
  children,
}: GanttProviderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const ajustePendente = useRef(0)
  const centralizou = useRef(false)
  const [, setScrollX] = useGanttScrollX()
  const referencia = useMemo(() => hoje ?? new Date(), [hoje])
  const [timelineData, setTimelineData] = useState<TimelineData>(() => timelineInicial(referencia))

  const larguraColuna = larguraColunaEfetiva(range, zoom)
  const inicioTimeline = useMemo(
    () => new Date(timelineData[0].year, 0, 1),
    [timelineData],
  )

  const ctx = useMemo<GanttContextValue>(
    () => ({
      range,
      zoom,
      larguraColuna,
      larguraSidebar: LARGURA_SIDEBAR,
      alturaCabecalho: ALTURA_CABECALHO,
      alturaLinha: ALTURA_LINHA,
      timelineData,
      inicioTimeline,
      onAddItem,
    }),
    [range, zoom, larguraColuna, timelineData, inicioTimeline, onAddItem],
  )

  // Centraliza no "hoje" do produto assim que a timeline existe, e recentraliza
  // quando o range muda (a escala inteira muda de largura).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const alvo = colunaDaData(referencia, inicioTimeline, range) * larguraColuna
    el.scrollLeft = Math.max(0, alvo + LARGURA_SIDEBAR - el.clientWidth / 2)
    centralizou.current = true
    // A recentralização é intencional a cada troca de escala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, zoom])

  // Depois de prefixar um ano, o conteúdo inteiro desloca: repõe o scroll para
  // que a tela não pule (e para não disparar a extensão de novo).
  useLayoutEffect(() => {
    if (ajustePendente.current && scrollRef.current) {
      scrollRef.current.scrollLeft += ajustePendente.current
      ajustePendente.current = 0
    }
  }, [timelineData])

  const aoRolar = useMemo(
    () =>
      throttle(() => {
        const el = scrollRef.current
        if (!el || !centralizou.current) return
        setScrollX(el.scrollLeft)
        const limite = larguraColuna * 2
        if (el.scrollLeft < limite) {
          setTimelineData((anterior) => {
            const novo = criarAno(anterior[0].year - 1)
            ajustePendente.current = larguraDoAno(novo, { range, larguraColuna })
            return [novo, ...anterior]
          })
          return
        }
        if (el.scrollWidth - el.clientWidth - el.scrollLeft < limite) {
          setTimelineData((anterior) => [
            ...anterior,
            criarAno(anterior[anterior.length - 1].year + 1),
          ])
        }
      }, 120),
    [larguraColuna, range, setScrollX],
  )

  useEffect(() => () => aoRolar.cancel(), [aoRolar])

  const vars = {
    '--gantt-column-width': `${larguraColuna}px`,
    '--gantt-header-height': `${ALTURA_CABECALHO}px`,
    '--gantt-row-height': `${ALTURA_LINHA}px`,
    '--gantt-sidebar-width': `${LARGURA_SIDEBAR}px`,
    gridTemplateColumns: 'var(--gantt-sidebar-width) max-content',
  } as CSSProperties

  return (
    <GanttCtx.Provider value={ctx}>
      <div
        ref={scrollRef}
        onScroll={aoRolar}
        style={vars}
        className={cn(
          'relative grid h-full w-full flex-none select-none overflow-auto bg-areia-barra',
          className,
        )}
      >
        {children}
      </div>
    </GanttCtx.Provider>
  )
}

// ---------------------------------------------------------------------------
// Cabeçalho e colunas
// ---------------------------------------------------------------------------

export function GanttContentHeader({
  title,
  columns,
  renderHeaderItem,
}: {
  title: string
  columns: number
  renderHeaderItem: (indice: number) => ReactNode
}) {
  const id = useId()
  return (
    <div
      className="sticky top-0 z-20 flex w-full shrink-0 flex-col bg-areia-barra/95 backdrop-blur"
      style={{ height: 'var(--gantt-header-height)' }}
    >
      <div className="flex flex-1 items-center">
        <p
          className="label-track sticky inline-flex whitespace-nowrap px-3"
          style={{ left: 'var(--gantt-sidebar-width)' }}
        >
          {title}
        </p>
      </div>
      <div
        className="grid w-full border-b border-stroke"
        style={{ gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))` }}
      >
        {Array.from({ length: columns }).map((_, indice) => (
          <div key={`${id}-${indice}`} className="shrink-0 pb-1 text-center text-[11px] text-muted">
            {renderHeaderItem(indice)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function GanttColumns({
  columns,
  dataDaColuna,
  colunaSecundaria,
  className,
}: {
  columns: number
  dataDaColuna?: (indice: number) => Date
  colunaSecundaria?: (indice: number) => boolean
  className?: string
}) {
  const gantt = useGantt()
  const id = useId()
  return (
    <div
      className={cn('grid flex-1 divide-x divide-hairline', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))` }}
    >
      {Array.from({ length: columns }).map((_, indice) => (
        <div
          key={`${id}-${indice}`}
          className={cn(
            'group relative h-full',
            colunaSecundaria?.(indice) ? 'bg-hairline/70' : '',
          )}
        >
          {gantt.onAddItem && dataDaColuna ? (
            <button
              type="button"
              aria-label="Adicionar tarefa"
              onClick={() => gantt.onAddItem?.(dataDaColuna(indice))}
              className="absolute left-1/2 top-1 hidden h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-stroke bg-superficie text-muted group-hover:flex"
            >
              <Plus size={12} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function GanttHeader({ className }: { className?: string }) {
  const gantt = useGantt()

  if (gantt.range === 'daily') {
    return (
      <div className={cn('absolute inset-0 flex h-full', className)}>
        {gantt.timelineData.map((ano) =>
          mesesDoAno(ano).map((mes, indice) => {
            const primeiro = new Date(ano.year, indice, 1)
            return (
              <div key={`${ano.year}-${indice}`} className="relative flex h-full flex-col">
                <GanttContentHeader
                  title={capitalizar(format(primeiro, 'MMMM yyyy', { locale: ptBR }))}
                  columns={mes.days}
                  renderHeaderItem={(item) => {
                    const dia = addDays(primeiro, item)
                    return (
                      <span className="flex items-center justify-center gap-1">
                        <span className="text-ink">{format(dia, 'd', { locale: ptBR })}</span>
                        <span>{format(dia, 'EEEEEE', { locale: ptBR })}</span>
                      </span>
                    )
                  }}
                />
                <GanttColumns
                  columns={mes.days}
                  dataDaColuna={(item) => addDays(primeiro, item)}
                  colunaSecundaria={(item) => [0, 6].includes(addDays(primeiro, item).getDay())}
                />
              </div>
            )
          }),
        )}
      </div>
    )
  }

  if (gantt.range === 'quarterly') {
    return (
      <div className={cn('absolute inset-0 flex h-full', className)}>
        {gantt.timelineData.map((ano) =>
          ano.quarters.map((trimestre, t) => (
            <div key={`${ano.year}-T${t}`} className="relative flex h-full flex-col">
              <GanttContentHeader
                title={`T${t + 1} ${ano.year}`}
                columns={trimestre.months.length}
                renderHeaderItem={(item) => (
                  <span className="text-ink">
                    {capitalizar(format(new Date(ano.year, t * 3 + item, 1), 'MMM', { locale: ptBR }))}
                  </span>
                )}
              />
              <GanttColumns
                columns={trimestre.months.length}
                dataDaColuna={(item) => new Date(ano.year, t * 3 + item, 1)}
                colunaSecundaria={() => t % 2 === 1}
              />
            </div>
          )),
        )}
      </div>
    )
  }

  return (
    <div className={cn('absolute inset-0 flex h-full', className)}>
      {gantt.timelineData.map((ano) => (
        <div key={ano.year} className="relative flex h-full flex-col">
          <GanttContentHeader
            title={`${ano.year}`}
            columns={12}
            renderHeaderItem={(item) => (
              <span className="text-ink">
                {capitalizar(format(new Date(ano.year, item, 1), 'MMM', { locale: ptBR }))}
              </span>
            )}
          />
          <GanttColumns
            columns={12}
            dataDaColuna={(item) => new Date(ano.year, item, 1)}
            colunaSecundaria={(item) => item % 2 === 1}
          />
        </div>
      ))}
    </div>
  )
}

export function GanttTimeline({ className, children }: { className?: string; children: ReactNode }) {
  const gantt = useGantt()
  // A largura precisa ser explícita: o cabeçalho e as colunas são uma camada
  // absoluta (para cobrirem toda a altura das linhas) e não medem o conteúdo.
  return (
    <div
      className={cn('relative flex h-max min-h-full flex-none flex-col', className)}
      style={{ width: larguraTotal(gantt) }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function GanttSidebar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'sticky left-0 z-30 h-max min-h-full border-r border-stroke bg-superficie/95 backdrop-blur',
        className,
      )}
    >
      <div
        className="sticky top-0 z-10 flex shrink-0 items-end justify-between gap-2.5 border-b border-stroke bg-superficie/95 p-2.5 backdrop-blur"
        style={{ height: 'var(--gantt-header-height)' }}
      >
        <p className="label-track flex-1 truncate text-left">Tarefa</p>
        <p className="label-track shrink-0">Duração</p>
      </div>
      <div className="space-y-4 pb-4">{children}</div>
    </div>
  )
}

export function GanttSidebarGroup({
  name,
  className,
  children,
}: {
  name: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <p
        className="label-track flex w-full items-center truncate px-2.5"
        style={{ height: 'var(--gantt-row-height)' }}
      >
        {name}
      </p>
      <div className="divide-y divide-hairline">{children}</div>
    </div>
  )
}

export function GanttSidebarItem({
  feature,
  onSelectItem,
  className,
}: {
  feature: GanttFeature
  onSelectItem?: (id: string) => void
  className?: string
}) {
  // Uma tarefa de um dia só teria duração "menos de um minuto": conta o dia.
  const fim = isSameDay(feature.startAt, feature.endAt) ? addDays(feature.endAt, 1) : feature.endAt
  const duracao = formatDistance(feature.startAt, fim, { locale: ptBR })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectItem?.(feature.id)}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') onSelectItem?.(feature.id)
      }}
      className={cn(
        'relative flex items-center gap-2.5 px-2.5 text-[13px] outline-none hover:bg-hairline',
        className,
      )}
      style={{ height: 'var(--gantt-row-height)' }}
    >
      <span
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: feature.status.color }}
      />
      <p className="pointer-events-none flex-1 truncate text-left text-ink">{feature.name}</p>
      <p className="pointer-events-none shrink-0 text-[11px] text-muted">{duracao}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Barras
// ---------------------------------------------------------------------------

export function GanttFeatureList({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn('relative z-10 w-max space-y-4 pb-4', className)}
      style={{ marginTop: 'var(--gantt-header-height)' }}
    >
      {children}
    </div>
  )
}

export function GanttFeatureListGroup({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      {/* Espelha a linha de título do grupo na sidebar para não desalinhar. */}
      <div style={{ height: 'var(--gantt-row-height)' }} />
      {children}
    </div>
  )
}

function AlcaDeArraste({
  featureId,
  lado,
}: {
  featureId: string
  lado: 'inicio' | 'fim'
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `${featureId}-${lado}` })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'absolute top-0 z-20 h-full w-2 cursor-ew-resize',
        lado === 'inicio' ? '-left-1' : '-right-1',
      )}
    />
  )
}

export interface GanttFeatureItemProps {
  feature: GanttFeature
  onMove?: (id: string, inicio: Date, fim: Date) => void
  onRemove?: (id: string) => void
  className?: string
  children?: ReactNode
}

export function GanttFeatureItem({
  feature,
  onMove,
  onRemove,
  className,
  children,
}: GanttFeatureItemProps) {
  const gantt = useGantt()
  const [, setArrastando] = useGanttDragging()
  const [delta, setDelta] = useState({ inicio: 0, fim: 0 })

  const offset = offsetDaData(feature.startAt, gantt)
  const largura = larguraDaBarra(feature.startAt, feature.endAt, gantt)
  const duracaoEmDias = differenceInCalendarDays(feature.endAt, feature.startAt)

  const arrastando = delta.inicio !== 0 || delta.fim !== 0
  const previaInicio = addDays(feature.startAt, delta.inicio)
  const previaFim = addDays(feature.endAt, delta.fim)

  const diasDoEvento = (evento: DragMoveEvent | DragEndEvent) =>
    Math.round(evento.delta.x / pixelsPorDia(gantt, feature.startAt))

  const aplicar = (evento: DragMoveEvent | DragEndEvent) => {
    const dias = diasDoEvento(evento)
    const alvo = String(evento.active.id)
    if (alvo.endsWith('-inicio')) return { inicio: Math.min(dias, duracaoEmDias), fim: 0 }
    if (alvo.endsWith('-fim')) return { inicio: 0, fim: Math.max(dias, -duracaoEmDias) }
    return { inicio: dias, fim: dias }
  }

  const barra = (
    <div
      className={cn(
        'flex h-full w-full items-center gap-1.5 overflow-hidden rounded-md border border-stroke px-2 text-[12px] text-ink',
        className,
      )}
      style={{ backgroundColor: `${feature.status.color}22` }}
    >
      {children ?? (
        <>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: feature.status.color }}
          />
          <span className="truncate">{feature.name}</span>
        </>
      )}
    </div>
  )

  return (
    <DndContext
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={() => setArrastando(true)}
      onDragMove={(evento) => setDelta(aplicar(evento))}
      onDragCancel={() => {
        setArrastando(false)
        setDelta({ inicio: 0, fim: 0 })
      }}
      onDragEnd={(evento) => {
        setArrastando(false)
        const proximo = aplicar(evento)
        setDelta({ inicio: 0, fim: 0 })
        if (!proximo.inicio && !proximo.fim) return
        onMove?.(
          feature.id,
          addDays(feature.startAt, proximo.inicio),
          addDays(feature.endAt, proximo.fim),
        )
      }}
    >
      <div className="relative flex w-max py-1" style={{ height: 'var(--gantt-row-height)' }}>
        <div
          className="absolute top-1"
          style={{
            left: offset,
            width: largura,
            height: 'calc(var(--gantt-row-height) - 8px)',
          }}
        >
          <BarraArrastavel feature={feature} onRemove={onRemove}>
            {barra}
          </BarraArrastavel>
        </div>

        {/* A prévia é um irmão da barra: mexer na barra durante o arrasto faria
            o dnd-kit remedir o nó e descontar o próprio movimento do delta. */}
        {arrastando && (
          <div
            className="pointer-events-none absolute top-1 flex items-center justify-center rounded-md border border-dashed border-control bg-superficie/70 text-[11px] text-muted"
            style={{
              left: offsetDaData(previaInicio, gantt),
              width: larguraDaBarra(previaInicio, previaFim, gantt),
              height: 'calc(var(--gantt-row-height) - 8px)',
            }}
          >
            <span className="truncate px-1">
              {format(previaInicio, 'd MMM', { locale: ptBR })} –{' '}
              {format(previaFim, 'd MMM', { locale: ptBR })}
            </span>
          </div>
        )}
      </div>
    </DndContext>
  )
}

/** Precisa ser filho do DndContext, por isso está separado do item. */
function BarraArrastavel({
  feature,
  onRemove,
  children,
}: {
  feature: GanttFeature
  onRemove?: (id: string) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `${feature.id}-barra` })
  return (
    <div className="relative h-full w-full">
      <AlcaDeArraste featureId={feature.id} lado="inicio" />
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className="h-full w-full cursor-grab outline-none active:cursor-grabbing"
          >
            {children}
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className="z-50 min-w-[180px] rounded-card border border-stroke bg-superficie p-1 text-[13px] text-ink shadow-sm">
            <ContextMenu.Item
              disabled={!onRemove}
              onSelect={() => onRemove?.(feature.id)}
              className="flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-laranja-escuro outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-laranja-fundo"
            >
              <Trash2 size={14} />
              Remover tarefa
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <AlcaDeArraste featureId={feature.id} lado="fim" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Marcadores
// ---------------------------------------------------------------------------

export function GanttMarker({
  id,
  label,
  date,
  cor = 'rgb(var(--muted))',
  onRemove,
  className,
}: {
  id?: string
  label: string
  date: Date
  cor?: string
  onRemove?: (id: string) => void
  className?: string
}) {
  const gantt = useGantt()
  const offset = offsetDaData(date, gantt)

  return (
    <div
      className="pointer-events-none absolute top-0 z-20 flex h-full select-none flex-col items-center"
      style={{ left: offset, width: 0 }}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            className={cn(
              'group pointer-events-auto sticky top-0 z-20 flex flex-col items-center whitespace-nowrap rounded-b-md border border-t-0 border-stroke bg-superficie px-2 py-1 text-[11px] text-ink',
              className,
            )}
          >
            {label}
            {/* Absoluto de propósito: a data não pode alargar a pílula e cobrir
                os marcadores vizinhos. */}
            <span className="pointer-events-none absolute left-1/2 top-full hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-stroke bg-superficie px-1.5 py-0.5 text-[11px] font-normal text-muted group-hover:block">
              {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className="z-50 min-w-[180px] rounded-card border border-stroke bg-superficie p-1 text-[13px] text-ink shadow-sm">
            <ContextMenu.Item
              disabled={!onRemove || !id}
              onSelect={() => (id ? onRemove?.(id) : undefined)}
              className="flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-laranja-escuro outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-laranja-fundo"
            >
              <Trash2 size={14} />
              Remover marcador
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <div className="w-px flex-1" style={{ backgroundColor: cor }} />
    </div>
  )
}

export function GanttToday({ date, className }: { date?: Date; className?: string }) {
  const [hoje] = useState(() => date ?? new Date())
  return (
    <GanttMarker
      label="Hoje"
      date={hoje}
      cor="rgb(var(--rosa))"
      // Sem trocar o fundo: o `bg-superficie` da pílula base venceria por ordem de CSS.
      className={cn('border-laranja font-medium text-laranja-escuro', className)}
    />
  )
}

export function GanttCreateMarkerTrigger({
  onCreateMarker,
  className,
}: {
  onCreateMarker: (data: Date) => void
  className?: string
}) {
  const gantt = useGantt()
  const [mouse, ref] = useMouse<HTMLDivElement>()

  // O mouse já rerenderiza a cada movimento; ler a caixa aqui mantém a
  // visibilidade correta mesmo com a timeline crescendo durante o scroll.
  const caixa = ref.current?.getBoundingClientRect()
  const dentro =
    !!caixa &&
    mouse.elementX > 0 &&
    mouse.elementX < caixa.width &&
    mouse.elementY > gantt.alturaCabecalho &&
    mouse.elementY < caixa.height

  const data = startOfDay(dataDoOffset(Math.max(mouse.elementX, 0), gantt))
  const offset = offsetDaData(data, gantt)

  return (
    <div ref={ref} className={cn('pointer-events-none absolute inset-0 z-30 overflow-visible', className)}>
      {dentro && (
        <div
          className="absolute top-0 flex h-full flex-col items-center"
          style={{ left: offset, width: 0 }}
        >
          <button
            type="button"
            title={`Criar marcador em ${format(data, "d 'de' MMM", { locale: ptBR })}`}
            onClick={() => onCreateMarker(data)}
            className="pointer-events-auto sticky top-0 z-30 inline-flex h-5 w-5 items-center justify-center rounded-full border border-stroke bg-superficie text-muted"
          >
            <Plus size={12} />
          </button>
          <div className="w-px flex-1 bg-control" />
        </div>
      )}
    </div>
  )
}
