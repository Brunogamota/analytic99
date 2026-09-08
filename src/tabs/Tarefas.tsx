import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { NovaTarefa } from '@/components/NovaTarefa'
import { Vazio } from '@/components/ui'
import {
  GanttCreateMarkerTrigger,
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttMarker,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  type GanttFeature,
  type Range,
} from '@/components/ui/gantt'
import { dataset } from '@/data/seed'
import { cn } from '@/lib/format'
import {
  FRENTES,
  HOJE_DATA,
  MARCADORES,
  STATUS,
  tarefasIniciais,
  type Marcador,
  type StatusTarefa,
  type Tarefa,
} from '@/lib/tarefas'

const ESCALAS: { id: Range; rotulo: string }[] = [
  { id: 'daily', rotulo: 'Diário' },
  { id: 'monthly', rotulo: 'Mensal' },
  { id: 'quarterly', rotulo: 'Trimestral' },
]

const ZOOMS = [75, 100, 150]

function paraFeature(tarefa: Tarefa): GanttFeature {
  return {
    id: tarefa.id,
    name: tarefa.nome,
    startAt: tarefa.inicio,
    endAt: tarefa.fim,
    status: { id: tarefa.status.id, name: tarefa.status.nome, color: tarefa.status.cor },
  }
}

/** Mover a barra pode atrasar ou destravar a tarefa: o status acompanha. */
function statusAposMover(atual: StatusTarefa, fim: Date): StatusTarefa {
  if (atual.id === 'concluida') return atual
  if (fim < HOJE_DATA) return STATUS.atrasada
  return atual.id === 'atrasada' ? STATUS.andamento : atual
}

const primeiroNome = (nome: string) => nome.split(' ')[0]

const RESPONSAVEIS = dataset.executivos.filter((e) => e.ativo).map((e) => e.nome)

export function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(() => tarefasIniciais())
  const [marcadores, setMarcadores] = useState<Marcador[]>(MARCADORES)
  const [escala, setEscala] = useState<Range>('monthly')
  const [zoom, setZoom] = useState(100)
  const [criando, setCriando] = useState(false)

  const grupos = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>()
    for (const tarefa of tarefas) {
      const lista = mapa.get(tarefa.grupo) ?? []
      lista.push(tarefa)
      mapa.set(tarefa.grupo, lista)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => +a.inicio - +b.inicio)
    return [...mapa.entries()]
  }, [tarefas])

  const atrasadas = tarefas.filter((t) => t.status.id === 'atrasada').length
  const concluidas = tarefas.filter((t) => t.status.id === 'concluida').length

  function mover(id: string, inicio: Date, fim: Date) {
    setTarefas((anteriores) =>
      anteriores.map((tarefa) =>
        tarefa.id === id
          ? { ...tarefa, inicio, fim, status: statusAposMover(tarefa.status, fim) }
          : tarefa,
      ),
    )
  }

  function remover(id: string) {
    setTarefas((anteriores) => anteriores.filter((tarefa) => tarefa.id !== id))
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <p className="text-[13px] text-muted">
          {tarefas.length} tarefas distribuídas · {atrasadas} atrasadas · {concluidas} concluídas.
        </p>
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-rosa px-4 text-[13px] font-medium text-white outline-none transition-colors hover:bg-rosa-escuro focus-visible:ring-2 focus-visible:ring-rosa/30"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nova tarefa
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ESCALAS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            className="chip"
            aria-pressed={escala === opcao.id}
            onClick={() => setEscala(opcao.id)}
          >
            {opcao.rotulo}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-stroke" />

        {ZOOMS.map((valor) => (
          <button
            key={valor}
            type="button"
            className="chip"
            aria-pressed={zoom === valor}
            onClick={() => setZoom(valor)}
          >
            {valor}%
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3">
          {Object.values(STATUS).map((status) => (
            <span key={status.id} className="flex items-center gap-1.5 text-[12px] text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: status.cor }}
              />
              {status.nome}
            </span>
          ))}
        </div>
      </div>

      <div className={cn('card overflow-hidden', tarefas.length > 0 && 'h-[560px]')}>
        {tarefas.length === 0 ? (
          <Vazio
            titulo="Nenhuma tarefa no quadro"
            dica="Todas as tarefas foram removidas. Recarregue a aba para voltar ao plano inicial do time."
          />
        ) : (
          <GanttProvider range={escala} zoom={zoom} hoje={HOJE_DATA}>
            <GanttSidebar>
              {grupos.map(([nome, lista]) => (
                <GanttSidebarGroup key={nome} name={nome}>
                  {lista.map((tarefa) => (
                    <GanttSidebarItem key={tarefa.id} feature={paraFeature(tarefa)} />
                  ))}
                </GanttSidebarGroup>
              ))}
            </GanttSidebar>

            <GanttTimeline>
              <GanttHeader />

              <GanttFeatureList>
                {grupos.map(([nome, lista]) => (
                  <GanttFeatureListGroup key={nome}>
                    {lista.map((tarefa) => (
                      <GanttFeatureItem
                        key={tarefa.id}
                        feature={paraFeature(tarefa)}
                        onMove={mover}
                        onRemove={remover}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: tarefa.status.cor }}
                        />
                        <span className="truncate">{tarefa.nome}</span>
                        {tarefa.responsavel && (
                          <span className="shrink-0 text-muted">
                            · {primeiroNome(tarefa.responsavel)}
                          </span>
                        )}
                      </GanttFeatureItem>
                    ))}
                  </GanttFeatureListGroup>
                ))}
              </GanttFeatureList>

              {marcadores.map((marcador) => (
                <GanttMarker
                  key={marcador.id}
                  id={marcador.id}
                  label={marcador.rotulo}
                  date={marcador.data}
                  onRemove={(id) =>
                    setMarcadores((anteriores) => anteriores.filter((m) => m.id !== id))
                  }
                />
              ))}

              {/* Depois dos marcadores: em cima de qualquer pílula que colida. */}
              <GanttToday date={HOJE_DATA} />

              <GanttCreateMarkerTrigger
                onCreateMarker={(data) =>
                  setMarcadores((anteriores) => [
                    ...anteriores,
                    { id: `M${anteriores.length + 1}-${+data}`, rotulo: 'Novo marco', data },
                  ])
                }
              />
            </GanttTimeline>
          </GanttProvider>
        )}
      </div>

      <NovaTarefa
        aberto={criando}
        onFechar={() => setCriando(false)}
        onCriar={(tarefa) => setTarefas((anteriores) => [...anteriores, tarefa])}
        responsaveis={RESPONSAVEIS}
        frentes={FRENTES}
      />
    </div>
  )
}
