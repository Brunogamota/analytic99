import { useMemo, useState } from 'react'
import { FilterBar } from '@/components/FilterBar'
import { PageHeader, type View } from '@/components/PageHeader'
import { Sidebar, type AbaId } from '@/components/Sidebar'
import { PERIODO_PADRAO, periodoAnterior, rotuloPeriodo } from '@/lib/periodo'
import { snapshotsDoFiltro, type Filtros } from '@/lib/queries'
import { Equipe } from '@/tabs/Equipe'
import { Gerencial } from '@/tabs/Gerencial'
import { PromoBanner } from '@/tabs/PromoBanner'
import { PromoSmart } from '@/tabs/PromoSmart'
import { PromoSpecial } from '@/tabs/PromoSpecial'
import { Relatorios } from '@/tabs/Relatorios'
import { Sugestoes } from '@/tabs/Sugestoes'

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
  equipe: 'Equipe',
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

  const { atual, anterior } = useMemo(() => snapshotsDoFiltro(filtros), [filtros])
  const comparacao = rotuloPeriodo(periodoAnterior(filtros.periodo))

  const subtitulo = `${rotuloPeriodo(filtros.periodo)} · ${atual.parceiros.length} parceiros no recorte`

  return (
    <div className="flex h-screen min-w-[1366px] overflow-hidden">
      <Sidebar ativa={aba} onChange={setAba} />

      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-6">
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
            {aba === 'equipe' && <Equipe filtros={filtros} />}
          </div>
        </div>
      </main>
    </div>
  )
}
