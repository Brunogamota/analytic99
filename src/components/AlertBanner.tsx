import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { Alerta } from '@/lib/queries'
import { cn } from '@/lib/format'
import { Vazio } from './ui'

function Detalhe({ alerta, onClose }: { alerta: Alerta; onClose: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(aberto) => !aberto && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[760px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-stroke bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-stroke px-5 py-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold text-ink">
                {alerta.titulo}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                {alerta.resumo}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-rosa/30">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="max-h-[58vh] overflow-y-auto">
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
  )
}

/**
 * Lista sóbria em vez de banners coloridos: a severidade cabe num ponto de
 * 6px, e o que a gestora compara entre as linhas é a contagem.
 */
export function ListaAlertas({ alertas }: { alertas: Alerta[] }) {
  const [aberto, setAberto] = useState<Alerta | null>(null)
  const criticos = alertas.filter((a) => a.severidade === 'critico').length

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">Alertas</h2>
          <span className="text-[12px] text-muted">
            {alertas.length === 0
              ? 'nenhum no recorte'
              : `${alertas.length} ${alertas.length === 1 ? 'tipo' : 'tipos'} · ${criticos} ${criticos === 1 ? 'crítico' : 'críticos'}`}
          </span>
        </div>

        {alertas.length === 0 ? (
          <Vazio
            titulo="Nenhum alerta neste recorte"
            dica="Amplie o período ou remova filtros de gerente e praça para inspecionar mais carteiras."
          />
        ) : (
          <ul>
            {alertas.map((a) => (
              <li
                key={a.chave}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-0"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    a.severidade === 'critico' ? 'bg-laranja' : 'bg-amarelo',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{a.titulo}</p>
                  <p className="truncate text-[12px] text-muted">{a.resumo}</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                  {a.linhas.length}
                </span>
                <button
                  type="button"
                  onClick={() => setAberto(a)}
                  className="shrink-0 text-[12px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  Ver
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aberto && <Detalhe alerta={aberto} onClose={() => setAberto(null)} />}
    </>
  )
}
