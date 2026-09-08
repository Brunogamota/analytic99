import { useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import {
  Check,
  MessageSquareWarning,
  Plus,
  Settings2,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { Badge, Vazio } from '@/components/ui'
import { cn, fmtDec } from '@/lib/format'
import type { Snapshot } from '@/lib/queries'
import {
  BASES,
  contarPorBase,
  sugestoes as calcularSugestoes,
  taxaReclamacaoGeral,
  type BaseSugestao,
  type Prioridade,
  type Sugestao,
} from '@/lib/sugestoes'

const ICONES: Record<BaseSugestao, typeof TrendingUp> = {
  vendas: TrendingUp,
  pedidos: ShoppingBag,
  reclamacoes: MessageSquareWarning,
  operacao: Settings2,
}

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

function Cartao({
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
        'rounded-lg border border-stroke p-4 transition-colors',
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
        <div className="flex shrink-0 items-center gap-2">
          {criada ? (
            <Badge tom="cinza">Criada</Badge>
          ) : (
            <Badge tom={TOM_PRIORIDADE[sugestao.prioridade]}>
              {ROTULO_PRIORIDADE[sugestao.prioridade]}
            </Badge>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-[13px] leading-5 text-ink">{sugestao.motivo}</p>
      <p className="mt-1 text-[12px] leading-5 text-muted">{sugestao.impacto}</p>

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

export function Sugestoes({ atual, anterior }: { atual: Snapshot; anterior: Snapshot }) {
  const [base, setBase] = useState<BaseSugestao>('vendas')
  const [criadas, setCriadas] = useState<Set<string>>(new Set())

  const lista = useMemo(() => calcularSugestoes(atual, anterior), [atual, anterior])
  const contagem = useMemo(() => contarPorBase(lista), [lista])
  const taxa = taxaReclamacaoGeral(atual)

  const daBase = lista
    .filter((s) => s.base === base)
    .sort((a, b) => Number(criadas.has(a.id)) - Number(criadas.has(b.id)))

  const atualBase = BASES.find((b) => b.id === base) ?? BASES[0]

  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">
        {lista.length} sugestões geradas a partir do recorte atual — {atual.parceiros.length}{' '}
        parceiros, {atual.totalPedidos.toLocaleString('pt-BR')} pedidos e {fmtDec(taxa, 2)}{' '}
        reclamações por 100 pedidos. Nenhuma é fixa: mude o filtro e a lista muda.
      </p>

      <div className="card overflow-hidden">
        <div className="flex min-h-[520px]">
          <div className="w-[190px] shrink-0 border-r border-stroke p-2">
            <p className="label-track px-2 pb-1.5 pt-1">Base do sinal</p>
            <LayoutGroup id="bases-sugestao">
              {BASES.map((b) => {
                const ativa = base === b.id
                const Icone = ICONES[b.id]
                const total = contagem[b.id]
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBase(b.id)}
                    className={cn(
                      'relative flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition-colors',
                      ativa ? 'text-ink' : 'text-[#4B5563] hover:text-ink',
                    )}
                  >
                    {ativa && (
                      <motion.span
                        layoutId="fundo-base"
                        className="absolute inset-0 rounded-md bg-hairline"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    {ativa && (
                      <motion.span
                        layoutId="marca-base"
                        className="absolute left-0 z-20 h-4 w-[2px] rounded-full bg-rosa"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <Icone className="relative z-10 h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                    <span className="relative z-10 truncate font-medium">{b.label}</span>
                    <span
                      className={cn(
                        'relative z-10 ml-auto rounded px-1 py-0.5 text-[10px] leading-none tabular-nums',
                        ativa ? 'bg-amarelo text-ink' : 'bg-hairline text-muted',
                      )}
                    >
                      {total}
                    </span>
                  </button>
                )
              })}
            </LayoutGroup>
          </div>

          <div className="min-w-0 flex-1 p-5">
            <header>
              <h3 className="text-[16px] font-semibold text-ink">{atualBase.label}</h3>
              <p className="mt-0.5 text-[13px] text-muted">{atualBase.descricao}</p>
            </header>

            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={base}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="mt-4"
              >
                {daBase.length === 0 ? (
                  <Vazio
                    titulo="Nada a sugerir nesta base"
                    dica="Os sinais desta categoria estão dentro do esperado para o recorte selecionado."
                  />
                ) : (
                  <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1">
                    {daBase.map((s) => (
                      <Cartao
                        key={s.id}
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
              </motion.div>
            </AnimatePresence>

            {criadas.size > 0 && (
              <p className="mt-4 flex items-center gap-1.5 border-t border-hairline pt-3 text-[12px] text-muted">
                <Check className="h-3.5 w-3.5 text-[#047857]" strokeWidth={2.5} />
                {criadas.size} {criadas.size === 1 ? 'sugestão marcada' : 'sugestões marcadas'} como
                criada nesta sessão.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
