import { useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Minus, Plus, Send, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { BotaoPrimario, BotaoSecundario } from '@/components/ui'
import { cn } from '@/lib/format'
import {
  AREAS,
  criarConvite,
  emailDe,
  erroEmail,
  erroNome,
  PAPEIS,
  PERMISSOES,
  PERMISSOES_PADRAO,
  permissaoPorId,
  resumoAcesso,
  ROTULO_AREA,
  ROTULO_PAPEL,
  validarConvite,
  type Area,
  type Convite,
  type Membro,
  type Papel,
} from '@/lib/equipe'

export interface OpcaoGerente {
  id: string
  nome: string
  regiao?: string
}

const campoClasses =
  'h-8 w-full rounded-md border border-control bg-white px-2 text-[13px] text-ink outline-none focus:border-rosa'

const PASSOS = ['quem é', 'o que faz', 'o que acessa', 'revisão e envio']

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="border-t border-rosa-claro bg-rosa-fundo px-5 py-2.5 text-[12px] text-rosa-escuro"
    >
      {children}
    </p>
  )
}

/** Item das duas colunas do passo 3; o clique inteiro move a permissão de lado. */
function ItemAcesso({
  rotulo,
  texto,
  concedida,
  onClick,
}: {
  rotulo: string
  texto: string
  concedida: boolean
  onClick: () => void
}) {
  const Icone = concedida ? Minus : Plus
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={concedida ? `Tirar ${rotulo}` : `Liberar ${rotulo}`}
      className={cn(
        'flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
        concedida
          ? 'border-stroke bg-white hover:bg-hairline'
          : 'border-hairline bg-hairline/60 hover:bg-hairline',
      )}
    >
      <Icone
        className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', concedida ? 'text-muted' : 'text-rosa')}
        strokeWidth={2}
      />
      <span className="min-w-0">
        <span className={cn('block text-[13px]', concedida ? 'text-ink' : 'text-muted')}>
          {rotulo}
        </span>
        <span
          className={cn('mt-0.5 block text-[12px]', concedida ? 'text-muted' : 'text-rosa-escuro')}
        >
          {texto}
        </span>
      </span>
    </button>
  )
}

function ColunaAcesso({
  titulo,
  contagem,
  vazio,
  children,
}: {
  titulo: string
  contagem: number
  vazio: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="label-track mb-1.5 flex items-baseline justify-between gap-2">
        <span>{titulo}</span>
        <span className="num text-ink">{contagem}</span>
      </p>
      {contagem === 0 ? (
        <p className="rounded-md border border-dashed border-stroke px-2.5 py-3 text-[12px] text-muted">
          {vazio}
        </p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  )
}

/** Lista curta de rótulos usada na revisão e no estado de sucesso. */
function ListaRevisao({ ids, negada }: { ids: string[]; negada?: boolean }) {
  if (ids.length === 0) {
    return <p className="text-[12px] text-muted">— nada nesta lista</p>
  }
  return (
    <ul className="space-y-1">
      {ids.map((id) => (
        <li
          key={id}
          className={cn('flex items-start gap-1.5 text-[12px]', negada ? 'text-rosa-escuro' : 'text-ink')}
        >
          {negada ? (
            <X className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />
          ) : (
            <Check className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />
          )}
          {permissaoPorId(id)?.rotulo ?? id}
        </li>
      ))}
    </ul>
  )
}

export function ConvidarMembro({
  aberto,
  onFechar,
  onConvidar,
  gerentes,
  pracas,
  membros,
}: {
  aberto: boolean
  onFechar: () => void
  onConvidar: (convite: Convite) => void
  gerentes: OpcaoGerente[]
  pracas: string[]
  membros: Membro[]
}) {
  const [passo, setPasso] = useState(1)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [emailManual, setEmailManual] = useState(false)
  const [area, setArea] = useState<Area>('comercial')
  const [funcao, setFuncao] = useState('')
  const [papel, setPapel] = useState<Papel>('executivo')
  const [idGerente, setIdGerente] = useState('')
  const [pracasEscolhidas, setPracasEscolhidas] = useState<string[]>([])
  const [permissoes, setPermissoes] = useState<string[]>([...PERMISSOES_PADRAO.executivo])
  const [tentou, setTentou] = useState(false)
  const [enviado, setEnviado] = useState<Convite | null>(null)

  const entrada = {
    nome,
    email,
    area,
    funcao,
    papel,
    id_gerente: papel === 'executivo' && idGerente !== '' ? idGerente : null,
    pracas: pracasEscolhidas,
    permissoes,
  }

  const { pode, naoPode } = resumoAcesso(permissoes)

  const reiniciar = () => {
    setPasso(1)
    setNome('')
    setEmail('')
    setEmailManual(false)
    setArea('comercial')
    setFuncao('')
    setPapel('executivo')
    setIdGerente('')
    setPracasEscolhidas([])
    setPermissoes([...PERMISSOES_PADRAO.executivo])
    setTentou(false)
    setEnviado(null)
  }

  const fechar = () => {
    onFechar()
    reiniciar()
  }

  const erroDoPasso = (): string | null => {
    if (passo === 1) return erroNome(nome) ?? erroEmail(email, membros)
    if (passo === 2) {
      if (funcao.trim().length < 3) return 'Escreva a função dela, como está no crachá.'
      if (papel === 'executivo' && idGerente === '') return 'Escolha a quem ela responde.'
      return null
    }
    return validarConvite(entrada, membros)
  }

  const erro = erroDoPasso()

  const avancar = () => {
    setTentou(true)
    if (erro !== null) return
    setTentou(false)
    setPasso(passo + 1)
  }

  const voltar = () => {
    setTentou(false)
    setPasso(passo - 1)
  }

  const trocarPapel = (p: Papel) => {
    setPapel(p)
    if (p !== 'executivo') setIdGerente('')
    // O padrão do papel recém-escolhido é o ponto de partida do passo 3.
    setPermissoes([...PERMISSOES_PADRAO[p]])
  }

  const enviar = () => {
    setTentou(true)
    if (erro !== null) return
    const convite = criarConvite(entrada)
    onConvidar(convite)
    setEnviado(convite)
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && fechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[84vh] w-[620px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-stroke bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-stroke px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold text-ink">
                {enviado ? 'Convite enviado' : 'Convidar membro'}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 truncate text-[13px] text-muted">
                {enviado
                  ? 'Ela entra no time quando aceitar.'
                  : `Passo ${passo} de 4 · ${PASSOS[passo - 1]}`}
              </Dialog.Description>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={fechar}
              className="rounded p-1 text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-rosa/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!enviado && (
            <div className="flex gap-1 px-5 pt-3">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={cn('h-1 flex-1 rounded-full', n <= passo ? 'bg-rosa' : 'bg-hairline')}
                />
              ))}
            </div>
          )}

          <div className="max-h-[56vh] overflow-y-auto px-5 py-4">
            {enviado ? (
              <div className="flex flex-col items-center py-4 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rosa-fundo">
                  <Send className="h-4 w-4 text-rosa-escuro" strokeWidth={2} />
                </span>
                <p className="mt-3 text-[14px] font-medium text-ink">
                  Convite enviado para {enviado.email}
                </p>
                <p className="mt-1 max-w-[420px] text-[13px] text-muted">
                  O convite fica <span className="text-rosa-escuro">pendente</span> até{' '}
                  {enviado.nome.split(' ')[0]} aceitar. Até lá ela não entra no painel e nada do que
                  você liberou vale.
                </p>
                <div className="mt-4 w-full max-w-[420px] card px-3 py-2.5 text-left">
                  <p className="text-[12px] text-muted">
                    {ROTULO_AREA[enviado.area]} · {enviado.funcao} · {ROTULO_PAPEL[enviado.papel]}
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    Vai acessar {pode.length} de {PERMISSOES.length} áreas do painel quando aceitar.
                  </p>
                </div>
              </div>
            ) : passo === 1 ? (
              <div className="space-y-3">
                <div>
                  <label className="label-track mb-1 block" htmlFor="convite-nome">
                    Nome completo
                  </label>
                  <input
                    id="convite-nome"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value)
                      if (!emailManual) setEmail(emailDe(e.target.value))
                    }}
                    placeholder="Ex.: Marina Prado"
                    className={campoClasses}
                  />
                </div>
                <div>
                  <label className="label-track mb-1 block" htmlFor="convite-email">
                    E-mail corporativo
                  </label>
                  <input
                    id="convite-email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailManual(true)
                    }}
                    placeholder="nome.sobrenome@99app.com"
                    className={campoClasses}
                  />
                  <p className="mt-1 text-[12px] text-muted">
                    Sugerido a partir do nome. Dá para trocar. É para lá que o convite vai.
                  </p>
                </div>
              </div>
            ) : passo === 2 ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-1/2">
                    <label className="label-track mb-1 block" htmlFor="convite-area">
                      Área
                    </label>
                    <select
                      id="convite-area"
                      value={area}
                      onChange={(e) => setArea(e.target.value as Area)}
                      className={campoClasses}
                    >
                      {AREAS.map((a) => (
                        <option key={a} value={a}>
                          {ROTULO_AREA[a]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="label-track mb-1 block" htmlFor="convite-funcao">
                      Função
                    </label>
                    <input
                      id="convite-funcao"
                      value={funcao}
                      onChange={(e) => setFuncao(e.target.value)}
                      placeholder="Ex.: Executiva de contas pleno"
                      className={campoClasses}
                    />
                  </div>
                </div>

                <div>
                  <p className="label-track mb-1">Papel</p>
                  <div className="space-y-1.5">
                    {PAPEIS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => trocarPapel(p)}
                        className={cn(
                          'block w-full rounded-md border px-3 py-2 text-left',
                          papel === p
                            ? 'border-rosa bg-rosa-fundo'
                            : 'border-control hover:bg-hairline',
                        )}
                      >
                        <span className="text-[13px] font-medium text-ink">{ROTULO_PAPEL[p]}</span>
                        <span className="mt-0.5 block text-[12px] text-muted">
                          {PERMISSOES_PADRAO[p].length} de {PERMISSOES.length} acessos por padrão —
                          você ajusta no passo seguinte
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {papel === 'executivo' && (
                  <div>
                    <label className="label-track mb-1 block" htmlFor="convite-gerente">
                      Responde a
                    </label>
                    <select
                      id="convite-gerente"
                      value={idGerente}
                      onChange={(e) => setIdGerente(e.target.value)}
                      className={campoClasses}
                    >
                      <option value="">Selecione o gerente</option>
                      {gerentes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nome}
                          {g.regiao ? ` — ${g.regiao}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <p className="label-track mb-1">Praças</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pracas.map((p) => {
                      const marcada = pracasEscolhidas.includes(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={marcada}
                          onClick={() =>
                            setPracasEscolhidas((atual) =>
                              marcada ? atual.filter((x) => x !== p) : [...atual, p],
                            )
                          }
                          className={cn(
                            'h-7 rounded-full border px-2.5 text-[12px]',
                            marcada
                              ? 'border-rosa bg-rosa-fundo text-rosa-escuro'
                              : 'border-stroke bg-white text-ink hover:bg-hairline',
                          )}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted">
                    Sem praça marcada, ela vê o recorte inteiro do gerente.
                  </p>
                </div>

              </div>
            ) : passo === 3 ? (
              <div>
                <p className="text-[13px] text-muted">
                  Começa no padrão de {ROTULO_PAPEL[papel]}. Clique em qualquer linha para mover de
                  lado.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <ColunaAcesso
                    titulo="Pode acessar"
                    contagem={pode.length}
                    vazio="Nada liberado. Um convite assim não abre o painel."
                  >
                    {pode.map((id) => {
                      const p = permissaoPorId(id)
                      if (!p) return null
                      return (
                        <ItemAcesso
                          key={id}
                          rotulo={p.rotulo}
                          texto={p.descricao}
                          concedida
                          onClick={() =>
                            setPermissoes((atual) => atual.filter((x) => x !== id))
                          }
                        />
                      )
                    })}
                  </ColunaAcesso>

                  <ColunaAcesso
                    titulo="Não pode acessar"
                    contagem={naoPode.length}
                    vazio="Acesso total: ela vê e mexe em tudo."
                  >
                    {naoPode.map((id) => {
                      const p = permissaoPorId(id)
                      if (!p) return null
                      return (
                        <ItemAcesso
                          key={id}
                          rotulo={p.rotulo}
                          texto={p.semAcesso}
                          concedida={false}
                          onClick={() => setPermissoes((atual) => [...atual, id])}
                        />
                      )
                    })}
                  </ColunaAcesso>
                </div>
              </div>
            ) : (
              <div>
                <div className="card flex items-center gap-3 px-3 py-3">
                  <Avatar nome={nome.trim() || '?'} tamanho="lg" anel={false} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{nome.trim()}</p>
                    <p className="truncate text-[12px] text-muted">{email.trim().toLowerCase()}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {ROTULO_AREA[area]} · {funcao.trim()} · {ROTULO_PAPEL[papel]}
                      {papel === 'executivo' && idGerente
                        ? ` · responde a ${gerentes.find((g) => g.id === idGerente)?.nome ?? idGerente}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="label-track mb-1.5">
                      Pode acessar · {pode.length} de {PERMISSOES.length}
                    </p>
                    <ListaRevisao ids={pode} />
                  </div>
                  <div>
                    <p className="label-track mb-1.5">
                      Não pode acessar · {naoPode.length} de {PERMISSOES.length}
                    </p>
                    <ListaRevisao ids={naoPode} negada />
                  </div>
                </div>

                <div className="mt-3 border-t border-hairline pt-3 text-[12px] text-muted">
                  Praças:{' '}
                  {pracasEscolhidas.length === 0
                    ? 'todas as do gerente'
                    : pracasEscolhidas.join(' · ')}
                </div>
              </div>
            )}
          </div>

          {/* Fora da área rolável: o erro não pode ficar abaixo da dobra. */}
          {!enviado && tentou && erro && <Aviso>{erro}</Aviso>}

          <div className="flex items-center justify-between gap-3 border-t border-stroke px-5 py-3">
            {enviado ? (
              <>
                <span className="text-[13px] text-muted">
                  Já está na tabela como convite pendente.
                </span>
                <BotaoPrimario onClick={fechar}>Concluir</BotaoPrimario>
              </>
            ) : (
              <>
                {passo === 1 ? (
                  <BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario>
                ) : (
                  <BotaoSecundario onClick={voltar}>Voltar</BotaoSecundario>
                )}
                {passo < 4 ? (
                  <BotaoPrimario onClick={avancar}>Continuar</BotaoPrimario>
                ) : (
                  <BotaoPrimario onClick={enviar}>
                    <Send className="h-3.5 w-3.5" strokeWidth={2} />
                    Enviar convite
                  </BotaoPrimario>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
