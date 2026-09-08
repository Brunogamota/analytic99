import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Kpi } from '@/lib/queries'
import { cn } from '@/lib/format'

/**
 * A cor não é decoração: as duas métricas de saúde mudam de tom conforme
 * cruzam a meta, e as de contagem ficam em tons neutros.
 */
function tomDoCard(kpi: Kpi): { fundo: string; label: string; valor: string } {
  if (kpi.chave === 'aderencia' || kpi.chave === 'budget') {
    return kpi.alerta
      ? { fundo: 'bg-laranja-fundo', label: 'text-laranja-escuro', valor: 'text-laranja-escuro' }
      : { fundo: 'bg-verde-fundo', label: 'text-verde', valor: 'text-verde' }
  }
  if (kpi.chave === 'promo') {
    return { fundo: 'bg-amarelo-fundo', label: 'text-[#8A6D00]', valor: 'text-ink' }
  }
  return { fundo: 'bg-hairline', label: 'text-muted', valor: 'text-ink' }
}

export function KpiCard({ kpi, comparacao }: { kpi: Kpi; comparacao: string }) {
  const d = kpi.delta
  const Seta = d === null || d === 0 ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight
  const tom = tomDoCard(kpi)

  return (
    <div className={cn('rounded-card px-5 py-4', tom.fundo)}>
      <p className={cn('label-track', tom.label)}>{kpi.label}</p>
      <p
        className={cn(
          'mt-2 text-[30px] font-bold leading-10 tracking-[-0.02em] tabular-nums',
          tom.valor,
        )}
      >
        {kpi.valor}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Seta className="h-3.5 w-3.5 text-ink/60" strokeWidth={2} />
        <span className="text-[12px] font-medium tabular-nums text-ink/80">
          {kpi.deltaLabel ?? '—'}
        </span>
        <span className="text-[12px] text-ink/50">vs. {comparacao}</span>
      </div>
      <p className="mt-2 text-[12px] text-ink/60">{kpi.contexto}</p>
    </div>
  )
}
