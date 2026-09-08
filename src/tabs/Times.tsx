import { useMemo, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/chart'
import { DataTable, type Coluna } from '@/components/DataTable'
import { Badge, BotaoPrimario, BotaoSecundario, Vazio, type Tom } from '@/components/ui'
import { cn, fmtInt, fmtMoeda, fmtPct } from '@/lib/format'
import {
  equipeInicial,
  listarPermissoes,
  PERMISSOES,
  ROTULO_PAPEL,
  type Membro,
  type Papel,
} from '@/lib/equipe'
import { deslocar, podeAvancar, rotuloPeriodo, type Periodo } from '@/lib/periodo'
import { snapshot, type Severidade, type Snapshot } from '@/lib/queries'
import {
  alertasDoTime,
  CORES_TIME,
  corTexto,
  executivosDoMembro,
  executivosDoTime,
  handleDe,
  iniciais,
  metricasTime,
  timesIniciais,
  totalAlertas,
  type Time,
} from '@/lib/times'

type AbaTime = 'visao' | 'analytics' | 'membros' | 'prioridades'

const ABAS: { id: AbaTime; rotulo: string }[] = [
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'analytics', rotulo: 'Analytics' },
  { id: 'membros', rotulo: 'Membros' },
  { id: 'prioridades', rotulo: 'Prioridades' },
]

type Ordenacao = 'ativos' | 'aderencia' | 'nome'

const ORDENACOES: { id: Ordenacao; rotulo: string }[] = [
  { id: 'ativos', rotulo: 'Mais parceiros ativos' },
  { id: 'aderencia', rotulo: 'Maior aderência' },
  { id: 'nome', rotulo: 'Nome (A–Z)' },
]

const TOM_PAPEL: Record<Papel, Tom> = {
  gerente: 'rosa',
  executivo: 'amarelo',
  analista: 'cinza',
}

const TOM_SEVERIDADE: Record<Severidade, Tom> = {
  critico: 'laranja',
  atencao: 'amarelo',
}

const campoClasses =
  'h-9 w-full rounded-md border border-control bg-white px-2.5 text-[13px] text-ink outline-none focus:border-rosa'

const menuClasses =
  'z-50 min-w-[200px] rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(28,27,26,0.08)]'

const itemClasses =
  'flex cursor-pointer select-none items-center justify-between gap-3 rounded px-2 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hairline'

/** "Priscila Domingues" → "Priscila D.": o nome inteiro rouba metade do gráfico. */
function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return partes.length < 2 ? nome : `${partes[0]} ${partes[partes.length - 1][0]}.`
}

function AvatarTime({
  cor,
  nome,
  className,
}: {
  cor: string
  nome: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-card text-[11px] font-semibold',
        className ?? 'h-6 w-6',
      )}
      style={{ backgroundColor: cor, color: corTexto(cor) }}
    >
      {iniciais(nome)}
    </span>
  )
}

function AvatarMembro({ nome }: { nome: string }) {
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hairline text-[11px] font-semibold text-muted">
      {iniciais(nome)}
    </span>
  )
}

function Cartao({ label, valor, contexto }: { label: string; valor: string; contexto: string }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="label-track">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold leading-none tabular-nums text-ink">{valor}</p>
      <p className="mt-1.5 text-[12px] text-muted">{contexto}</p>
    </div>
  )
}

function Moldura({
  titulo,
  descricao,
  onFechar,
  children,
}: {
  titulo: string
  descricao: string
  onFechar: () => void
  children: ReactNode
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[84vh] w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-stroke bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-stroke px-5 py-4">
          <div className="min-w-0">
            <Dialog.Title className="text-[16px] font-semibold text-ink">{titulo}</Dialog.Title>
            <Dialog.Description className="mt-0.5 text-[13px] text-muted">
              {descricao}
            </Dialog.Description>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
            className="rounded p-1 text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-rosa/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  )
}

function DialogCriar({
  aberto,
  onOpenChange,
  onCriar,
}: {
  aberto: boolean
  onOpenChange: (v: boolean) => void
  onCriar: (t: Omit<Time, 'id' | 'membros'>) => void
}) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cor, setCor] = useState(CORES_TIME[0])
  const [menuCor, setMenuCor] = useState(false)

  const fechar = () => {
    onOpenChange(false)
    setNome('')
    setDescricao('')
    setCor(CORES_TIME[0])
  }

  const valido = nome.trim().length > 1

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => (v ? onOpenChange(true) : fechar())}>
      <Moldura
        titulo="Criar time"
        descricao="Use times para agrupar pessoas que você atribui a tarefas e acompanha junto."
        onFechar={fechar}
      >
        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="label-track mb-1.5">Ícone e nome</p>
            <div className="flex items-center gap-2">
              <DropdownMenu.Root open={menuCor} onOpenChange={setMenuCor}>
                <DropdownMenu.Trigger
                  aria-label="Escolher cor do time"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-control bg-white px-1.5 outline-none hover:bg-hairline"
                >
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-card text-[11px] font-semibold"
                    style={{ backgroundColor: cor, color: corTexto(cor) }}
                  >
                    {nome.trim() ? iniciais(nome) : '99'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
                    <p className="px-2 py-1.5 text-[12px] text-muted">Cor do time</p>
                    <div className="flex gap-1.5 px-2 pb-2 pt-0.5">
                      {CORES_TIME.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Cor ${c}`}
                          onClick={() => {
                            setCor(c)
                            setMenuCor(false)
                          }}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-card border',
                            c === cor ? 'border-ink' : 'border-transparent',
                          )}
                          style={{ backgroundColor: c }}
                        >
                          {c === cor && (
                            <Check
                              className="h-3.5 w-3.5"
                              style={{ color: corTexto(c) }}
                              strokeWidth={2.5}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Comercial São Paulo"
                aria-label="Nome do time"
                className={campoClasses}
              />
            </div>
            <p className="mt-1 text-[12px] text-muted">
              {valido ? `Handle do time: @${handleDe(nome)}` : 'O handle sai do nome, sem acento.'}
            </p>
          </div>

          <div>
            <label className="label-track mb-1.5 block" htmlFor="time-descricao">
              Descrição (opcional)
            </label>
            <textarea
              id="time-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Para que serve este time e o que ele acompanha."
              className="w-full resize-none rounded-md border border-control bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-rosa"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stroke px-5 py-3">
          <BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario
            disabled={!valido}
            onClick={() => {
              onCriar({
                nome: nome.trim(),
                handle: handleDe(nome),
                descricao: descricao.trim(),
                cor,
              })
              fechar()
            }}
          >
            Criar time
          </BotaoPrimario>
        </div>
      </Moldura>
    </Dialog.Root>
  )
}

function DialogAdicionar({
  time,
  equipe,
  onFechar,
  onAdicionar,
}: {
  time: Time
  equipe: Membro[]
  onFechar: () => void
  onAdicionar: (ids: string[]) => void
}) {
  const [termo, setTermo] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])

  const fora = equipe.filter((m) => !time.membros.includes(m.id))
  const busca = termo.trim().toLowerCase()
  const visiveis = busca
    ? fora.filter((m) =>
        `${m.nome} ${m.email} ${ROTULO_PAPEL[m.papel]} ${m.pracas.join(' ')}`
          .toLowerCase()
          .includes(busca),
      )
    : fora

  const alternar = (id: string) =>
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )

  return (
    <Dialog.Root open onOpenChange={(aberto) => !aberto && onFechar()}>
      <Moldura
        titulo="Adicionar membro"
        descricao={`Quem ainda não está em ${time.nome}.`}
        onFechar={onFechar}
      >
        {fora.length === 0 ? (
          <Vazio
            titulo="Todo mundo já está neste time"
            dica="Cadastre gente nova na aba Equipe e ela aparece aqui para ser adicionada."
            acao={<BotaoSecundario onClick={onFechar}>Fechar</BotaoSecundario>}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-stroke px-5 py-2.5">
              <Search className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
              <input
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar por nome, e-mail ou praça"
                aria-label="Buscar pessoas"
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
              />
              <span className="shrink-0 text-[12px] text-muted">
                {visiveis.length} de {fora.length}
              </span>
            </div>

            <div className="max-h-[46vh] overflow-y-auto px-3 py-2">
              {visiveis.length === 0 ? (
                <Vazio
                  titulo="Ninguém com esse termo"
                  dica="A busca procura por nome, e-mail, papel e praça."
                />
              ) : (
                visiveis.map((m) => {
                  const marcado = selecionados.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => alternar(m.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left',
                        marcado ? 'bg-rosa-fundo' : 'hover:bg-hairline',
                      )}
                    >
                      <AvatarMembro nome={m.nome} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">{m.nome}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {m.email} · {ROTULO_PAPEL[m.papel]}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          marcado ? 'border-rosa bg-rosa' : 'border-control bg-white',
                        )}
                      >
                        {marcado && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-stroke px-5 py-3">
              <span className="text-[13px] text-muted">
                {selecionados.length === 0
                  ? 'Selecione quem entra no time.'
                  : `${selecionados.length} ${selecionados.length === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}`}
              </span>
              <div className="flex items-center gap-2">
                <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
                <BotaoPrimario
                  disabled={selecionados.length === 0}
                  onClick={() => {
                    onAdicionar(selecionados)
                    onFechar()
                  }}
                >
                  {`Adicionar ${selecionados.length} ${selecionados.length === 1 ? 'pessoa' : 'pessoas'}`}
                </BotaoPrimario>
              </div>
            </div>
          </>
        )}
      </Moldura>
    </Dialog.Root>
  )
}

interface LinhaMembro {
  membro: Membro
  parceiros: number
  ativos: number
  aderencia: number
}

function ListaMembros({ linhas, vazio }: { linhas: LinhaMembro[]; vazio: string }) {
  if (linhas.length === 0) {
    return (
      <div className="card">
        <Vazio titulo={vazio} />
      </div>
    )
  }
  return (
    <div className="card divide-y divide-hairline">
      {linhas.map(({ membro, parceiros, ativos, aderencia }) => (
        <div key={membro.id} className="flex items-center gap-3 px-4 py-3">
          <AvatarMembro nome={membro.nome} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-ink">{membro.nome}</p>
            <p className="truncate text-[12px] text-muted">{membro.email}</p>
          </div>
          <Badge tom={TOM_PAPEL[membro.papel]}>{ROTULO_PAPEL[membro.papel]}</Badge>
          <span className="w-[150px] shrink-0 text-right text-[12px] text-muted">
            {parceiros === 0
              ? 'sem carteira no recorte'
              : `${ativos} de ${parceiros} parceiros ativos`}
          </span>
          <span className="w-[92px] shrink-0 text-right text-[13px] tabular-nums text-ink">
            {parceiros === 0 ? '—' : fmtPct(aderencia, 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ItemRail({
  ativo,
  onClick,
  icone,
  children,
}: {
  ativo: boolean
  onClick: () => void
  icone: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]',
        ativo ? 'bg-areia-ativo font-medium text-ink' : 'text-muted hover:bg-areia-barra',
      )}
    >
      {icone}
      <span className="truncate">{children}</span>
    </button>
  )
}

export function Times({ atual }: { atual: Snapshot }) {
  const [equipe] = useState<Membro[]>(() => equipeInicial())
  const [times, setTimes] = useState<Time[]>(() => timesIniciais())
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [pessoas, setPessoas] = useState(false)
  const [criando, setCriando] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [aba, setAba] = useState<AbaTime>('visao')
  const [filtroAtividade, setFiltroAtividade] = useState<'ativos' | 'parados'>('ativos')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('ativos')
  const [periodo, setPeriodo] = useState<Periodo>(atual.periodo)

  // O recorte da página manda: mexer no filtro global reposiciona o seletor local.
  const [periodoDaPagina, setPeriodoDaPagina] = useState<Periodo>(atual.periodo)
  if (periodoDaPagina !== atual.periodo) {
    setPeriodoDaPagina(atual.periodo)
    setPeriodo(atual.periodo)
  }

  const time = times.find((t) => t.id === selecionado) ?? null

  const membros = useMemo(
    () => (time ? equipe.filter((m) => time.membros.includes(m.id)) : []),
    [time, equipe],
  )

  const idsExecutivos = useMemo(() => executivosDoTime(membros), [membros])

  // Um snapshot só do time: o seletor de período desta tela desloca o recorte
  // sem tocar no filtro global da página.
  const base = useMemo(() => {
    const alvo = new Set(idsExecutivos)
    return snapshot(
      atual.parceiros.filter((p) => alvo.has(p.id_executivo)),
      periodo,
    )
  }, [atual.parceiros, idsExecutivos, periodo])

  const metricas = useMemo(() => metricasTime(base, idsExecutivos), [base, idsExecutivos])
  const prioridades = useMemo(() => alertasDoTime(base, idsExecutivos), [base, idsExecutivos])
  const qtdAlertas = totalAlertas(prioridades)

  const porMembro = useMemo<LinhaMembro[]>(
    () =>
      membros.map((membro) => {
        const m = metricasTime(base, executivosDoMembro(membro))
        return { membro, parceiros: m.parceiros, ativos: m.ativos, aderencia: m.aderencia }
      }),
    [membros, base],
  )

  const ordenadas = useMemo(() => {
    const copia = [...porMembro]
    if (ordenacao === 'nome') {
      return copia.sort((a, b) => a.membro.nome.localeCompare(b.membro.nome, 'pt-BR'))
    }
    if (ordenacao === 'aderencia') return copia.sort((a, b) => b.aderencia - a.aderencia)
    return copia.sort((a, b) => b.ativos - a.ativos)
  }, [porMembro, ordenacao])

  const comAtividade = ordenadas.filter((l) => l.ativos > 0)
  const semAtividade = ordenadas.filter((l) => l.ativos === 0)

  const abrir = (id: string) => {
    setSelecionado(id)
    setPessoas(false)
    setAba('visao')
    setFiltroAtividade('ativos')
  }

  const colunasMembros: Coluna<LinhaMembro>[] = [
    {
      chave: 'membro',
      label: 'Membro',
      larguraMin: '220px',
      valor: (l) => l.membro.nome,
      render: (l) => (
        <span className="block">
          <span className="block text-[13px] text-ink">{l.membro.nome}</span>
          <span className="block text-[12px] text-muted">{l.membro.email}</span>
        </span>
      ),
    },
    {
      chave: 'papel',
      label: 'Papel',
      valor: (l) => ROTULO_PAPEL[l.membro.papel],
      render: (l) => <Badge tom={TOM_PAPEL[l.membro.papel]}>{ROTULO_PAPEL[l.membro.papel]}</Badge>,
    },
    {
      chave: 'pracas',
      label: 'Praças',
      larguraMin: '180px',
      valor: (l) => l.membro.pracas.length,
      render: (l) =>
        l.membro.pracas.length === 0 ? (
          <span className="text-muted">— a definir</span>
        ) : (
          <span title={l.membro.pracas.join(', ')}>
            {l.membro.pracas.slice(0, 2).join(' · ')}
            {l.membro.pracas.length > 2 && (
              <span className="text-muted"> +{l.membro.pracas.length - 2}</span>
            )}
          </span>
        ),
    },
    {
      chave: 'permissoes',
      label: 'Permissões',
      numerica: true,
      valor: (l) => l.membro.permissoes.length,
      render: (l) => (
        <span title={listarPermissoes(l.membro.permissoes)}>
          {l.membro.permissoes.length} de {PERMISSOES.length}
        </span>
      ),
    },
    {
      chave: 'acao',
      label: '',
      valor: () => '',
      render: (l) => (
        <button
          type="button"
          onClick={() =>
            setTimes((atuais) =>
              atuais.map((t) =>
                t.id === time?.id
                  ? { ...t, membros: t.membros.filter((x) => x !== l.membro.id) }
                  : t,
              ),
            )
          }
          className="text-[12px] text-muted underline-offset-2 hover:text-laranja-escuro hover:underline"
        >
          Remover do time
        </button>
      ),
    },
  ]

  const colunasPessoas: Coluna<Membro>[] = [
    {
      chave: 'pessoa',
      label: 'Pessoa',
      larguraMin: '220px',
      valor: (m) => m.nome,
      render: (m) => (
        <span className="block">
          <span className="block text-[13px] text-ink">{m.nome}</span>
          <span className="block text-[12px] text-muted">{m.email}</span>
        </span>
      ),
    },
    {
      chave: 'papel',
      label: 'Papel',
      valor: (m) => ROTULO_PAPEL[m.papel],
      render: (m) => <Badge tom={TOM_PAPEL[m.papel]}>{ROTULO_PAPEL[m.papel]}</Badge>,
    },
    {
      chave: 'times',
      label: 'Times',
      larguraMin: '220px',
      valor: (m) => times.filter((t) => t.membros.includes(m.id)).length,
      render: (m) => {
        const dele = times.filter((t) => t.membros.includes(m.id))
        return dele.length === 0 ? (
          <span className="text-muted">— fora de todos os times</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1.5">
            {dele.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-[12px] text-ink">
                <AvatarTime cor={t.cor} nome={t.nome} className="h-4 w-4 text-[8px]" />
                {t.nome}
              </span>
            ))}
          </span>
        )
      },
    },
    {
      chave: 'pracas',
      label: 'Praças',
      numerica: true,
      valor: (m) => m.pracas.length,
      render: (m) => fmtInt(m.pracas.length),
    },
  ]

  return (
    <div className="flex gap-6">
      <aside className="w-[196px] shrink-0 border-r border-hairline pr-4">
        <div className="space-y-0.5">
          <ItemRail
            ativo={selecionado === null && !pessoas}
            onClick={() => {
              setSelecionado(null)
              setPessoas(false)
            }}
            icone={<Users className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Todos os times
          </ItemRail>
          <ItemRail
            ativo={pessoas}
            onClick={() => {
              setPessoas(true)
              setSelecionado(null)
            }}
            icone={<UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Todas as pessoas
          </ItemRail>
        </div>

        <p className="label-track mb-1 mt-5 px-2">Meus times</p>
        <div className="space-y-0.5">
          {times.map((t) => (
            <ItemRail
              key={t.id}
              ativo={t.id === selecionado}
              onClick={() => abrir(t.id)}
              icone={<AvatarTime cor={t.cor} nome={t.nome} className="h-4 w-4 text-[8px]" />}
            >
              {t.nome}
            </ItemRail>
          ))}
          {times.length === 0 && (
            <p className="px-2 py-1.5 text-[12px] text-muted">Nenhum time ainda.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCriando(true)}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted hover:bg-areia-barra hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          Criar time
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {pessoas ? (
          <>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-semibold text-ink">Todas as pessoas</h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  {equipe.length} pessoas na operação · {times.length}{' '}
                  {times.length === 1 ? 'time' : 'times'}. Uma pessoa pode estar em mais de um time.
                </p>
              </div>
              <BotaoPrimario onClick={() => setCriando(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Criar time
              </BotaoPrimario>
            </div>
            <DataTable
              colunas={colunasPessoas}
              linhas={equipe}
              chaveDe={(m) => m.id}
              ordemInicial={{ chave: 'pessoa', asc: true }}
              busca={{
                placeholder: 'Buscar por nome, e-mail ou praça',
                campos: (m) => `${m.nome} ${m.email} ${ROTULO_PAPEL[m.papel]} ${m.pracas.join(' ')}`,
              }}
              vazio={{
                titulo: 'Ninguém com esse termo',
                dica: 'A busca procura por nome, e-mail, papel e praça.',
              }}
            />
          </>
        ) : time === null ? (
          <div className="card">
            <Vazio
              titulo="Organize o time comercial em times de trabalho"
              dica="Times agrupam as pessoas que você atribui a tarefas e acompanha junto: a carteira somada, a aderência e os alertas do grupo aparecem em um lugar só. Abra um time na lista à esquerda ou crie o primeiro."
              acao={
                <div className="flex items-center gap-2">
                  <BotaoPrimario onClick={() => setCriando(true)}>
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    Criar time
                  </BotaoPrimario>
                  <BotaoSecundario onClick={() => setPessoas(true)}>Ver pessoas</BotaoSecundario>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarTime cor={time.cor} nome={time.nome} className="h-11 w-11 text-[15px]" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h2 className="truncate font-serif text-[28px] leading-tight text-ink">
                      {time.nome}
                    </h2>
                    <span className="shrink-0 text-[13px] text-muted">@{time.handle}</span>
                  </div>
                  {time.descricao && (
                    <p className="mt-0.5 truncate text-[13px] text-muted">{time.descricao}</p>
                  )}
                </div>
              </div>
              <BotaoPrimario onClick={() => setAdicionando(true)}>
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                Adicionar membro
              </BotaoPrimario>
            </div>

            <div className="mt-4 flex items-center gap-5 border-b border-stroke">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  className={cn(
                    '-mb-px border-b-2 pb-2 text-[13px] outline-none transition-colors',
                    aba === a.id
                      ? 'border-rosa font-medium text-ink'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {a.rotulo}
                  {a.id === 'prioridades' && qtdAlertas > 0 && (
                    <span className="ml-1.5 rounded-full bg-laranja-fundo px-1.5 py-0.5 text-[11px] font-medium text-laranja-escuro">
                      {qtdAlertas}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Período anterior"
                  onClick={() => setPeriodo((p) => deslocar(p, -1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-stroke bg-white text-muted hover:bg-hairline"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="min-w-[104px] text-center text-[13px] font-medium text-ink">
                  {rotuloPeriodo(periodo)}
                </span>
                <button
                  type="button"
                  aria-label="Próximo período"
                  disabled={!podeAvancar(periodo)}
                  onClick={() => setPeriodo((p) => deslocar(p, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-stroke bg-white text-muted hover:bg-hairline disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              <span className="text-[12px] text-muted">
                {membros.length} {membros.length === 1 ? 'membro' : 'membros'} ·{' '}
                {fmtInt(metricas.parceiros)} parceiros na carteira somada
              </span>
            </div>

            <div className="mt-4">
              {aba === 'visao' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <Cartao
                      label="Membros"
                      valor={fmtInt(membros.length)}
                      contexto={`${porMembro.filter((l) => l.ativos > 0).length} com carteira ativa`}
                    />
                    <Cartao
                      label="Parceiros na carteira"
                      valor={fmtInt(metricas.parceiros)}
                      contexto={`${fmtInt(metricas.ativos)} ativos no período`}
                    />
                    <Cartao
                      label="Aderência média"
                      valor={metricas.parceiros === 0 ? '—' : fmtPct(metricas.aderencia)}
                      contexto={
                        metricas.parceiros === 0
                          ? 'sem carteira no recorte'
                          : metricas.aderencia >= 0.7
                            ? 'meta de 70% atendida'
                            : 'abaixo da meta de 70%'
                      }
                    />
                    <Cartao
                      label="Alertas do time"
                      valor={fmtInt(qtdAlertas)}
                      contexto={
                        qtdAlertas === 0
                          ? 'nada pendente no período'
                          : `em ${prioridades.length} ${prioridades.length === 1 ? 'frente' : 'frentes'}`
                      }
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-end justify-between gap-4">
                      <h3 className="text-[14px] font-semibold text-ink">Membros do time</h3>
                      <span className="text-[12px] text-muted">
                        Receita da carteira somada: {fmtMoeda(metricas.receita)}
                      </span>
                    </div>
                    <ListaMembros
                      linhas={ordenadas}
                      vazio="Este time ainda não tem membros"
                    />
                  </div>
                </div>
              )}

              {aba === 'analytics' && (
                <div className="space-y-4">
                  <div className="card p-5">
                    <h3 className="text-[16px] font-semibold text-ink">
                      Parceiros ativos por membro
                    </h3>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Quantos parceiros da carteira de cada um ficaram online no período.
                    </p>
                    <div className="mt-4">
                      {porMembro.length === 0 ? (
                        <div className="flex h-[200px] items-center justify-center text-[13px] text-muted">
                          Este time ainda não tem membros.
                        </div>
                      ) : (
                        <ChartContainer
                          altura={Math.max(200, porMembro.length * 32 + 40)}
                          indicator="square"
                          initialDimension={{
                            width: 760,
                            height: Math.max(200, porMembro.length * 32 + 40),
                          }}
                        >
                          <BarChart
                            data={ordenadas.map((l) => ({
                              nome: l.membro.nome,
                              ativos: l.ativos,
                              carteira: l.parceiros,
                            }))}
                            layout="vertical"
                            margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                          >
                            <CartesianGrid horizontal={false} />
                            <XAxis
                              type="number"
                              allowDecimals={false}
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                            />
                            <YAxis
                              type="category"
                              dataKey="nome"
                              tickLine={false}
                              axisLine={false}
                              width={116}
                              tickMargin={6}
                              tickFormatter={nomeCurto}
                            />
                            <ChartTooltip
                              cursor={{ fill: '#F0EFED' }}
                              content={<ChartTooltipContent formatarValor={(v) => fmtInt(v)} />}
                            />
                            <Bar
                              dataKey="ativos"
                              name="Parceiros ativos"
                              radius={[0, 4, 4, 0]}
                              barSize={14}
                              isAnimationActive={false}
                            >
                              {ordenadas.map((l) => (
                                <Cell
                                  key={l.membro.id}
                                  fill={l.ativos > 0 ? '#E31C79' : '#78716C'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="inline-flex rounded-full border border-stroke bg-white p-0.5">
                      {(
                        [
                          ['ativos', `${comAtividade.length} ativos`],
                          ['parados', `${semAtividade.length} sem atividade`],
                        ] as const
                      ).map(([id, rotulo]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={filtroAtividade === id}
                          onClick={() => setFiltroAtividade(id)}
                          className={cn(
                            'h-8 rounded-full px-3.5 text-[13px] transition-colors',
                            filtroAtividade === id
                              ? 'bg-ink font-medium text-white'
                              : 'text-muted hover:text-ink',
                          )}
                        >
                          {rotulo}
                        </button>
                      ))}
                    </div>

                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger className="chip">
                        <span className="text-muted">Ordenar por</span>
                        <span className="font-medium text-ink">
                          {ORDENACOES.find((o) => o.id === ordenacao)?.rotulo}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" sideOffset={6} className={menuClasses}>
                          {ORDENACOES.map((o) => (
                            <DropdownMenu.Item
                              key={o.id}
                              className={itemClasses}
                              onSelect={() => setOrdenacao(o.id)}
                            >
                              {o.rotulo}
                              {ordenacao === o.id && <Check className="h-3.5 w-3.5 text-rosa" />}
                            </DropdownMenu.Item>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>

                  <ListaMembros
                    linhas={filtroAtividade === 'ativos' ? comAtividade : semAtividade}
                    vazio={
                      filtroAtividade === 'ativos'
                        ? 'Nenhum membro com carteira ativa no período'
                        : 'Todo mundo do time teve carteira ativa no período'
                    }
                  />
                </div>
              )}

              {aba === 'membros' && (
                <>
                  <p className="mb-3 text-[13px] text-muted">
                    {membros.length} {membros.length === 1 ? 'membro' : 'membros'} neste time. As
                    permissões vêm do cadastro da pessoa na aba Equipe.
                  </p>
                  {membros.length === 0 ? (
                    <div className="card">
                      <Vazio
                        titulo="Este time ainda não tem membros"
                        dica="Use “Adicionar membro” para trazer gente para cá."
                        acao={
                          <BotaoPrimario onClick={() => setAdicionando(true)}>
                            Adicionar membro
                          </BotaoPrimario>
                        }
                      />
                    </div>
                  ) : (
                    <DataTable
                      colunas={colunasMembros}
                      linhas={porMembro}
                      chaveDe={(l) => l.membro.id}
                      ordemInicial={{ chave: 'membro', asc: true }}
                      busca={{
                        placeholder: 'Buscar por nome, e-mail ou praça',
                        campos: (l) =>
                          `${l.membro.nome} ${l.membro.email} ${ROTULO_PAPEL[l.membro.papel]} ${l.membro.pracas.join(' ')}`,
                      }}
                      vazio={{
                        titulo: 'Nenhum membro com esse termo',
                        dica: 'A busca procura por nome, e-mail, papel e praça.',
                      }}
                    />
                  )}
                </>
              )}

              {aba === 'prioridades' && (
                <div className="space-y-3">
                  {prioridades.length === 0 ? (
                    <div className="card">
                      <Vazio
                        titulo="Nada pedindo atenção neste time"
                        dica="Nenhum parceiro da carteira somada caiu nos alertas do período. Troque o período nas setas acima para conferir um recorte anterior."
                      />
                    </div>
                  ) : (
                    prioridades.map((a) => (
                      <div key={a.chave} className="card px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[14px] font-semibold text-ink">{a.titulo}</h3>
                            <p className="mt-0.5 text-[13px] text-muted">{a.resumo}</p>
                          </div>
                          <Badge tom={TOM_SEVERIDADE[a.severidade]}>
                            {a.severidade === 'critico' ? 'Crítico' : 'Atenção'}
                          </Badge>
                        </div>
                        <ul className="mt-3 space-y-1.5">
                          {a.linhas.slice(0, 4).map((l) => (
                            <li
                              key={l.id}
                              className="flex items-baseline justify-between gap-3 border-t border-hairline pt-1.5 text-[13px]"
                            >
                              <span className="min-w-0">
                                <span className="text-ink">{l.parceiro ?? l.executivo}</span>
                                <span className="ml-2 text-[12px] text-muted">{l.detalhe}</span>
                              </span>
                              <span className="shrink-0 text-[12px] text-muted">{l.valor}</span>
                            </li>
                          ))}
                        </ul>
                        {a.linhas.length > 4 && (
                          <p className="mt-2 text-[12px] text-muted">
                            +{a.linhas.length - 4} na lista completa desta frente.
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <DialogCriar
        aberto={criando}
        onOpenChange={setCriando}
        onCriar={(novo) => {
          const id = `T${Date.now()}`
          setTimes((atuais) => [...atuais, { ...novo, id, membros: [] }])
          abrir(id)
        }}
      />

      {time && adicionando && (
        <DialogAdicionar
          time={time}
          equipe={equipe}
          onFechar={() => setAdicionando(false)}
          onAdicionar={(ids) =>
            setTimes((atuais) =>
              atuais.map((t) =>
                t.id === time.id ? { ...t, membros: [...t.membros, ...ids] } : t,
              ),
            )
          }
        />
      )}
    </div>
  )
}
