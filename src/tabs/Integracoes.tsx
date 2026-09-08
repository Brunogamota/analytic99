import { useMemo, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDownLeft, ArrowUpRight, Check, RotateCcw, Search, TriangleAlert, X } from 'lucide-react'
import { Badge, BotaoPrimario, BotaoSecundario, SecaoTitulo, Vazio, type Tom } from '@/components/ui'
import { cn } from '@/lib/format'
import {
  CATEGORIAS,
  corFundo,
  escopoDe,
  INTEGRACOES,
  ROTULO_CATEGORIA,
  ROTULO_ESTADO,
  type CategoriaIntegracao,
  type EstadoIntegracao,
  type Integracao,
} from '@/lib/integracoes'

const TOM_ESTADO: Record<EstadoIntegracao, Tom> = {
  nao_conectado: 'cinza',
  aguardando_credenciais: 'amarelo',
  indisponivel: 'cinza',
}

/**
 * Logo oficial pintado por máscara: o SVG do simple-icons não traz `fill`, então
 * `<img>` sairia preto. Sem logo distribuído pela marca, monograma — nunca um
 * desenho de memória passando por logo oficial.
 */
function Marca({ integracao, tamanho = 40 }: { integracao: Integracao; tamanho?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: tamanho, height: tamanho, backgroundColor: corFundo(integracao.cor) }}
      className="flex shrink-0 items-center justify-center rounded-lg"
    >
      {integracao.logo ? (
        <span
          style={{
            width: Math.round(tamanho * 0.55),
            height: Math.round(tamanho * 0.55),
            backgroundColor: integracao.cor,
            maskImage: `url(${integracao.logo})`,
            WebkitMaskImage: `url(${integracao.logo})`,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
      ) : (
        <span
          style={{ color: integracao.cor }}
          className={cn(
            'font-semibold leading-none',
            integracao.sigla.length > 2 ? 'text-[12px]' : 'text-[14px]',
          )}
        >
          {integracao.sigla}
        </span>
      )}
    </span>
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
  descricao: string
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
        <span className="mt-0.5 block text-[12px] text-muted">{descricao}</span>
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
  titulo: ReactNode
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

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 py-1.5">
      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-control" />
      <span className="text-[13px] leading-5 text-ink">{children}</span>
    </li>
  )
}

const ROTULO_PASSO = ['o que faz', 'o que sai e o que entra', 'o que falta']

function DialogConfigurar({
  integracao,
  onFechar,
  onMarcar,
}: {
  integracao: Integracao
  onFechar: () => void
  onMarcar: () => void
}) {
  const escopo = escopoDe(integracao.id)
  const [passo, setPasso] = useState(1)
  const [marcados, setMarcados] = useState<string[]>(() => escopo.map((e) => e.id))
  const [concluido, setConcluido] = useState(false)
  const jaAguardando = integracao.estado === 'aguardando_credenciais'

  const sai = escopo.filter((e) => e.direcao === 'saida')
  const entra = escopo.filter((e) => e.direcao === 'entrada')

  const alternar = (id: string, v: boolean) =>
    setMarcados((atual) => (v ? [...atual, id] : atual.filter((x) => x !== id)))

  const grupo = (titulo: string, icone: ReactNode, itens: typeof escopo) =>
    itens.length === 0 ? null : (
      <div className="mb-2">
        <p className="label-track flex items-center gap-1.5 px-2 pb-1">
          {icone}
          {titulo}
        </p>
        {itens.map((e) => (
          <Checkbox
            key={e.id}
            marcado={marcados.includes(e.id)}
            onChange={(v) => alternar(e.id, v)}
            rotulo={e.rotulo}
            descricao={e.descricao}
          />
        ))}
      </div>
    )

  return (
    <Dialog.Root open onOpenChange={(aberto) => !aberto && onFechar()}>
      <Moldura
        titulo={
          <span className="flex items-center gap-2.5">
            <Marca integracao={integracao} tamanho={28} />
            {integracao.nome}
          </span>
        }
        descricao={
          concluido
            ? 'Registrado como pendência. Nada foi conectado.'
            : `Passo ${passo} de 3 · ${ROTULO_PASSO[passo - 1]}`
        }
        onFechar={onFechar}
      >
        {!concluido && (
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
          {concluido ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amarelo-fundo">
                <Check className="h-4 w-4 text-[#8A6D00]" strokeWidth={2.5} />
              </span>
              <p className="mt-3 text-[14px] font-medium text-ink">
                {integracao.nome} está aguardando credenciais
              </p>
              <p className="mt-1 max-w-[400px] text-[13px] text-muted">
                A troca de dados não começou e não vai começar sozinha: o card só passa a lembrar
                que o pedido existe e o que falta resolver fora daqui.
              </p>
            </div>
          ) : passo === 1 ? (
            <div>
              <p className="label-track pb-1">O que essa integração faria aqui</p>
              <ul>
                {integracao.oQueFaz.map((frase) => (
                  <Item key={frase}>{frase}</Item>
                ))}
              </ul>
              <p className="mt-3 rounded-md bg-hairline px-3 py-2 text-[12px] leading-5 text-muted">
                Nada disso funciona hoje. Esta tela descreve o combinado e registra o que falta.
              </p>
            </div>
          ) : passo === 2 ? (
            <div>
              <p className="mb-2 text-[13px] leading-5 text-muted">
                Escopo do que trafegaria entre o dashboard e o {integracao.nome}. Desmarque o que
                sua área não autoriza — a lista final é o que o time de TI vai receber.
              </p>
              {grupo(
                'Sai do dashboard',
                <ArrowUpRight className="h-3.5 w-3.5 text-laranja-escuro" strokeWidth={2} />,
                sai,
              )}
              {grupo(
                'Entra no dashboard',
                <ArrowDownLeft className="h-3.5 w-3.5 text-verde" strokeWidth={2} />,
                entra,
              )}
            </div>
          ) : (
            <div>
              <p className="label-track pb-1">O que falta para valer de verdade</p>
              <ul>
                {integracao.oQueFalta.map((frase) => (
                  <Item key={frase}>{frase}</Item>
                ))}
              </ul>
              <p className="mt-3 rounded-md bg-amarelo-fundo px-3 py-2 text-[12px] leading-5 text-[#8A6D00]">
                Marcar como aguardando credenciais não conecta nada e não dispara pedido nenhum:
                é um lembrete na tela de que a pendência é de fora do produto.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-stroke px-5 py-3">
          {concluido ? (
            <>
              <span className="text-[13px] text-muted">
                {marcados.length} de {escopo.length} itens de escopo autorizados.
              </span>
              <BotaoPrimario onClick={onFechar}>Concluir</BotaoPrimario>
            </>
          ) : (
            <>
              {passo === 1 ? (
                <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
              ) : (
                <BotaoSecundario onClick={() => setPasso(passo - 1)}>Voltar</BotaoSecundario>
              )}
              {passo < 3 ? (
                <BotaoPrimario onClick={() => setPasso(passo + 1)}>Continuar</BotaoPrimario>
              ) : jaAguardando ? (
                <BotaoPrimario onClick={onFechar}>Já está aguardando · fechar</BotaoPrimario>
              ) : (
                <BotaoPrimario
                  onClick={() => {
                    onMarcar()
                    setConcluido(true)
                  }}
                >
                  Marcar como aguardando credenciais
                </BotaoPrimario>
              )}
            </>
          )}
        </div>
      </Moldura>
    </Dialog.Root>
  )
}

function Card({ integracao, onAbrir }: { integracao: Integracao; onAbrir: () => void }) {
  const indisponivel = integracao.estado === 'indisponivel'

  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start gap-3">
        <Marca integracao={integracao} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{integracao.nome}</p>
          <p className="mt-0.5 text-[12px] text-muted">{ROTULO_CATEGORIA[integracao.categoria]}</p>
        </div>
        <Badge tom={TOM_ESTADO[integracao.estado]}>{ROTULO_ESTADO[integracao.estado]}</Badge>
      </div>

      <p className="mt-3 flex-1 text-[13px] leading-5 text-muted">{integracao.resumo}</p>

      <div className="mt-3">
        <BotaoSecundario onClick={onAbrir}>
          {indisponivel
            ? 'Ver o que impede'
            : integracao.estado === 'aguardando_credenciais'
              ? 'Ver configuração'
              : 'Conectar'}
        </BotaoSecundario>
      </div>
    </div>
  )
}

export function Integracoes() {
  const [lista, setLista] = useState<Integracao[]>(() => INTEGRACOES.map((i) => ({ ...i })))
  const [categoria, setCategoria] = useState<CategoriaIntegracao | null>(null)
  const [termo, setTermo] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)

  const visiveis = useMemo(() => {
    const busca = termo.trim().toLowerCase()
    return lista.filter((i) => {
      if (categoria !== null && i.categoria !== categoria) return false
      if (busca && !`${i.nome} ${ROTULO_CATEGORIA[i.categoria]}`.toLowerCase().includes(busca)) {
        return false
      }
      return true
    })
  }, [lista, categoria, termo])

  const disponiveis = lista.filter((i) => i.estado !== 'indisponivel').length
  const aguardando = lista.filter((i) => i.estado === 'aguardando_credenciais').length
  const filtrando = categoria !== null || termo.trim() !== ''
  const emFoco = aberta === null ? null : (lista.find((i) => i.id === aberta) ?? null)

  const limpar = () => {
    setCategoria(null)
    setTermo('')
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-card bg-amarelo-fundo px-3.5 py-2.5 text-[13px] leading-5 text-[#8A6D00]">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <p>
          Catálogo de integrações: nenhuma delas troca dados com o dashboard ainda — configurar
          aqui só registra o escopo e o que falta para ligar de verdade.
        </p>
      </div>

      <SecaoTitulo
        titulo="Integrações"
        descricao={`${disponiveis} disponíveis para configurar · ${aguardando} aguardando credenciais.`}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={categoria === null}
          onClick={() => setCategoria(null)}
          className="chip"
        >
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={categoria === c}
            onClick={() => setCategoria(c)}
            className="chip"
          >
            {ROTULO_CATEGORIA[c]}
          </button>
        ))}

        <label className="chip ml-auto w-[240px] cursor-text">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar integração"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
          />
        </label>

        {filtrando && (
          <button type="button" onClick={limpar} className="chip text-muted">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Limpar
          </button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <div className="card">
          <Vazio
            titulo="Nenhuma integração com esse recorte"
            dica="A busca procura por nome e categoria. Limpe o filtro para ver o catálogo inteiro."
            acao={<BotaoSecundario onClick={limpar}>Limpar filtros</BotaoSecundario>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {visiveis.map((i) => (
            <Card key={i.id} integracao={i} onAbrir={() => setAberta(i.id)} />
          ))}
        </div>
      )}

      {emFoco && (
        <DialogConfigurar
          key={emFoco.id}
          integracao={emFoco}
          onFechar={() => setAberta(null)}
          onMarcar={() =>
            setLista((atual) =>
              atual.map((i) =>
                i.id === emFoco.id ? { ...i, estado: 'aguardando_credenciais' } : i,
              ),
            )
          }
        />
      )}
    </div>
  )
}
