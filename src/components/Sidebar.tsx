import {
  FileText,
  Image,
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/format'
import { LogoEquipe } from './LogoEquipe'

export type AbaId =
  | 'gerencial'
  | 'sugestoes'
  | 'relatorios'
  | 'smart'
  | 'banner'
  | 'special'
  | 'equipe'

const SECOES: { titulo: string; itens: { id: AbaId; label: string; icone: typeof Tag }[] }[] = [
  {
    titulo: 'Performance',
    itens: [
      { id: 'gerencial', label: 'Gerencial', icone: LayoutDashboard },
      { id: 'sugestoes', label: 'Sugestões', icone: Lightbulb },
      { id: 'relatorios', label: 'Relatórios', icone: FileText },
    ],
  },
  {
    titulo: 'Promoções',
    itens: [
      { id: 'smart', label: 'Promo Smart', icone: Sparkles },
      { id: 'banner', label: 'Promo Banner', icone: Image },
      { id: 'special', label: 'Promo Special', icone: Tag },
    ],
  },
  {
    titulo: 'Time',
    itens: [{ id: 'equipe', label: 'Equipe', icone: Users }],
  },
]

export function Sidebar({ ativa, onChange }: { ativa: AbaId; onChange: (id: AbaId) => void }) {
  return (
    <nav className="flex w-[200px] shrink-0 flex-col bg-noite">
      <div className="flex h-[52px] items-center gap-2.5 px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amarelo">
          <span className="text-[13px] font-bold leading-none text-ink">99</span>
        </span>
        <span className="text-[14px] font-semibold text-white">Performance</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {SECOES.map((secao) => (
          <div key={secao.titulo} className="mt-4 first:mt-1">
            <p className="px-4 pb-1.5 text-micro font-semibold uppercase tracking-[0.06em] text-noite-texto">
              {secao.titulo}
            </p>
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
                          ? 'bg-noite-claro font-medium text-white'
                          : 'text-noite-texto hover:bg-noite-claro/60 hover:text-white',
                      )}
                    >
                      <Icone
                        className={cn(
                          'h-4 w-4 shrink-0',
                          selecionada ? 'text-amarelo' : 'text-noite-texto',
                        )}
                        strokeWidth={1.75}
                      />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t border-noite-claro px-4 py-3">
        <LogoEquipe tamanho={30} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-white">Barbie Village</p>
          <p className="truncate text-[11px] text-noite-texto">Equipe comercial</p>
        </div>
      </div>
    </nav>
  )
}
