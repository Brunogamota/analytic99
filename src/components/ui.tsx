import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

/**
 * Rosa marca o que pede ação; o resto fica em cinza. "Verde" continua no
 * dicionário para não quebrar chamadas, mas é o preto do texto sobre cinza.
 */
const TONS = {
  verde: 'bg-hairline text-ink',
  laranja: 'bg-rosa-fundo text-rosa-escuro',
  amarelo: 'bg-amarelo-fundo text-rosa-escuro',
  rosa: 'bg-rosa-fundo text-rosa-escuro',
  cinza: 'bg-hairline text-muted',
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
export function Vazio({ titulo, dica, acao }: { titulo: string; dica?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-ink">{titulo}</p>
      {dica && <p className="mt-1 max-w-[380px] text-[13px] text-muted">{dica}</p>}
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  )
}

export function BotaoPrimario({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white outline-none transition-colors hover:bg-noite-claro disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function BotaoSecundario({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="chip">
      {children}
    </button>
  )
}
