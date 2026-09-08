import { useState, type KeyboardEvent, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Check, Flag, Layers, UserRound, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/format'
import {
  dia,
  LISTA_PRIORIDADES,
  novaTarefa,
  PRIORIDADES,
  STATUS,
  validarTarefa,
  type Prioridade,
  type StatusTarefa,
  type Tarefa,
} from '@/lib/tarefas'

const menuClasses =
  'z-50 min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(17,24,39,0.08)]'

const itemClasses =
  'flex w-full cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-ink outline-none data-[highlighted]:bg-hairline hover:bg-hairline'

const chipClasses = 'chip h-8 px-3 text-[12.5px]'

/** `AAAA-MM-DD` local — `toISOString()` viria em UTC e pularia um dia. */
function iso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${d}`
}

const curto = (data: Date) => format(data, 'd MMM', { locale: ptBR })

function rotuloPrazo(inicio: Date | null, fim: Date | null): string | null {
  if (inicio && fim) return `${curto(inicio)} – ${curto(fim)}`
  if (inicio) return `a partir de ${curto(inicio)}`
  if (fim) return `até ${curto(fim)}`
  return null
}

/** Chip vazio mostra o rótulo em cinza; preenchido mostra o valor com o ícone. */
function ConteudoChip({
  icone,
  rotulo,
  valor,
}: {
  icone: ReactNode
  rotulo: string
  valor: string | null
}) {
  return (
    <>
      {icone}
      <span className={valor ? 'font-medium text-ink' : 'text-muted'}>{valor ?? rotulo}</span>
    </>
  )
}

function Formulario({
  onCriar,
  onFechar,
  responsaveis,
  frentes,
}: {
  onCriar: (tarefa: Tarefa) => void
  onFechar: () => void
  responsaveis: string[]
  frentes: readonly string[]
}) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [responsavel, setResponsavel] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusTarefa>(STATUS.planejada)
  const [prioridade, setPrioridade] = useState<Prioridade | null>(null)
  const [inicio, setInicio] = useState<Date | null>(null)
  const [fim, setFim] = useState<Date | null>(null)
  const [frente, setFrente] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)

  const entrada = {
    nome,
    descricao,
    status,
    inicio,
    fim,
    responsavel: responsavel ?? undefined,
    prioridade: prioridade ?? undefined,
    grupo: frente ?? undefined,
  }

  const erro = validarTarefa(entrada)
  const prazoInvertido = Boolean(inicio && fim && fim < inicio)
  // O nome vazio só vira mensagem depois de uma tentativa; datas contraditórias
  // aparecem na hora, porque o usuário acabou de digitá-las.
  const erroVisivel = erro && (tentou || prazoInvertido) ? erro : null

  function criar() {
    if (validarTarefa(entrada)) {
      setTentou(true)
      return
    }
    onCriar(novaTarefa(entrada))
    onFechar()
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'Enter' || evento.shiftKey) return
    const alvo = evento.target as HTMLElement
    // Menus abrem em portal: o React propaga o evento até aqui, mas o Enter
    // deles é para escolher um item, não para criar a tarefa.
    if (!evento.currentTarget.contains(alvo)) return
    if (alvo.tagName === 'TEXTAREA') return
    evento.preventDefault()
    criar()
  }

  const prazo = rotuloPrazo(inicio, fim)
  const nivel = prioridade ? PRIORIDADES[prioridade] : null

  return (
    <div onKeyDown={aoTeclar}>
      <div className="flex items-center justify-between border-b border-stroke px-5 py-3">
        <Dialog.Title className="text-[13px] font-semibold text-ink">Nova tarefa</Dialog.Title>
        <Dialog.Close
          aria-label="Fechar"
          className="rounded p-1 text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-rosa/30"
        >
          <X className="h-4 w-4" />
        </Dialog.Close>
      </div>

      <div className="px-5 pt-4">
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da tarefa"
          aria-label="Nome da tarefa"
          className="w-full border-0 bg-transparent p-0 text-[20px] font-medium text-ink outline-none placeholder:text-control"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className={chipClasses}>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: status.cor }}
            />
            <span className="font-medium text-ink">{status.nome}</span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
              {Object.values(STATUS).map((opcao) => (
                <DropdownMenu.Item
                  key={opcao.id}
                  className={itemClasses}
                  onSelect={() => setStatus(opcao)}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: opcao.cor }}
                  />
                  <span className="flex-1">{opcao.nome}</span>
                  {status.id === opcao.id && <Check className="h-3.5 w-3.5 text-rosa" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className={chipClasses} aria-label="Responsável">
            <ConteudoChip
              icone={
                responsavel ? (
                  <Avatar nome={responsavel} tamanho="sm" anel={false} className="-ml-1" />
                ) : (
                  <UserRound className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                )
              }
              rotulo="Responsável"
              valor={responsavel}
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
              {responsaveis.map((pessoa) => (
                <DropdownMenu.Item
                  key={pessoa}
                  className={itemClasses}
                  onSelect={() => setResponsavel(pessoa)}
                >
                  <Avatar nome={pessoa} tamanho="sm" anel={false} />
                  <span className="flex-1">{pessoa}</span>
                  {responsavel === pessoa && <Check className="h-3.5 w-3.5 text-rosa" />}
                </DropdownMenu.Item>
              ))}
              {responsavel && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
                  <DropdownMenu.Item
                    className={cn(itemClasses, 'text-muted')}
                    onSelect={() => setResponsavel(null)}
                  >
                    Sem responsável
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Popover.Root>
          <Popover.Trigger className={chipClasses} aria-label="Prazo">
            <ConteudoChip
              icone={<CalendarDays className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />}
              rotulo="Prazo"
              valor={prazo}
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className="z-50 w-[248px] rounded-lg border border-stroke bg-white p-3 shadow-[0_2px_8px_rgba(17,24,39,0.08)]"
            >
              <p className="label-track pb-1">Início</p>
              <input
                type="date"
                aria-label="Início do prazo"
                value={inicio ? iso(inicio) : ''}
                onChange={(e) => setInicio(e.target.value ? dia(e.target.value) : null)}
                className="h-8 w-full rounded-md border border-control px-2 text-[12px] text-ink outline-none focus:border-rosa"
              />
              <p className="label-track pb-1 pt-3">Fim</p>
              <input
                type="date"
                aria-label="Fim do prazo"
                value={fim ? iso(fim) : ''}
                onChange={(e) => setFim(e.target.value ? dia(e.target.value) : null)}
                className="h-8 w-full rounded-md border border-control px-2 text-[12px] text-ink outline-none focus:border-rosa"
              />
              {prazo && (
                <button
                  type="button"
                  onClick={() => {
                    setInicio(null)
                    setFim(null)
                  }}
                  className="mt-3 text-[12px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  Limpar prazo
                </button>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className={chipClasses} aria-label="Prioridade">
            <ConteudoChip
              icone={
                <Flag
                  className="h-3.5 w-3.5"
                  strokeWidth={1.75}
                  style={{ color: nivel?.cor ?? 'rgb(var(--muted))' }}
                />
              }
              rotulo="Prioridade"
              valor={nivel ? nivel.nome : null}
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
              {LISTA_PRIORIDADES.map((opcao) => (
                <DropdownMenu.Item
                  key={opcao.id}
                  className={itemClasses}
                  onSelect={() => setPrioridade(opcao.id)}
                >
                  <Flag className="h-3.5 w-3.5" strokeWidth={2} style={{ color: opcao.cor }} />
                  <span className="flex-1">{opcao.nome}</span>
                  {prioridade === opcao.id && <Check className="h-3.5 w-3.5 text-rosa" />}
                </DropdownMenu.Item>
              ))}
              {prioridade && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
                  <DropdownMenu.Item
                    className={cn(itemClasses, 'text-muted')}
                    onSelect={() => setPrioridade(null)}
                  >
                    Sem prioridade
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className={chipClasses} aria-label="Frente">
            <ConteudoChip
              icone={<Layers className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />}
              rotulo="Frente"
              valor={frente}
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
              {frentes.map((opcao) => (
                <DropdownMenu.Item
                  key={opcao}
                  className={itemClasses}
                  onSelect={() => setFrente(opcao)}
                >
                  <span className="flex-1">{opcao}</span>
                  {frente === opcao && <Check className="h-3.5 w-3.5 text-rosa" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="px-5 pt-3">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
          aria-label="Descrição"
          rows={3}
          className="w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-ink outline-none placeholder:text-muted"
        />
      </div>

      <div className="mt-2 flex items-center gap-3 border-t border-stroke px-5 py-3">
        <p role={erroVisivel ? 'alert' : undefined} className="flex-1 text-[12.5px] text-rosa">
          {erroVisivel}
        </p>
        <button
          type="button"
          onClick={onFechar}
          className="h-9 rounded-full px-3.5 text-[13px] text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-rosa/30"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={criar}
          className="h-9 rounded-full bg-rosa px-4 text-[13px] font-medium text-white outline-none hover:bg-rosa-escuro focus-visible:ring-2 focus-visible:ring-rosa/30"
        >
          Criar tarefa
        </button>
      </div>
    </div>
  )
}

/**
 * Diálogo de criação no fluxo do ClickUp: a tarefa nasce só com o nome, e todo
 * o resto entra por chips opcionais. Enter cria, Esc fecha.
 */
export function NovaTarefa({
  aberto,
  onFechar,
  onCriar,
  responsaveis,
  frentes,
}: {
  aberto: boolean
  onFechar: () => void
  onCriar: (tarefa: Tarefa) => void
  responsaveis: string[]
  frentes: readonly string[]
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[10vh] z-50 w-[620px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-card border border-stroke bg-white shadow-[0_8px_28px_rgba(17,17,17,0.10)]"
        >
          {/* Remontado a cada abertura: o formulário volta em branco sem effect. */}
          <Formulario
            onCriar={onCriar}
            onFechar={onFechar}
            responsaveis={responsaveis}
            frentes={frentes}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
