import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import type { Alerta } from '@/lib/queries'
import { cn } from '@/lib/format'

const ESTILO = {
  critico: {
    fundo: 'bg-[#FEF2F2]',
    borda: 'border-l-[3px] border-l-[#DC2626]',
    texto: 'text-[#991B1B]',
    icone: ShieldAlert,
  },
  atencao: {
    fundo: 'bg-[#FFFBEB]',
    borda: 'border-l-[3px] border-l-[#D97706]',
    texto: 'text-[#92400E]',
    icone: AlertTriangle,
  },
} as const

export function AlertBanner({ alerta }: { alerta: Alerta }) {
  const [aberto, setAberto] = useState(false)
  const e = ESTILO[alerta.severidade]
  const Icone = e.icone

  return (
    <>
      <div className={cn('flex items-start gap-3 rounded-r-md px-4 py-3', e.fundo, e.borda)}>
        <Icone className={cn('mt-0.5 h-4 w-4 shrink-0', e.texto)} strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className={cn('text-[13px] font-semibold', e.texto)}>{alerta.titulo}</p>
          <p className={cn('mt-0.5 text-[13px]', e.texto, 'opacity-80')}>{alerta.resumo}</p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={cn('shrink-0 text-[13px] font-medium underline underline-offset-2', e.texto)}
        >
          Ver todos ({alerta.linhas.length})
        </button>
      </div>

      <Dialog.Root open={aberto} onOpenChange={setAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[720px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-stroke bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-stroke px-5 py-4">
              <div>
                <Dialog.Title className="text-[16px] font-semibold text-ink">
                  {alerta.titulo}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                  {alerta.resumo}
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded p-1 text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-accent/30">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="max-h-[56vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-stroke">
                    <th className="label-track px-5 py-2 text-left">Parceiro</th>
                    <th className="label-track px-5 py-2 text-left">Executivo</th>
                    <th className="label-track px-5 py-2 text-left">Sinal</th>
                    <th className="label-track px-5 py-2 text-right">Evidência</th>
                  </tr>
                </thead>
                <tbody>
                  {alerta.linhas.map((l) => (
                    <tr key={l.id} className="border-b border-hairline last:border-0">
                      <td className="px-5 py-2.5 text-[13px] text-ink">
                        {l.parceiro ?? <span className="text-muted">— carteira inteira</span>}
                      </td>
                      <td className="px-5 py-2.5 text-[13px] text-ink">{l.executivo}</td>
                      <td className="px-5 py-2.5 text-[13px] text-muted">{l.detalhe}</td>
                      <td className="num px-5 py-2.5 text-[13px] font-medium text-ink">{l.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
