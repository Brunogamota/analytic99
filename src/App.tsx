import { lazy, Suspense, useMemo, useState } from 'react'
import { FilterBar } from '@/components/FilterBar'
import { PageHeader, type View } from '@/components/PageHeader'
import { Sidebar, type AbaId } from '@/components/Sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { PERIODO_PADRAO, periodoAnterior, rotuloPeriodo } from '@/lib/periodo'
import { snapshotsDoFiltro, type Filtros } from '@/lib/queries'
import { filtrosDoPerfil, PERFIL_GESTORA, type PerfilAtivo } from '@/lib/perfil'
import { SeletorPerfil } from '@/components/SeletorPerfil'
import { ToggleTema } from '@/components/ToggleTema'
import { Equipe } from '@/tabs/Equipe'
import { Integracoes } from '@/tabs/Integracoes'
import { PromoBanner } from '@/tabs/PromoBanner'
import { PromoSmart } from '@/tabs/PromoSmart'
import { PromoSpecial } from '@/tabs/PromoSpecial'
import { Sugestoes } from '@/tabs/Sugestoes'

const Importar = lazy(() => import('@/tabs/Importar').then((m) => ({ default: m.Importar })))
const Tarefas = lazy(() => import('@/tabs/Tarefas').then((m) => ({ default: m.Tarefas })))
const Relatorios = lazy(() => import('@/tabs/Relatorios').then((m) => ({ default: m.Relatorios })))
const Gerencial = lazy(() => import('@/tabs/Gerencial').then((m) => ({ default: m.Gerencial })))
const Times = lazy(() => import('@/tabs/Times').then((m) => ({ default: m.Times })))
const MinhaVisao = lazy(() => import('@/tabs/MinhaVisao').then((m) => ({ default: m.MinhaVisao })))
const FILTROS_PADRAO: Filtros = {
  periodo: PERIODO_PADRAO,
  gerentes: [],
  executivos: [],
  praca: null,
}

const TITULOS: Record<AbaId, string> = {
  gerencial: 'Performance do time',
  sugestoes: 'Sugestões',
  relatorios: 'Relatórios',
  smart: 'Promo Smart',
  banner: 'Promo Banner',
  special: 'Promo Special',
  times: 'Times',
  equipe: 'Equipe',
  tarefas: 'Tarefas',
  integracoes: 'Integrações',
  importar: 'Importar dados',
  minha_visao: 'Minha visão',
}

interface ViewSalva extends View {
  filtros: Filtros
}

export default function App() {
  const [aba, setAba] = useState<AbaId>('gerencial')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO)
  const [views, setViews] = useState<ViewSalva[]>([
    { id: 'padrao', nome: 'Padrão', filtros: FILTROS_PADRAO },
  ])
  const [viewAtiva, setViewAtiva] = useState('padrao')
  const [perfil, setPerfil] = useState<PerfilAtivo>(PERFIL_GESTORA)

  // Na visão emprestada o recorte é o da pessoa, e ela não sai dele pelo filtro.
  const filtrosEfetivos = useMemo(() => filtrosDoPerfil(perfil, filtros), [perfil, filtros])
  const { atual, anterior } = useMemo(() => snapshotsDoFiltro(filtrosEfetivos), [filtrosEfetivos])
  const comparacao = rotuloPeriodo(periodoAnterior(filtros.periodo))

  const subtitulo = `${rotuloPeriodo(filtros.periodo)} · ${atual.parceiros.length} parceiros no recorte`

  return (
    <SidebarProvider className="min-w-[1366px]">
      <Sidebar ativa={aba} onChange={setAba} />

      <SidebarInset>
        <div className="flex items-center justify-between px-8 pt-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <ToggleTema />
            <SeletorPerfil
            perfil={perfil}
            onTrocar={(p) => {
              setPerfil(p)
              setAba(p.tipo === 'executivo' ? 'minha_visao' : 'gerencial')
              }}
            />
          </div>
        </div>
        <div className="px-8 pb-6 pt-2">
          <PageHeader
            titulo={TITULOS[aba]}
            subtitulo={subtitulo}
            views={views}
            ativa={viewAtiva}
            onSelecionar={(id) => {
              const v = views.find((x) => x.id === id)
              if (!v) return
              setViewAtiva(id)
              setFiltros(v.filtros)
            }}
            onCriar={(nome) => {
              const id = `v${Date.now()}`
              setViews((vs) => [...vs, { id, nome, filtros }])
              setViewAtiva(id)
            }}
            onRemover={(id) => {
              setViews((vs) => vs.filter((v) => v.id !== id))
              if (viewAtiva === id) {
                setViewAtiva('padrao')
                setFiltros(FILTROS_PADRAO)
              }
            }}
          />

          <div className="mt-4">
            <FilterBar
              filtros={filtros}
              onChange={(f) => {
                setFiltros(f)
                // Mexer nos filtros sai da visão salva sem apagá-la.
                const v = views.find((x) => x.id === viewAtiva)
                if (v && JSON.stringify(v.filtros) !== JSON.stringify(f)) setViewAtiva('')
              }}
            />
          </div>

          <div className="mt-6 pb-10">
            <Suspense fallback={<p className="py-16 text-center text-[13px] text-muted">Carregando…</p>}>
            {aba === 'gerencial' && (
              <Gerencial atual={atual} anterior={anterior} comparacao={comparacao} />
            )}
            {aba === 'sugestoes' && <Sugestoes atual={atual} anterior={anterior} />}
            {aba === 'relatorios' && (
              <Relatorios atual={atual} anterior={anterior} comparacao={comparacao} />
            )}
            {aba === 'smart' && <PromoSmart atual={atual} />}
            {aba === 'banner' && <PromoBanner atual={atual} />}
            {aba === 'special' && <PromoSpecial atual={atual} />}
            {aba === 'times' && <Times atual={atual} />}
            {aba === 'equipe' && <Equipe filtros={filtros} />}
            {aba === 'tarefas' && <Tarefas />}
            {aba === 'integracoes' && <Integracoes />}
            {aba === 'importar' && <Importar />}
            {aba === 'minha_visao' && (
              <MinhaVisao atual={atual} anterior={anterior} perfil={perfil} />
            )}
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
