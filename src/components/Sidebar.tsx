import {
  ChevronsUpDown,
  FileText,
  GanttChartSquare,
  Image,
  LayoutDashboard,
  Plug,
  Lightbulb,
  Sparkles,
  Tag,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  UsersRound,
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
import { Avatar } from './ui/avatar'

export type AbaId =
  | 'gerencial'
  | 'sugestoes'
  | 'relatorios'
  | 'performance'
  | 'smart'
  | 'banner'
  | 'special'
  | 'times'
  | 'equipe'
  | 'tarefas'
  | 'minha_visao'
  | 'integracoes'
  | 'importar'

const SECOES: { titulo: string; itens: { id: AbaId; label: string; icone: typeof Tag }[] }[] = [
  {
    titulo: 'Análise',
    itens: [
      { id: 'gerencial', label: 'Gerencial', icone: LayoutDashboard },
      { id: 'sugestoes', label: 'Sugestões', icone: Lightbulb },
      { id: 'performance', label: 'Performance', icone: TrendingUp },
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
    itens: [
      { id: 'times', label: 'Times', icone: UsersRound },
      { id: 'equipe', label: 'Equipe', icone: Users },
      { id: 'tarefas', label: 'Tarefas', icone: GanttChartSquare },
      { id: 'minha_visao', label: 'Minha visão', icone: UserRound },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { id: 'importar', label: 'Importar dados', icone: Upload },
      { id: 'integracoes', label: 'Integrações', icone: Plug },
    ],
  },
]

export function Sidebar({ ativa, onChange }: { ativa: AbaId; onChange: (id: AbaId) => void }) {
  const { state } = useSidebar()
  const recolhida = state === 'collapsed'

  return (
    <SidebarRaiz>
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2.5 px-1.5">
          <LogoEquipe tamanho={32} />
          {!recolhida && (
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold leading-tight text-ink">
                Barbie Village
              </span>
              <span className="block truncate text-[11px] leading-tight text-muted">
                Performance 99
              </span>
            </span>
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
        <SidebarMenuButton size="lg" tooltip="Carolina Martinovic" className="gap-2.5">
          <Avatar nome="Carolina Martinovic" tamanho="md" status="online" />
          {!recolhida && (
            <>
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="truncate text-[13px] font-semibold text-ink">Carolina Martinovic</span>
                <span className="truncate text-[12px] text-muted">Gestora comercial</span>
              </span>
              <ChevronsUpDown className="text-muted" strokeWidth={1.75} />
            </>
          )}
        </SidebarMenuButton>
      </SidebarFooter>
    </SidebarRaiz>
  )
}
