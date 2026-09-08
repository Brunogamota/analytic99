import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

const TONS = {
  verde: 'bg-[#ECFDF5] text-[#047857]',
  vermelho: 'bg-[#FEF2F2] text-[#B91C1C]',
  cinza: 'bg-hairline text-muted',
  ambar: 'bg-[#FFFBEB] text-[#B45309]',
  azul: 'bg-[#EFF6FF] text-[#1D4ED8]',
  roxo: 'bg-[#F5F3FF] text-accent',
} as const

export type Tom = keyof typeof TONS

export function Badge({ tom, children }: { tom: Tom; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-5',
        TONS[tom],
      )}
    >
      {children}
    </span>
  )
}

export function SecaoTitulo({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-[13px] text-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

/**
 * Estado vazio: o layout não colapsa quando o filtro não devolve nada — a
 * moldura continua e só o miolo explica o que fazer.
 */
export function Vazio({ titulo, dica }: { titulo: string; dica?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-ink">{titulo}</p>
      {dica && <p className="mt-1 max-w-[380px] text-[13px] text-muted">{dica}</p>}
    </div>
  )
}
