import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/format'

export interface View {
  id: string
  nome: string
}

export function PageHeader({
  titulo,
  subtitulo,
  views,
  ativa,
  onSelecionar,
  onCriar,
  onRemover,
}: {
  titulo: string
  subtitulo: string
  views: View[]
  ativa: string
  onSelecionar: (id: string) => void
  onCriar: (nome: string) => void
  onRemover: (id: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-[28px] font-bold leading-9 tracking-[-0.02em] text-ink">{titulo}</h1>
        <p className="text-[13px] text-muted">{subtitulo}</p>
      </div>

      <div className="mt-4 flex items-center gap-5 border-b border-stroke">
        {views.map((v) => (
          <div key={v.id} className="group relative flex items-center">
            <button
              type="button"
              onClick={() => onSelecionar(v.id)}
              className={cn(
                'border-b-2 pb-2 text-[13px] transition-colors',
                ativa === v.id
                  ? 'border-ink font-medium text-ink'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {v.nome}
            </button>
            {v.id !== 'padrao' && (
              <button
                type="button"
                aria-label={`Remover visão ${v.nome}`}
                onClick={() => onRemover(v.id)}
                className="ml-1 hidden pb-2 text-muted hover:text-ink group-hover:block"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        <Popover.Root
          open={aberto}
          onOpenChange={(o) => {
            setAberto(o)
            if (!o) setNome('')
          }}
        >
          <Popover.Trigger className="flex items-center gap-1 pb-2 text-[13px] text-accent hover:underline">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Adicionar visão
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className="z-50 w-[280px] rounded-lg border border-stroke bg-white p-3 shadow-[0_2px_8px_rgba(17,24,39,0.08)]"
            >
              <p className="text-[13px] font-medium text-ink">Salvar recorte atual</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Os filtros de agora viram uma visão reaproveitável.
              </p>
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Nordeste sem banner"
                className="mt-2.5 h-8 w-full rounded-md border border-control px-2 text-[13px] text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={nome.trim().length === 0}
                onClick={() => {
                  onCriar(nome.trim())
                  setAberto(false)
                  setNome('')
                }}
                className="mt-2 h-8 w-full rounded-md bg-accent text-[13px] font-medium text-white disabled:opacity-40"
              >
                Salvar visão
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  )
}
