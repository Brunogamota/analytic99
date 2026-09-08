import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, CalendarClock, MessageSquare, TriangleAlert } from 'lucide-react'
import { DataTable, type Coluna } from '@/components/DataTable'
import { Badge, Vazio, type Tom } from '@/components/ui'
import { Avatar } from '@/components/ui/avatar'
import { dataset } from '@/data/seed'
import { PERGUNTAS_INICIAIS, responder, type Resposta } from '@/lib/assistente'
import { cn, fmtDec, fmtInt, fmtPct } from '@/lib/format'
import {
  formatarMeta,
  metasDoExecutivo,
  progressoDaMeta,
  textoDaMeta,
  type MetaExecutivo,
  type PerfilAtivo,
  type PerfilExecutivo,
} from '@/lib/perfil'
import {
  alertas,
  rotuloPromo,
  snapshot,
  statusBanner,
  type Snapshot,
  type StatusBanner,
} from '@/lib/queries'
import { sugestoes } from '@/lib/sugestoes'
import { HOJE_DATA, STATUS, tarefasIniciais, type StatusTarefa, type Tarefa } from '@/lib/tarefas'

const ORDEM_STATUS: StatusTarefa[] = [
  STATUS.atrasada,
  STATUS.andamento,
  STATUS.planejada,
  STATUS.concluida,
]

const TOM_BANNER: Record<StatusBanner, Tom> = {
  Perdeu: 'laranja',
  Ganhou: 'verde',
  Manteve: 'verde',
  'Nunca teve': 'cinza',
}

const fmtDia = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

const diasDeAtraso = (fim: Date) =>
  Math.round((HOJE_DATA.getTime() - fim.getTime()) / 86_400_000)

// ---------------------------------------------------------------------------
// 1. Metas
// ---------------------------------------------------------------------------

function CartaoMeta({ meta }: { meta: MetaExecutivo }) {
  const progresso = progressoDaMeta(meta)
  return (
    <div className="card px-4 py-3.5">
      <p className="label-track">{meta.rotulo}</p>
      <p
        className={cn(
          'mt-2 text-[30px] font-semibold leading-9 tracking-[-0.03em] tabular-nums',
          meta.atingido ? 'text-ink' : 'text-rosa',
        )}
      >
        {formatarMeta(meta.valor, meta.unidade)}
      </p>
      <p className="mt-1 text-[12px] text-muted">{textoDaMeta(meta)}</p>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className={cn('h-full rounded-full', meta.atingido ? 'bg-ink' : 'bg-rosa')}
          style={{ width: `${Math.round(progresso * 100)}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Minhas tarefas
// ---------------------------------------------------------------------------

function ListaTarefas({ tarefas }: { tarefas: Tarefa[] }) {
  const grupos = ORDEM_STATUS.map((status) => ({
    status,
    itens: tarefas.filter((t) => t.status.id === status.id),
  })).filter((g) => g.itens.length > 0)

  if (grupos.length === 0) {
    return (
      <div className="card">
        <Vazio
          titulo="Nenhuma tarefa atribuída a você"
          dica="As tarefas da carteira aparecem aqui assim que a gestora distribuir a próxima rodada."
        />
      </div>
    )
  }

  return (
    <div className="card divide-y divide-hairline">
      {grupos.map(({ status, itens }) => (
        <div key={status.id} className="px-4 py-3">
          <div className="flex items-baseline gap-2">
            <p className="label-track">{status.nome}</p>
            <span className="text-[12px] text-muted">{itens.length}</span>
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {itens.map((t) => {
              const atrasada = t.status.id === 'atrasada'
              return (
                <li key={t.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'text-[13px]',
                        t.status.id === 'concluida' ? 'text-muted line-through' : 'text-ink',
                      )}
                    >
                      {t.nome}
                    </span>
                    <span className="ml-2 text-[12px] text-muted">{t.grupo}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] text-muted">
                    <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className="tabular-nums">{fmtDia(t.fim)}</span>
                    {atrasada && (
                      <Badge tom="laranja">
                        {diasDeAtraso(t.fim)} {diasDeAtraso(t.fim) === 1 ? 'dia' : 'dias'} de atraso
                      </Badge>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Copiloto — versão compacta do chat da aba Sugestões
// ---------------------------------------------------------------------------

function Composer({
  valor,
  onChange,
  onEnviar,
}: {
  valor: string
  onChange: (v: string) => void
  onEnviar: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [valor])

  return (
    <div className="card p-2">
      <textarea
        ref={ref}
        rows={1}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnviar()
          }
        }}
        aria-label="Pergunte sobre a sua carteira"
        placeholder="Pergunte sobre a sua carteira"
        className="block max-h-[120px] w-full resize-none border-0 bg-transparent px-2 pb-1 pt-2 text-[14px] leading-6 text-ink outline-none placeholder:text-muted"
      />
      <div className="flex justify-end pt-1">
        <button
          type="button"
          aria-label="Enviar pergunta"
          disabled={valor.trim() === ''}
          onClick={onEnviar}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition-opacity hover:bg-noite-claro disabled:opacity-25"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}

function Copiloto({ atual, anterior }: { atual: Snapshot; anterior: Snapshot }) {
  const [rascunho, setRascunho] = useState('')
  const [pergunta, setPergunta] = useState<string | null>(null)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  function enviar(texto: string) {
    const limpo = texto.trim()
    if (limpo === '') return
    setPergunta(limpo)
    setResposta(responder(limpo, atual, anterior))
    setRascunho('')
  }

  const atalhos = resposta?.followUps ?? PERGUNTAS_INICIAIS

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink">Copiloto</h3>
        <p className="text-[12px] text-muted">
          Só a sua carteira: {fmtInt(atual.parceiros.length)} parceiros,{' '}
          {fmtInt(atual.totalPedidos)} pedidos
        </p>
      </div>

      {resposta && pergunta && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-[13px] text-muted">{pergunta}</p>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-ink">
            {resposta.texto}
          </p>

          {resposta.sugestoes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {resposta.sugestoes.slice(0, 3).map((s) => (
                <li key={s.id} className="rounded-card border border-stroke px-3 py-2">
                  <p className="text-[13px] font-semibold text-ink">{s.acao}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {s.parceiro ?? 'Carteira inteira'}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-ink">{s.motivo}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3">
        <Composer valor={rascunho} onChange={setRascunho} onEnviar={() => enviar(rascunho)} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {atalhos.map((p) => (
          <button key={p} type="button" className="chip h-8 px-3" onClick={() => enviar(p)}>
            <MessageSquare className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. Meus dados
// ---------------------------------------------------------------------------

interface LinhaCarteira {
  id_parceiro: string
  parceiro: string
  horas: number
  pedidos: number
  conversao: number
  aderencia: number | null
  banner: StatusBanner
}

function linhasDaCarteira(s: Snapshot): LinhaCarteira[] {
  const promos = new Map<string, { dias: number; periodo: number }>()
  for (const p of s.promos) {
    const atual = promos.get(p.id_parceiro) ?? { dias: 0, periodo: 0 }
    atual.dias += p.dias_aderencia
    atual.periodo += p.dias_periodo
    promos.set(p.id_parceiro, atual)
  }
  const banners = new Map(statusBanner(s).map((b) => [b.id_parceiro, b.status]))

  return s.parceiros.map((p) => {
    const horas = s.horasPorParceiro.get(p.id_parceiro) ?? 0
    const pedidos = s.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    const promo = promos.get(p.id_parceiro)
    return {
      id_parceiro: p.id_parceiro,
      parceiro: p.nome,
      horas,
      pedidos,
      conversao: horas === 0 ? 0 : pedidos / horas,
      aderencia: promo && promo.periodo > 0 ? promo.dias / promo.periodo : null,
      banner: banners.get(p.id_parceiro) ?? 'Nunca teve',
    }
  })
}

const COLUNAS: Coluna<LinhaCarteira>[] = [
  { chave: 'parceiro', label: 'Parceiro', larguraMin: '200px', valor: (l) => l.parceiro },
  {
    chave: 'horas',
    label: 'Horas online',
    numerica: true,
    valor: (l) => l.horas,
    render: (l) => (
      <span className={l.horas === 0 ? 'text-rosa' : undefined}>{fmtDec(l.horas, 1)}</span>
    ),
  },
  {
    chave: 'pedidos',
    label: 'Pedidos',
    numerica: true,
    valor: (l) => l.pedidos,
    render: (l) => fmtInt(l.pedidos),
  },
  {
    chave: 'conversao',
    label: 'Conversão / hora',
    numerica: true,
    valor: (l) => l.conversao,
    render: (l) => fmtDec(l.conversao, 2),
  },
  {
    chave: 'aderencia',
    label: 'Aderência',
    numerica: true,
    valor: (l) => l.aderencia ?? -1,
    render: (l) =>
      l.aderencia === null ? (
        <span className="text-muted">sem promo</span>
      ) : (
        <span className={l.aderencia < 0.8 ? 'text-rosa' : undefined}>
          {fmtPct(l.aderencia, 0)}
        </span>
      ),
  },
  {
    chave: 'banner',
    label: 'Banner',
    valor: (l) => l.banner,
    render: (l) => <Badge tom={TOM_BANNER[l.banner]}>{l.banner}</Badge>,
  },
]

interface Pendencia {
  id: string
  titulo: string
  detalhe: string
  destaque: boolean
}

/** "O que eu preciso fazer": alertas viram obrigação, sugestões viram oportunidade. */
function pendencias(atual: Snapshot, anterior: Snapshot): Pendencia[] {
  const out: Pendencia[] = alertas(atual).map((a) => ({
    id: `alerta:${a.chave}`,
    titulo: a.titulo,
    detalhe: a.linhas
      .slice(0, 3)
      .map((l) => `${l.parceiro ?? 'carteira'} · ${l.valor}`)
      .join(' — '),
    destaque: a.severidade === 'critico',
  }))

  for (const s of sugestoes(atual, anterior).slice(0, 4)) {
    out.push({
      id: `sugestao:${s.id}`,
      titulo: s.acao,
      detalhe: `${s.parceiro ?? 'Carteira inteira'} · ${s.motivo}`,
      destaque: false,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// A tela
// ---------------------------------------------------------------------------

function VisaoExecutivo({
  atual,
  anterior,
  perfil,
}: {
  atual: Snapshot
  anterior: Snapshot
  perfil: PerfilExecutivo
}) {
  // A carteira sai do dataset, não do recorte recebido: o executivo enxerga a
  // carteira dele inteira e só ela, mesmo que a gestora tenha entrado aqui com
  // um filtro de gerente ou praça aberto. Dos snapshots vem só o período.
  const carteira = useMemo(
    () => dataset.parceiros.filter((p) => p.id_executivo === perfil.id_executivo),
    [perfil.id_executivo],
  )
  const meuAtual = useMemo(() => snapshot(carteira, atual.periodo), [carteira, atual.periodo])
  const meuAnterior = useMemo(
    () => snapshot(carteira, anterior.periodo),
    [carteira, anterior.periodo],
  )

  const metas = useMemo(
    () => metasDoExecutivo(meuAtual, perfil.id_executivo),
    [meuAtual, perfil.id_executivo],
  )
  const tarefas = useMemo(
    () => tarefasIniciais().filter((t) => t.responsavel === perfil.nome),
    [perfil.nome],
  )
  const linhas = useMemo(() => linhasDaCarteira(meuAtual), [meuAtual])
  const fazer = useMemo(() => pendencias(meuAtual, meuAnterior), [meuAtual, meuAnterior])

  const abertas = tarefas.filter((t) => t.status.id !== 'concluida').length
  const promos = new Set(meuAtual.promos.map((p) => p.id_parceiro)).size

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Avatar nome={perfil.nome} tamanho="lg" anel={false} />
        <div>
          <h2 className="font-serif text-[28px] leading-tight text-ink">{perfil.nome}</h2>
          <p className="text-[13px] text-muted">
            {fmtInt(carteira.length)} parceiros na carteira · {fmtInt(promos)} com promo no período
            · {fmtInt(abertas)} {abertas === 1 ? 'tarefa aberta' : 'tarefas abertas'}
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-[14px] font-semibold text-ink">Minhas metas</h3>
        <div className="grid grid-cols-4 gap-3">
          {metas.map((m) => (
            <CartaoMeta key={m.rotulo} meta={m} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h3 className="text-[14px] font-semibold text-ink">Minhas tarefas</h3>
          <span className="text-[12px] text-muted">
            {fmtInt(tarefas.length)} no total · {fmtInt(abertas)} sem concluir
          </span>
        </div>
        <ListaTarefas tarefas={tarefas} />
      </section>

      <section>
        <Copiloto atual={meuAtual} anterior={meuAnterior} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h3 className="text-[14px] font-semibold text-ink">Meus dados</h3>
          <span className="text-[12px] text-muted">
            {meuAtual.promos.length}{' '}
            {meuAtual.promos.length === 1 ? 'promoção ativa' : 'promoções ativas'} (
            {[...new Set(meuAtual.promos.map((p) => rotuloPromo(p.tipo_promo)))].join(', ') ||
              'nenhuma'}
            )
          </span>
        </div>

        <div className="card mb-3 px-4 py-3.5">
          <p className="label-track">O que eu preciso fazer</p>
          {fazer.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-muted">
              Nada pendente na carteira neste período — nenhum alerta e nenhuma sugestão aberta.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {fazer.map((p) => (
                <li key={p.id} className="flex items-baseline gap-2 border-t border-hairline pt-1.5">
                  {p.destaque ? (
                    <TriangleAlert
                      className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-rosa"
                      strokeWidth={2}
                    />
                  ) : (
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-control" />
                  )}
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'text-[13px] font-medium',
                        p.destaque ? 'text-rosa-escuro' : 'text-ink',
                      )}
                    >
                      {p.titulo}
                    </span>
                    <span className="ml-2 text-[12px] text-muted">{p.detalhe}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DataTable
          colunas={COLUNAS}
          linhas={linhas}
          chaveDe={(l) => l.id_parceiro}
          ordemInicial={{ chave: 'pedidos', asc: false }}
          busca={{ placeholder: 'Buscar parceiro da minha carteira', campos: (l) => l.parceiro }}
          vazio={{
            titulo: 'Nenhum parceiro com esse termo',
            dica: 'A busca procura pelo nome do parceiro.',
          }}
        />
      </section>
    </div>
  )
}

export function MinhaVisao({
  atual,
  anterior,
  perfil,
}: {
  atual: Snapshot
  anterior: Snapshot
  perfil: PerfilAtivo
}) {
  if (perfil.tipo === 'gestora') {
    return (
      <div className="card">
        <Vazio
          titulo="Esta tela é a visão de um executivo"
          dica="Você está como gestora, que enxerga o time inteiro. Troque o perfil no seletor acima para entrar na visão de alguém do squad e ver as metas, as tarefas e a carteira daquela pessoa."
        />
      </div>
    )
  }

  return (
    <VisaoExecutivo
      key={perfil.id_executivo}
      atual={atual}
      anterior={anterior}
      perfil={perfil}
    />
  )
}
