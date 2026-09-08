import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Kpi } from '@/lib/queries'
import { cn } from '@/lib/format'

/**
 * Cartão sem preenchimento: fundo branco, borda fina e o número em preto.
 * O rosa entra só quando a métrica cruzou a meta — cor aqui significa
 * "olhe para mim", não "sou de outra categoria".
 */
export function KpiCard({ kpi, comparacao }: { kpi: Kpi; comparacao: string }) {
  const d = kpi.delta
  const Seta = d === null || d === 0 ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className="rounded-card border border-stroke bg-white px-5 py-4">
      <p className="text-[13px] text-muted">{kpi.label}</p>

      <p
        className={cn(
          'mt-2 text-[32px] font-semibold leading-10 tracking-[-0.03em] tabular-nums',
          kpi.alerta ? 'text-rosa' : 'text-ink',
        )}
      >
        {kpi.valor}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-[12px]">
        <Seta className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
        <span className="font-medium tabular-nums text-ink">{kpi.deltaLabel ?? '—'}</span>
        <span className="text-muted">vs. {comparacao}</span>
      </div>

      <p className={cn('mt-1 text-[12px]', kpi.alerta ? 'text-rosa' : 'text-muted')}>
        {kpi.contexto}
      </p>
    </div>
  )
}
