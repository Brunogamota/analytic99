import { BarChart3, Image, LayoutDashboard, Sparkles, Tag } from 'lucide-react'
import { cn } from '@/lib/format'

export type AbaId = 'gerencial' | 'smart' | 'banner' | 'special'

const SECOES: { titulo: string; itens: { id: AbaId; label: string; icone: typeof Tag }[] }[] = [
  {
    titulo: 'Performance',
    itens: [{ id: 'gerencial', label: 'Gerencial', icone: LayoutDashboard }],
  },
  {
    titulo: 'Promoções',
    itens: [
      { id: 'smart', label: 'Promo Smart', icone: Sparkles },
      { id: 'banner', label: 'Promo Banner', icone: Image },
      { id: 'special', label: 'Promo Special', icone: Tag },
    ],
  },
]

export function Sidebar({ ativa, onChange }: { ativa: AbaId; onChange: (id: AbaId) => void }) {
  return (
    <nav className="flex w-[200px] shrink-0 flex-col border-r border-stroke bg-white">
      <div className="flex h-[52px] items-center gap-2 px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-ink">
          <BarChart3 className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-semibold text-ink">99 Performance</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {SECOES.map((secao) => (
          <div key={secao.titulo} className="mt-4 first:mt-1">
            <p className="label-track px-4 pb-1.5">{secao.titulo}</p>
            <ul className="px-2">
              {secao.itens.map((item) => {
                const Icone = item.icone
                const selecionada = ativa === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onChange(item.id)}
                      aria-current={selecionada ? 'page' : undefined}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                        selecionada
                          ? 'bg-hairline font-medium text-ink'
                          : 'text-[#374151] hover:bg-hairline/70',
                      )}
                    >
                      <Icone className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-stroke px-4 py-3">
        <p className="text-micro text-muted">Dados de seed · 3 meses</p>
      </div>
    </nav>
  )
}
