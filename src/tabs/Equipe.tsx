import { useMemo, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, KeyRound, RotateCcw, UserPlus, UserRound, X } from 'lucide-react'
import { Coluna, DataTable } from '@/components/DataTable'
import { Badge, BotaoPrimario, BotaoSecundario, Vazio, type Tom } from '@/components/ui'
import { dataset } from '@/data/seed'
import { cn } from '@/lib/format'
import {
  emailDe,
  equipeInicial,
  listarPermissoes,
  PAPEIS,
  PERMISSOES,
  PERMISSOES_PADRAO,
  ROTULO_PAPEL,
  type Membro,
  type Papel,
} from '@/lib/equipe'
import { nomeGerente, type Filtros } from '@/lib/queries'

const menuClasses =
  'z-50 min-w-[220px] max-h-[320px] overflow-y-auto rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(17,24,39,0.08)]'

const itemClasses =
  'flex cursor-pointer select-none items-center justify-between gap-3 rounded px-2 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hairline'

const campoClasses =
  'h-8 w-full rounded-md border border-control bg-white px-2 text-[13px] text-ink outline-none focus:border-rosa'

const TOM_PAPEL: Record<Papel, Tom> = {
  gerente: 'rosa',
  executivo: 'amarelo',
  analista: 'cinza',
}

function ChipConteudo({
  icone: Icone,
  label,
  valor,
  ativo,
}: {
  icone: typeof UserRound
  label: string
  valor: string
  ativo: boolean
}) {
  return (
    <>
      <Icone className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
      <span className="text-muted">{label}</span>
      <span className={cn('font-medium', ativo ? 'text-rosa' : 'text-ink')}>{valor}</span>
      <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
    </>
  )
}

function Checkbox({
  marcado,
  onChange,
  rotulo,
  descricao,
}: {
  marcado: boolean
  onChange: (v: boolean) => void
  rotulo: string
  descricao?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-hairline">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-rosa"
      />
      <span className="min-w-0">
        <span className="block text-[13px] text-ink">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-[12px] text-muted">{descricao}</span>}
      </span>
    </label>
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
            <Dialog.Description className="mt-0.5 truncate text-[13px] text-muted">
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

function DialogEditar({
  membro,
  onFechar,
  onSalvar,
}: {
  membro: Membro
  onFechar: () => void
  onSalvar: (m: Membro) => void
}) {
  const [permissoes, setPermissoes] = useState<string[]>(membro.permissoes)
  const [ativo, setAtivo] = useState(membro.ativo)

  const alternar = (id: string, marcado: boolean) =>
    setPermissoes((atual) => (marcado ? [...atual, id] : atual.filter((x) => x !== id)))

  return (
    <Dialog.Root open onOpenChange={(aberto) => !aberto && onFechar()}>
      <Moldura
        titulo={membro.nome}
        descricao={`${membro.email} · ${ROTULO_PAPEL[membro.papel]}`}
        onFechar={onFechar}
      >
        <div className="max-h-[52vh] overflow-y-auto px-3 py-3">
          <p className="label-track px-2 pb-1">O que este membro pode fazer</p>
          {PERMISSOES.map((p) => (
            <Checkbox
              key={p.id}
              marcado={permissoes.includes(p.id)}
              onChange={(v) => alternar(p.id, v)}
              rotulo={p.rotulo}
              descricao={p.descricao}
            />
          ))}

          <div className="mt-2 border-t border-hairline px-2 pt-3">
            <p className="label-track pb-1">Acesso</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted">
                {ativo
                  ? 'Membro ativo: entra no painel e aparece nos relatórios.'
                  : 'Membro inativo: perde o acesso, mas o histórico continua.'}
              </p>
              <BotaoSecundario onClick={() => setAtivo((v) => !v)}>
                {ativo ? 'Desativar membro' : 'Reativar membro'}
              </BotaoSecundario>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-stroke px-5 py-3">
          <span className="text-[13px] text-muted">
            {permissoes.length} de {PERMISSOES.length} permissões
          </span>
          <div className="flex items-center gap-2">
            <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
            <BotaoPrimario onClick={() => onSalvar({ ...membro, permissoes, ativo })}>
              Salvar alterações
            </BotaoPrimario>
          </div>
        </div>
      </Moldura>
    </Dialog.Root>
  )
}

function DialogAdicionar({
  aberto,
  onOpenChange,
  onAdicionar,
}: {
  aberto: boolean
  onOpenChange: (v: boolean) => void
  onAdicionar: (m: Omit<Membro, 'id'>) => void
}) {
  const [passo, setPasso] = useState(1)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [emailManual, setEmailManual] = useState(false)
  const [papel, setPapel] = useState<Papel>('executivo')
  const [idGerente, setIdGerente] = useState('')
  const [permissoes, setPermissoes] = useState<string[]>([])
  const [salvo, setSalvo] = useState(false)

  const reiniciar = () => {
    setPasso(1)
    setNome('')
    setEmail('')
    setEmailManual(false)
    setPapel('executivo')
    setIdGerente('')
    setPermissoes([])
    setSalvo(false)
  }

  const fechar = () => {
    onOpenChange(false)
    reiniciar()
  }

  const podeAvancar =
    passo === 1
      ? nome.trim().length > 2 && /.+@.+\..+/.test(email.trim())
      : papel !== 'executivo' || idGerente !== ''

  const salvar = () => {
    onAdicionar({
      nome: nome.trim(),
      email: email.trim(),
      papel,
      id_gerente: papel === 'executivo' ? idGerente : null,
      pracas: [],
      permissoes,
      ativo: true,
    })
    setSalvo(true)
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => (v ? onOpenChange(true) : fechar())}>
      <Moldura
        titulo={salvo ? 'Membro adicionado' : 'Adicionar membro'}
        descricao={
          salvo
            ? 'O acesso já vale para o próximo login.'
            : `Passo ${passo} de 3 · ${
                passo === 1 ? 'quem é' : passo === 2 ? 'o que faz' : 'o que pode fazer'
              }`
        }
        onFechar={fechar}
      >
        {!salvo && (
          <div className="flex gap-1 px-5 pt-3">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn('h-1 flex-1 rounded-full', n <= passo ? 'bg-rosa' : 'bg-hairline')}
              />
            ))}
          </div>
        )}

        <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
          {salvo ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rosa-fundo">
                <Check className="h-4 w-4 text-rosa-escuro" strokeWidth={2.5} />
              </span>
              <p className="mt-3 text-[14px] font-medium text-ink">{nome.trim()} entrou no time</p>
              <p className="mt-1 max-w-[380px] text-[13px] text-muted">
                {ROTULO_PAPEL[papel]} · {permissoes.length} de {PERMISSOES.length} permissões
                {papel === 'executivo' && idGerente ? ` · responde a ${nomeGerente(idGerente)}` : ''}
              </p>
            </div>
          ) : passo === 1 ? (
            <div className="space-y-3">
              <div>
                <label className="label-track mb-1 block" htmlFor="equipe-nome">
                  Nome completo
                </label>
                <input
                  id="equipe-nome"
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
                <label className="label-track mb-1 block" htmlFor="equipe-email">
                  E-mail corporativo
                </label>
                <input
                  id="equipe-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailManual(true)
                  }}
                  placeholder="nome.sobrenome@99app.com"
                  className={campoClasses}
                />
                <p className="mt-1 text-[12px] text-muted">
                  Sugerido a partir do nome. Dá para trocar.
                </p>
              </div>
            </div>
          ) : passo === 2 ? (
            <div className="space-y-3">
              <div>
                <p className="label-track mb-1">Papel</p>
                <div className="space-y-1.5">
                  {PAPEIS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPapel(p)
                        if (p !== 'executivo') setIdGerente('')
                      }}
                      className={cn(
                        'block w-full rounded-md border px-3 py-2 text-left',
                        papel === p ? 'border-rosa bg-rosa-fundo' : 'border-control hover:bg-hairline',
                      )}
                    >
                      <span className="text-[13px] font-medium text-ink">{ROTULO_PAPEL[p]}</span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {PERMISSOES_PADRAO[p].length} de {PERMISSOES.length} permissões por padrão
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {papel === 'executivo' && (
                <div>
                  <label className="label-track mb-1 block" htmlFor="equipe-gerente">
                    Responde a
                  </label>
                  <select
                    id="equipe-gerente"
                    value={idGerente}
                    onChange={(e) => setIdGerente(e.target.value)}
                    className={campoClasses}
                  >
                    <option value="">Selecione o gerente</option>
                    {dataset.gerentes.map((g) => (
                      <option key={g.id_gerente} value={g.id_gerente}>
                        {g.nome} — {g.regiao}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="card px-3 py-2.5">
                <p className="text-[13px] font-medium text-ink">{nome.trim()}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {email.trim()} · {ROTULO_PAPEL[papel]}
                  {papel === 'executivo' && idGerente ? ` · ${nomeGerente(idGerente)}` : ''}
                </p>
              </div>
              <p className="label-track mb-1 mt-3">Permissões</p>
              {PERMISSOES.map((p) => (
                <Checkbox
                  key={p.id}
                  marcado={permissoes.includes(p.id)}
                  onChange={(v) =>
                    setPermissoes((atual) =>
                      v ? [...atual, p.id] : atual.filter((x) => x !== p.id),
                    )
                  }
                  rotulo={p.rotulo}
                  descricao={p.descricao}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-stroke px-5 py-3">
          {salvo ? (
            <>
              <span className="text-[13px] text-muted">Já aparece na tabela do time.</span>
              <BotaoPrimario onClick={fechar}>Concluir</BotaoPrimario>
            </>
          ) : (
            <>
              {passo === 1 ? (
                <BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario>
              ) : (
                <BotaoSecundario onClick={() => setPasso(passo - 1)}>Voltar</BotaoSecundario>
              )}
              {passo < 3 ? (
                <BotaoPrimario
                  disabled={!podeAvancar}
                  onClick={() => {
                    // O passo 3 sempre reflete o papel escolhido agora, mesmo se ele mudou no Voltar.
                    if (passo === 2) setPermissoes([...PERMISSOES_PADRAO[papel]])
                    setPasso(passo + 1)
                  }}
                >
                  Continuar
                </BotaoPrimario>
              ) : (
                <BotaoPrimario onClick={salvar}>Adicionar membro</BotaoPrimario>
              )}
            </>
          )}
        </div>
      </Moldura>
    </Dialog.Root>
  )
}

export function Equipe({ filtros }: { filtros: Filtros }) {
  const [equipe, setEquipe] = useState<Membro[]>(() => equipeInicial())
  const [papelFiltro, setPapelFiltro] = useState<Papel | null>(null)
  const [permissoesFiltro, setPermissoesFiltro] = useState<string[]>([])
  const [editando, setEditando] = useState<Membro | null>(null)
  const [adicionando, setAdicionando] = useState(false)

  const noEscopoGlobal = useMemo(() => {
    return equipe.filter((m) => {
      if (filtros.gerentes.length > 0) {
        const dele = m.papel === 'gerente' ? m.id : m.id_gerente
        if (dele === null || !filtros.gerentes.includes(dele)) return false
      }
      // Quem ainda não tem praça atribuída não é excluído por um recorte de praça.
      if (filtros.praca !== null && m.pracas.length > 0 && !m.pracas.includes(filtros.praca)) {
        return false
      }
      return true
    })
  }, [equipe, filtros.gerentes, filtros.praca])

  const linhas = useMemo(() => {
    return noEscopoGlobal.filter((m) => {
      if (papelFiltro !== null && m.papel !== papelFiltro) return false
      return permissoesFiltro.every((p) => m.permissoes.includes(p))
    })
  }, [noEscopoGlobal, papelFiltro, permissoesFiltro])

  const ativos = linhas.filter((m) => m.ativo).length
  const filtroDaAba = papelFiltro !== null || permissoesFiltro.length > 0
  const filtroGlobal = filtros.gerentes.length > 0 || filtros.praca !== null

  const colunas: Coluna<Membro>[] = [
    {
      chave: 'membro',
      label: 'Membro',
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
      chave: 'gerente',
      label: 'Gerente',
      larguraMin: '150px',
      valor: (m) => (m.id_gerente ? nomeGerente(m.id_gerente) : ''),
      render: (m) =>
        m.id_gerente ? (
          nomeGerente(m.id_gerente)
        ) : (
          <span className="text-muted">— sem gerente</span>
        ),
    },
    {
      chave: 'pracas',
      label: 'Praças',
      larguraMin: '180px',
      valor: (m) => m.pracas.length,
      render: (m) =>
        m.pracas.length === 0 ? (
          <span className="text-muted">— a definir</span>
        ) : (
          <span title={m.pracas.join(', ')}>
            {m.pracas.slice(0, 2).join(' · ')}
            {m.pracas.length > 2 && (
              <span className="text-muted"> +{m.pracas.length - 2}</span>
            )}
          </span>
        ),
    },
    {
      chave: 'permissoes',
      label: 'Permissões',
      numerica: true,
      valor: (m) => m.permissoes.length,
      render: (m) => (
        <span title={listarPermissoes(m.permissoes)}>
          {m.permissoes.length} de {PERMISSOES.length}
        </span>
      ),
    },
    {
      chave: 'status',
      label: 'Status',
      valor: (m) => m.ativo,
      render: (m) =>
        m.ativo ? <Badge tom="verde">Ativo</Badge> : <Badge tom="cinza">Inativo</Badge>,
    },
  ]

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <p className="text-[13px] text-muted">
          {linhas.length === equipe.length
            ? `${equipe.length} membros no time · ${ativos} ativos.`
            : `${linhas.length} de ${equipe.length} membros no recorte · ${ativos} ativos.`}
        </p>
        <BotaoPrimario onClick={() => setAdicionando(true)}>
          <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
          Adicionar membro
        </BotaoPrimario>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="chip">
            <ChipConteudo
              icone={UserRound}
              label="Papel"
              valor={papelFiltro === null ? 'Todos' : ROTULO_PAPEL[papelFiltro]}
              ativo={papelFiltro !== null}
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
              <DropdownMenu.Item className={itemClasses} onSelect={() => setPapelFiltro(null)}>
                Todos
                {papelFiltro === null && <Check className="h-3.5 w-3.5 text-rosa" />}
              </DropdownMenu.Item>
              {PAPEIS.map((p) => (
                <DropdownMenu.Item
                  key={p}
                  className={itemClasses}
                  onSelect={() => setPapelFiltro(p)}
                >
                  {ROTULO_PAPEL[p]}
                  {papelFiltro === p && <Check className="h-3.5 w-3.5 text-rosa" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="chip">
            <ChipConteudo
              icone={KeyRound}
              label="Pode"
              valor={
                permissoesFiltro.length === 0
                  ? 'Qualquer coisa'
                  : permissoesFiltro.length === 1
                    ? PERMISSOES.find((p) => p.id === permissoesFiltro[0])?.rotulo ?? '1 permissão'
                    : `${permissoesFiltro.length} permissões`
              }
              ativo={permissoesFiltro.length > 0}
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
              <p className="px-2 py-1.5 text-[12px] text-muted">
                Mostra só quem tem todas as permissões marcadas.
              </p>
              {PERMISSOES.map((p) => (
                <DropdownMenu.CheckboxItem
                  key={p.id}
                  checked={permissoesFiltro.includes(p.id)}
                  onCheckedChange={(marcado) =>
                    setPermissoesFiltro((atual) =>
                      marcado ? [...atual, p.id] : atual.filter((x) => x !== p.id),
                    )
                  }
                  onSelect={(e) => e.preventDefault()}
                  className={itemClasses}
                >
                  {p.rotulo}
                  <DropdownMenu.ItemIndicator>
                    <Check className="h-3.5 w-3.5 text-rosa" strokeWidth={2.5} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.CheckboxItem>
              ))}
              {permissoesFiltro.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPermissoesFiltro([])}
                  className="mt-1 w-full border-t border-hairline px-2 pb-1 pt-2 text-left text-[12px] text-muted hover:text-ink"
                >
                  Limpar seleção
                </button>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {filtroDaAba && (
          <button
            type="button"
            onClick={() => {
              setPapelFiltro(null)
              setPermissoesFiltro([])
            }}
            className="chip text-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Limpar filtros da aba
          </button>
        )}
      </div>

      {linhas.length === 0 ? (
        <div className="card">
          <Vazio
            titulo="Nenhum membro com esse recorte"
            dica={
              filtroDaAba
                ? 'Afrouxe o filtro de papel ou tire uma permissão da lista — quanto mais permissões marcadas, menos gente sobra.'
                : filtroGlobal
                  ? 'O filtro de gerente ou de praça no topo da página está deixando o time de fora. Limpe o filtro global para ver todo mundo.'
                  : 'O time está vazio. Use "Adicionar membro" para começar.'
            }
            acao={
              filtroDaAba ? (
                <BotaoSecundario
                  onClick={() => {
                    setPapelFiltro(null)
                    setPermissoesFiltro([])
                  }}
                >
                  Limpar filtros da aba
                </BotaoSecundario>
              ) : (
                <BotaoPrimario onClick={() => setAdicionando(true)}>Adicionar membro</BotaoPrimario>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          colunas={colunas}
          linhas={linhas}
          chaveDe={(m) => m.id}
          ordemInicial={{ chave: 'membro', asc: true }}
          busca={{
            placeholder: 'Buscar por nome, e-mail ou praça',
            campos: (m) => `${m.nome} ${m.email} ${ROTULO_PAPEL[m.papel]} ${m.pracas.join(' ')}`,
          }}
          onLinhaClick={(m) => setEditando(m)}
          vazio={{
            titulo: 'Nenhum membro com esse termo',
            dica: 'A busca procura por nome, e-mail, papel e praça. Apague o termo para ver a lista inteira.',
          }}
        />
      )}

      {editando && (
        <DialogEditar
          key={editando.id}
          membro={editando}
          onFechar={() => setEditando(null)}
          onSalvar={(m) => {
            setEquipe((atual) => atual.map((x) => (x.id === m.id ? m : x)))
            setEditando(null)
          }}
        />
      )}

      <DialogAdicionar
        aberto={adicionando}
        onOpenChange={setAdicionando}
        onAdicionar={(novo) =>
          setEquipe((atual) => [...atual, { ...novo, id: `M${atual.length + 1}-${Date.now()}` }])
        }
      />
    </div>
  )
}
