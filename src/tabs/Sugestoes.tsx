import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ArrowUp, Check, MessageSquare, Plus } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PERGUNTAS_INICIAIS, responder, type Resposta } from '@/lib/assistente'
import { cn } from '@/lib/format'
import type { Snapshot } from '@/lib/queries'
import type { Prioridade, Sugestao } from '@/lib/sugestoes'

const TOM_PRIORIDADE: Record<Prioridade, 'laranja' | 'amarelo' | 'cinza'> = {
  alta: 'laranja',
  media: 'amarelo',
  baixa: 'cinza',
}

const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

type Mensagem =
  | { id: string; autor: 'usuario'; texto: string }
  | { id: string; autor: 'copiloto'; resposta: Resposta }

function CartaoSugestao({
  sugestao,
  criada,
  onCriar,
}: {
  sugestao: Sugestao
  criada: boolean
  onCriar: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-stroke bg-white p-3.5',
        criada && 'border-hairline bg-hairline/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[14px] font-semibold text-ink', criada && 'text-muted')}>
            {sugestao.acao}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {sugestao.parceiro ?? 'Carteira inteira'} · {sugestao.executivo}
          </p>
        </div>
        {criada ? (
          <Badge tom="cinza">Criada</Badge>
        ) : (
          <Badge tom={TOM_PRIORIDADE[sugestao.prioridade]}>
            {ROTULO_PRIORIDADE[sugestao.prioridade]}
          </Badge>
        )}
      </div>

      <p className="mt-2 text-[13px] leading-5 text-ink">{sugestao.motivo}</p>

      {!criada && (
        <button
          type="button"
          onClick={onCriar}
          className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-md bg-ink px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-noite-claro"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Marcar como criada
        </button>
      )}
    </div>
  )
}

function FollowUps({ perguntas, onEscolher }: { perguntas: string[]; onEscolher: (p: string) => void }) {
  if (perguntas.length === 0) return null
  return (
    <div className="mt-5 border-t border-hairline">
      <p className="label-track pt-3">Perguntas relacionadas</p>
      <div className="mt-1">
        {perguntas.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onEscolher(p)}
            className="group flex w-full items-center gap-2.5 border-b border-hairline py-2.5 text-left text-[13px] text-ink transition-colors hover:text-laranja-escuro"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">{p}</span>
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 text-control transition-colors group-hover:text-ink"
              strokeWidth={1.75}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function Pensando() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted">
      <span>Copiloto está analisando</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-control"
            style={{ animation: 'pulse 1.1s ease-in-out infinite', animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
    </div>
  )
}

function Composer({
  valor,
  onChange,
  onEnviar,
  autoFoco,
}: {
  valor: string
  onChange: (v: string) => void
  onEnviar: () => void
  autoFoco?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // A altura acompanha o conteúdo até um teto — como no composer do Manus.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [valor])

  const vazio = valor.trim() === ''

  return (
    <div className="card p-2">
      <textarea
        ref={ref}
        autoFocus={autoFoco}
        rows={1}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnviar()
          }
        }}
        placeholder="Pergunte sobre o recorte filtrado"
        className="block max-h-[160px] w-full resize-none border-0 bg-transparent px-2 pb-1 pt-2 text-[14px] leading-6 text-ink outline-none placeholder:text-muted"
      />
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          aria-label="Anexar contexto"
          title="Anexar contexto"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-stroke text-muted transition-colors hover:bg-hairline hover:text-ink"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Enviar pergunta"
          disabled={vazio}
          onClick={onEnviar}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition-opacity hover:bg-noite-claro disabled:opacity-25"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}

export function Sugestoes({ atual, anterior }: { atual: Snapshot; anterior: Snapshot }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [rascunho, setRascunho] = useState('')
  const [pensando, setPensando] = useState(false)
  const [criadas, setCriadas] = useState<Set<string>>(new Set())
  const fim = useRef<HTMLDivElement>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens, pensando])

  function enviar(pergunta: string) {
    const texto = pergunta.trim()
    if (texto === '' || pensando) return

    // A resposta é calculada agora, com o snapshot atual; o atraso serve só para
    // mostrar o estado "analisando".
    const resposta = responder(texto, atual, anterior)
    const marca = `${Date.now()}-${mensagens.length}`

    setMensagens((antes) => [...antes, { id: `u${marca}`, autor: 'usuario', texto }])
    setRascunho('')
    setPensando(true)

    timer.current = window.setTimeout(() => {
      setMensagens((antes) => [...antes, { id: `c${marca}`, autor: 'copiloto', resposta }])
      setPensando(false)
    }, 400)
  }

  const vazia = mensagens.length === 0 && !pensando

  return (
    <div className="mx-auto flex min-h-[560px] w-full max-w-[760px] flex-col">
      {vazia ? (
        <div className="flex flex-1 flex-col justify-center pb-16">
          <h2 className="text-center font-serif text-[34px] leading-tight text-ink">
            No que eu te ajudo?
          </h2>
          <p className="mt-2 text-center text-[13px] text-muted">
            Respondo com os números do recorte filtrado — {atual.parceiros.length} parceiros,{' '}
            {atual.totalPedidos.toLocaleString('pt-BR')} pedidos.
          </p>

          <div className="mt-6">
            <Composer valor={rascunho} onChange={setRascunho} onEnviar={() => enviar(rascunho)} autoFoco />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PERGUNTAS_INICIAIS.map((p) => (
              <button key={p} type="button" className="chip" onClick={() => enviar(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-8">
            {mensagens.map((m) =>
              m.autor === 'usuario' ? (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[80%] rounded-card border border-stroke bg-white p-4 text-[14px] leading-6 text-ink">
                    {m.texto}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-[13px] font-semibold text-ink">Copiloto</p>
                  <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-ink">
                    {m.resposta.texto}
                  </p>

                  {m.resposta.sugestoes.length > 0 && (
                    <div className="mt-4 space-y-2.5">
                      {m.resposta.sugestoes.map((s) => (
                        <CartaoSugestao
                          key={`${m.id}:${s.id}`}
                          sugestao={s}
                          criada={criadas.has(s.id)}
                          onCriar={() =>
                            setCriadas((antes) => {
                              const proximo = new Set(antes)
                              proximo.add(s.id)
                              return proximo
                            })
                          }
                        />
                      ))}
                    </div>
                  )}

                  <FollowUps perguntas={m.resposta.followUps} onEscolher={enviar} />
                </motion.div>
              ),
            )}

            {pensando && <Pensando />}

            {criadas.size > 0 && (
              <p className="flex items-center gap-1.5 text-[12px] text-muted">
                <Check className="h-3.5 w-3.5 text-verde" strokeWidth={2.5} />
                {criadas.size} {criadas.size === 1 ? 'sugestão marcada' : 'sugestões marcadas'} como
                criada nesta sessão.
              </p>
            )}

            <div ref={fim} />
          </div>

          <div className="sticky bottom-0 -mx-1 bg-areia px-1 pb-2 pt-4">
            <Composer valor={rascunho} onChange={setRascunho} onEnviar={() => enviar(rascunho)} />
          </div>
        </>
      )}
    </div>
  )
}
