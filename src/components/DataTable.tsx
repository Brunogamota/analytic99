import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { cn } from '@/lib/format'
import { Vazio } from './ui'

export interface Coluna<T> {
  chave: string
  label: string
  numerica?: boolean
  larguraMin?: string
  valor: (linha: T) => string | number | boolean | null
  render?: (linha: T) => ReactNode
}

export function DataTable<T>({
  colunas,
  linhas,
  chaveDe,
  ordemInicial,
  busca,
  onLinhaClick,
  vazio,
}: {
  colunas: Coluna<T>[]
  linhas: T[]
  chaveDe: (linha: T) => string
  ordemInicial?: { chave: string; asc: boolean }
  busca?: { placeholder: string; campos: (linha: T) => string }
  onLinhaClick?: (linha: T) => void
  vazio: { titulo: string; dica?: string }
}) {
  const [ordem, setOrdem] = useState(ordemInicial ?? { chave: colunas[0].chave, asc: true })
  const [termo, setTermo] = useState('')

  const visiveis = useMemo(() => {
    const filtradas =
      busca && termo.trim()
        ? linhas.filter((l) => busca.campos(l).toLowerCase().includes(termo.trim().toLowerCase()))
        : linhas
    const coluna = colunas.find((c) => c.chave === ordem.chave)
    if (!coluna) return filtradas
    return [...filtradas].sort((a, b) => {
      const va = coluna.valor(a)
      const vb = coluna.valor(b)
      if (typeof va === 'number' && typeof vb === 'number') return ordem.asc ? va - vb : vb - va
      const sa = String(va ?? '')
      const sb = String(vb ?? '')
      return ordem.asc ? sa.localeCompare(sb, 'pt-BR') : sb.localeCompare(sa, 'pt-BR')
    })
  }, [linhas, colunas, ordem, termo, busca])

  return (
    <div className="card overflow-hidden">
      {busca && (
        <div className="flex items-center gap-2 border-b border-stroke px-4 py-2.5">
          <Search className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={busca.placeholder}
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
          />
          <span className="shrink-0 text-[12px] text-muted">
            {visiveis.length} de {linhas.length}
          </span>
        </div>
      )}

      {visiveis.length === 0 ? (
        <Vazio {...vazio} />
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-stroke">
                {colunas.map((c) => {
                  const ativa = ordem.chave === c.chave
                  return (
                    <th
                      key={c.chave}
                      style={c.larguraMin ? { minWidth: c.larguraMin } : undefined}
                      className={cn('px-4 py-2', c.numerica ? 'text-right' : 'text-left')}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOrdem((o) =>
                            o.chave === c.chave
                              ? { chave: c.chave, asc: !o.asc }
                              : { chave: c.chave, asc: !c.numerica },
                          )
                        }
                        className={cn(
                          'label-track inline-flex items-center gap-1 hover:text-ink',
                          ativa && 'text-ink',
                          c.numerica && 'flex-row-reverse',
                        )}
                      >
                        {c.label}
                        {ativa &&
                          (ordem.asc ? (
                            <ArrowUp className="h-3 w-3" strokeWidth={2} />
                          ) : (
                            <ArrowDown className="h-3 w-3" strokeWidth={2} />
                          ))}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((linha) => (
                <tr
                  key={chaveDe(linha)}
                  onClick={onLinhaClick ? () => onLinhaClick(linha) : undefined}
                  className={cn(
                    'border-b border-hairline last:border-0',
                    onLinhaClick && 'cursor-pointer hover:bg-hairline/60',
                  )}
                >
                  {colunas.map((c) => (
                    <td
                      key={c.chave}
                      className={cn(
                        'px-4 py-2.5 text-[13px] text-ink',
                        c.numerica && 'num tabular-nums',
                      )}
                    >
                      {c.render ? c.render(linha) : String(c.valor(linha) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
