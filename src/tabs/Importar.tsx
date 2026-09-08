import { useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Download,
  FileSpreadsheet,
  ListChecks,
  RotateCcw,
  TriangleAlert,
  UploadCloud,
} from 'lucide-react'
import { Badge, BotaoPrimario, BotaoSecundario, SecaoTitulo } from '@/components/ui'
import { cn, fmtInt } from '@/lib/format'
import {
  amostraDaColuna,
  camposDaTabela,
  confiancaDoMapeamento,
  csvExemplo,
  detectarTabela,
  lerArquivo,
  LIMITE_LINHAS,
  mapearColunas,
  rotuloConfianca,
  TABELAS,
  validar,
  type Problema,
} from '@/lib/importacao'

const PASSOS = ['Arquivo', 'Reconhecimento', 'Validação', 'Resultado'] as const

const campoClasses =
  'h-8 w-full rounded-md border border-control bg-white px-2 text-[13px] text-ink outline-none focus:border-rosa'

const EXTENSOES = ['.csv', '.tsv', '.xlsx', '.xls']

interface Entrada {
  arquivo: string
  tabela: string
  linhas: number
  ignoradas: number
  campos: number
}

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function Trilha({ passo }: { passo: number }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted">
          Passo {passo} de {PASSOS.length} · {PASSOS[passo - 1]}
        </p>
        <p className="text-[12px] text-muted">
          Os dados ficam nesta sessão; nada é gravado no seed.
        </p>
      </div>
      <div className="mt-2 flex gap-1">
        {PASSOS.map((nome, i) => (
          <span
            key={nome}
            className={cn('h-1 flex-1 rounded-full', i < passo ? 'bg-rosa' : 'bg-hairline')}
          />
        ))}
      </div>
    </div>
  )
}

function ConfiancaChip({ valor }: { valor: number }) {
  const rotulo = rotuloConfianca(valor)
  return (
    <span className="whitespace-nowrap text-[12px] text-muted">
      {rotulo} · {Math.round(valor * 100)}%
    </span>
  )
}

function TabelaProblemas({ problemas }: { problemas: Problema[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="max-h-[380px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-stroke">
              <th className="px-4 py-2 text-left">
                <span className="label-track">Linha</span>
              </th>
              <th className="px-4 py-2 text-left">
                <span className="label-track">Coluna</span>
              </th>
              <th className="px-4 py-2 text-left">
                <span className="label-track">Valor</span>
              </th>
              <th className="px-4 py-2 text-left">
                <span className="label-track">Motivo</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {problemas.map((p, i) => (
              <tr key={`${p.linha}-${p.coluna}-${i}`} className="border-b border-hairline last:border-0">
                <td className="num px-4 py-2.5 text-[13px] text-ink">
                  {p.linha === 0 ? '—' : p.linha}
                </td>
                <td className="px-4 py-2.5 text-[13px] text-ink">{p.coluna}</td>
                <td className="px-4 py-2.5 text-[13px] text-muted">
                  {p.valor === '' ? <span className="italic">vazio</span> : p.valor}
                </td>
                <td className="px-4 py-2.5 text-[13px] text-rosa-escuro">{p.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Importar() {
  const [passo, setPasso] = useState(1)
  const [arquivo, setArquivo] = useState('')
  const [colunas, setColunas] = useState<string[]>([])
  const [linhas, setLinhas] = useState<Record<string, string>[]>([])
  const [tabela, setTabela] = useState(TABELAS[0].id)
  const [mapeamento, setMapeamento] = useState<Record<string, string | null>>({})
  const [confiancaTabela, setConfiancaTabela] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const confiancas = useMemo(
    () => confiancaDoMapeamento(linhas, mapeamento),
    [linhas, mapeamento],
  )

  const validacao = useMemo(() => {
    if (linhas.length === 0) return { validas: 0, problemas: [] as Problema[] }
    return validar(linhas, mapeamento)
  }, [linhas, mapeamento])

  const campos = camposDaTabela(tabela)
  const usados = new Set(Object.values(mapeamento).filter((v): v is string => v !== null))
  const naoReconhecidas = colunas.filter((c) => mapeamento[c] === null).length
  const obrigatoriosFaltando = campos.filter((c) => c.obrigatorio && !usados.has(c.id))

  async function receber(file: File | undefined) {
    if (!file) return
    const ext = `.${file.name.toLowerCase().split('.').pop() ?? ''}`
    if (!EXTENSOES.includes(ext)) {
      setErro(`Formato não suportado (${ext}). Envie ${EXTENSOES.join(', ')}.`)
      return
    }
    setLendo(true)
    setErro(null)
    try {
      const lido = await lerArquivo(file)
      if (lido.colunas.length === 0 || lido.linhas.length === 0) {
        setErro('O arquivo não tem cabeçalho e pelo menos uma linha de dados.')
        return
      }
      const deteccao = detectarTabela(lido.colunas, lido.linhas)
      setArquivo(file.name)
      setColunas(lido.colunas)
      setLinhas(lido.linhas)
      setTabela(deteccao.tabela)
      setMapeamento(deteccao.mapeamento)
      setConfiancaTabela(deteccao.confianca)
      setPasso(2)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    } finally {
      setLendo(false)
    }
  }

  function trocarTabela(nova: string) {
    setTabela(nova)
    const r = mapearColunas(colunas, linhas, nova)
    setMapeamento(r.mapeamento)
    setConfiancaTabela(r.score)
  }

  function trocarCampo(coluna: string, campoId: string) {
    setMapeamento((atual) => {
      const proximo = { ...atual }
      // Um campo do modelo recebe uma coluna só: escolher aqui solta o dono anterior.
      if (campoId !== '') {
        for (const c of Object.keys(proximo)) if (proximo[c] === campoId) proximo[c] = null
      }
      proximo[coluna] = campoId === '' ? null : campoId
      return proximo
    })
  }

  function importar() {
    setEntradas((atual) => [
      ...atual,
      {
        arquivo,
        tabela,
        linhas: validacao.validas,
        ignoradas: linhas.length - validacao.validas,
        campos: usados.size,
      },
    ])
    setPasso(4)
  }

  function recomecar() {
    setPasso(1)
    setArquivo('')
    setColunas([])
    setLinhas([])
    setMapeamento({})
    setConfiancaTabela(0)
    setErro(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const resumoPorTabela = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const e of entradas) mapa.set(e.tabela, (mapa.get(e.tabela) ?? 0) + e.linhas)
    return [...mapa.entries()]
  }, [entradas])

  return (
    <div>
      <SecaoTitulo
        titulo="Importar"
        descricao="Detecção automática por nome e formato das colunas. Confira antes de importar."
      />

      <Trilha passo={passo} />

      {/* ---------------------------------------------------------------- 1 */}
      {passo === 1 && (
        <div className="space-y-3">
          <div
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault()
              setArrastando(false)
              void receber(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex flex-col items-center justify-center rounded-card border-2 border-dashed border-control px-6 py-14 text-center transition-colors',
              arrastando && 'border-rosa bg-rosa-fundo',
            )}
          >
            <UploadCloud className="h-7 w-7 text-muted" strokeWidth={1.5} />
            <p className="mt-3 text-[14px] font-medium text-ink">
              {lendo ? 'Lendo o arquivo…' : 'Solte o arquivo aqui'}
            </p>
            <p className="mt-1 max-w-[440px] text-[13px] text-muted">
              O sistema lê o cabeçalho e uma amostra dos valores para adivinhar a tabela de destino.
              Nada é enviado para fora do navegador.
            </p>
            <div className="mt-4">
              <BotaoPrimario onClick={() => inputRef.current?.click()}>
                <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2} />
                Escolher arquivo
              </BotaoPrimario>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={EXTENSOES.join(',')}
              onChange={(e) => void receber(e.target.files?.[0])}
              className="hidden"
              data-testid="entrada-arquivo"
            />
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-card bg-rosa-fundo px-4 py-3">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" strokeWidth={2} />
              <p className="text-[13px] text-rosa-escuro">{erro}</p>
            </div>
          )}

          <div className="card px-4 py-3">
            <p className="text-[13px] text-muted">
              Formatos aceitos: CSV, TSV, XLSX e XLS · separador ponto e vírgula ou vírgula
              detectado sozinho · decimal com vírgula aceito · até {fmtInt(LIMITE_LINHAS)} linhas
              por arquivo nesta prévia.
            </p>
            <p className="label-track mt-3">Baixar modelo</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TABELAS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.descricao}
                  onClick={() => baixar(`modelo_${t.id}.csv`, csvExemplo(t.id))}
                  className="chip"
                >
                  <Download className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- 2 */}
      {passo === 2 && (
        <div className="space-y-3">
          <div className="card px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] text-muted">{arquivo}</p>
                <p className="mt-1 text-[16px] text-ink">
                  {confiancaTabela < 0.35 ? (
                    <>
                      Não reconhecido — escolha a tabela de destino{' '}
                      <span className="text-muted">
                        (confiança {Math.round(confiancaTabela * 100)}%)
                      </span>
                    </>
                  ) : (
                    <>
                      Reconhecido como <span className="font-semibold">{tabela}</span> · confiança{' '}
                      <span className="font-semibold">{rotuloConfianca(confiancaTabela)}</span>{' '}
                      <span className="text-muted">({Math.round(confiancaTabela * 100)}%)</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {fmtInt(linhas.length)} linhas lidas · {colunas.length} colunas ·{' '}
                  {usados.size} campos ligados
                  {naoReconhecidas > 0 && ` · ${naoReconhecidas} sem correspondência`}
                </p>
              </div>
              <div className="w-[240px] shrink-0">
                <label className="label-track mb-1 block" htmlFor="importar-tabela">
                  Tabela de destino
                </label>
                <select
                  id="importar-tabela"
                  value={tabela}
                  onChange={(e) => trocarTabela(e.target.value)}
                  className={campoClasses}
                >
                  {TABELAS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.rotulo} — {t.descricao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {confiancaTabela < 0.5 && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-rosa-fundo px-3 py-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" strokeWidth={2} />
                <p className="text-[13px] text-rosa-escuro">
                  O palpite é fraco: poucas colunas bateram com os campos obrigatórios. Escolha a
                  tabela de destino à mão e revise linha a linha.
                </p>
              </div>
            )}

            {obrigatoriosFaltando.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-rosa-fundo px-3 py-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" strokeWidth={2} />
                <p className="text-[13px] text-rosa-escuro">
                  Campos obrigatórios ainda sem coluna:{' '}
                  {obrigatoriosFaltando.map((c) => c.campo).join(', ')}.
                </p>
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-stroke px-4 py-3">
              <p className="text-[13px] text-ink">Coluna do arquivo → campo do modelo</p>
              <p className="mt-0.5 text-[12px] text-muted">
                A detecção compara o nome da coluna com uma lista de sinônimos e confere o formato
                dos valores. Não há adivinhação de coluna desconhecida: ela fica em branco esperando
                sua decisão.
              </p>
            </div>
            <div className="max-h-[440px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-stroke">
                    <th className="px-4 py-2 text-left">
                      <span className="label-track">Coluna do arquivo</span>
                    </th>
                    <th className="px-4 py-2 text-left">
                      <span className="label-track">Amostra</span>
                    </th>
                    <th className="px-4 py-2 text-left">
                      <span className="label-track">Campo do modelo</span>
                    </th>
                    <th className="px-4 py-2 text-left">
                      <span className="label-track">Confiança</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colunas.map((coluna) => {
                    const campoId = mapeamento[coluna]
                    const semCampo = campoId === null
                    const amostra = amostraDaColuna(linhas, coluna, 3)
                    return (
                      <tr
                        key={coluna}
                        className={cn(
                          'border-b border-hairline last:border-0',
                          semCampo && 'bg-rosa-fundo',
                        )}
                      >
                        <td className="px-4 py-2.5 align-top">
                          <span
                            className={cn(
                              'block text-[13px]',
                              semCampo ? 'font-medium text-rosa-escuro' : 'text-ink',
                            )}
                          >
                            {coluna}
                          </span>
                          {semCampo && (
                            <span className="mt-0.5 block text-[12px] text-rosa-escuro">
                              Não reconhecida — escolha o campo ou ignore.
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top text-[12px] text-muted">
                          {amostra.length === 0 ? (
                            <span className="italic">coluna vazia</span>
                          ) : (
                            amostra.join(' · ')
                          )}
                        </td>
                        <td className="w-[260px] px-4 py-2.5 align-top">
                          <select
                            aria-label={`Campo para a coluna ${coluna}`}
                            value={campoId ?? ''}
                            onChange={(e) => trocarCampo(coluna, e.target.value)}
                            className={campoClasses}
                          >
                            <option value="">Ignorar esta coluna</option>
                            {campos.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.campo}
                                {c.obrigatorio ? ' *' : ''} — {c.rotulo}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          {semCampo ? (
                            <span className="text-[12px] text-rosa-escuro">sem palpite</span>
                          ) : (
                            <ConfiancaChip valor={confiancas[coluna] ?? 0} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <BotaoSecundario onClick={recomecar}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              Trocar arquivo
            </BotaoSecundario>
            <BotaoPrimario disabled={usados.size === 0} onClick={() => setPasso(3)}>
              <ListChecks className="h-3.5 w-3.5" strokeWidth={2} />
              Validar {fmtInt(linhas.length)} linhas
            </BotaoPrimario>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- 3 */}
      {passo === 3 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="card px-4 py-3">
              <p className="label-track">Linhas válidas</p>
              <p className="mt-1 text-[22px] font-semibold text-ink">
                {fmtInt(validacao.validas)}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">de {fmtInt(linhas.length)} lidas</p>
            </div>
            <div className="card px-4 py-3">
              <p className="label-track">Linhas com problema</p>
              <p
                className={cn(
                  'mt-1 text-[22px] font-semibold',
                  linhas.length - validacao.validas > 0 ? 'text-rosa' : 'text-ink',
                )}
              >
                {fmtInt(linhas.length - validacao.validas)}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {fmtInt(validacao.problemas.length)} apontamentos
              </p>
            </div>
            <div className="card px-4 py-3">
              <p className="label-track">Destino</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{tabela}</p>
              <p className="mt-0.5 text-[12px] text-muted">{usados.size} campos mapeados</p>
            </div>
          </div>

          {validacao.problemas.length === 0 ? (
            <div className="card flex items-center gap-2 px-4 py-3">
              <Check className="h-4 w-4 text-ink" strokeWidth={2} />
              <p className="text-[13px] text-ink">
                Nenhum problema encontrado nas {fmtInt(linhas.length)} linhas lidas.
              </p>
            </div>
          ) : (
            <TabelaProblemas problemas={validacao.problemas} />
          )}

          <div className="flex items-center justify-between gap-3">
            <BotaoSecundario onClick={() => setPasso(2)}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              Rever mapeamento
            </BotaoSecundario>
            <BotaoPrimario disabled={validacao.validas === 0} onClick={importar}>
              {linhas.length - validacao.validas > 0
                ? `Importar ${fmtInt(validacao.validas)} linhas válidas e ignorar ${fmtInt(
                    linhas.length - validacao.validas,
                  )}`
                : `Importar ${fmtInt(validacao.validas)} linhas`}
            </BotaoPrimario>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- 4 */}
      {passo === 4 && (
        <div className="space-y-3">
          <div className="card px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hairline">
                <Check className="h-4 w-4 text-ink" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-[15px] font-medium text-ink">Importação concluída</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  Os dados ficam nesta sessão; nada é gravado no seed. Recarregar a página zera o
                  que entrou.
                </p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-stroke px-4 py-3">
              <p className="text-[13px] text-ink">O que entrou, por tabela</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke">
                  <th className="px-4 py-2 text-left">
                    <span className="label-track">Tabela</span>
                  </th>
                  <th className="px-4 py-2 text-right">
                    <span className="label-track">Linhas</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumoPorTabela.map(([t, n]) => (
                  <tr key={t} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-[13px] text-ink">{t}</td>
                    <td className="num px-4 py-2.5 text-[13px] text-ink">{fmtInt(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-stroke px-4 py-3">
              <p className="text-[13px] text-ink">Arquivos desta sessão</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke">
                  <th className="px-4 py-2 text-left">
                    <span className="label-track">Arquivo</span>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <span className="label-track">Tabela</span>
                  </th>
                  <th className="px-4 py-2 text-right">
                    <span className="label-track">Importadas</span>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <span className="label-track">Ignoradas</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((e, i) => (
                  <tr key={`${e.arquivo}-${i}`} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-[13px] text-ink">{e.arquivo}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">{e.tabela}</td>
                    <td className="num px-4 py-2.5 text-[13px] text-ink">{fmtInt(e.linhas)}</td>
                    <td className="px-4 py-2.5">
                      {e.ignoradas === 0 ? (
                        <span className="text-[13px] text-muted">nenhuma</span>
                      ) : (
                        <Badge tom="laranja">{fmtInt(e.ignoradas)} ignoradas</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <BotaoPrimario onClick={recomecar}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Importar outro arquivo
            </BotaoPrimario>
          </div>
        </div>
      )}
    </div>
  )
}
