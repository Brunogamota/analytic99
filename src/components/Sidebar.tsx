import {
  ChevronsUpDown,
  FileText,
  Image,
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react'
import {
  Sidebar as SidebarRaiz,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
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
    titulo: 'Análise',
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
  const { state } = useSidebar()
  const recolhida = state === 'collapsed'

  return (
    <SidebarRaiz>
      <SidebarHeader>
        <div className="flex h-9 items-center gap-2.5 px-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amarelo">
            <span className="text-[13px] font-bold leading-none text-ink">99</span>
          </span>
          {!recolhida && (
            <span className="truncate text-[15px] font-semibold text-ink">Performance</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {SECOES.map((secao) => (
          <SidebarGroup key={secao.titulo}>
            <SidebarGroupLabel>{secao.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secao.itens.map((item) => {
                  const Icone = item.icone
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={ativa === item.id}
                        tooltip={item.label}
                        onClick={() => onChange(item.id)}
                      >
                        <Icone strokeWidth={1.75} />
                        {!recolhida && <span>{item.label}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuButton size="lg" tooltip="Barbie Village" className="gap-2.5">
          <LogoEquipe tamanho={30} />
          {!recolhida && (
            <>
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="truncate text-[13px] font-semibold text-ink">Barbie Village</span>
                <span className="truncate text-[12px] text-muted">Equipe comercial</span>
              </span>
              <ChevronsUpDown className="text-muted" strokeWidth={1.75} />
            </>
          )}
        </SidebarMenuButton>
      </SidebarFooter>
    </SidebarRaiz>
  )
}
