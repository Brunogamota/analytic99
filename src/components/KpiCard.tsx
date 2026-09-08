import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Kpi } from '@/lib/queries'
import { cn } from '@/lib/format'

export function KpiCard({ kpi, comparacao }: { kpi: Kpi; comparacao: string }) {
  const d = kpi.delta
  const Seta = d === null || d === 0 ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight
  const corDelta = d === null || d === 0 ? 'text-muted' : d > 0 ? 'text-[#047857]' : 'text-[#1D4ED8]'

  return (
    <div className="card px-5 py-4">
      <p className="text-[12px] text-muted">{kpi.label}</p>
      <p
        className={cn(
          'mt-1.5 text-[28px] font-bold leading-9 tracking-[-0.01em]',
          kpi.alerta ? 'text-[#DC2626]' : 'text-ink',
        )}
      >
        {kpi.valor}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        <Seta className={cn('h-3.5 w-3.5', corDelta)} strokeWidth={2} />
        <span className={cn('text-[12px] font-medium', corDelta)}>{kpi.deltaLabel ?? '—'}</span>
        <span className="text-[12px] text-muted">{comparacao}</span>
      </div>
      <p className={cn('mt-2 text-[12px]', kpi.alerta ? 'text-[#B91C1C]' : 'text-muted')}>
        {kpi.contexto}
      </p>
    </div>
  )
}
