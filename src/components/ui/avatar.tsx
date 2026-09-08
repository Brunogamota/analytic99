import { useState } from 'react'
import { cn } from '@/lib/format'

/** Cores de fundo do monograma, na paleta da marca. */
const FUNDOS = [
  { bg: '#E31C79', texto: '#FFFFFF' },
  { bg: '#1C1B1A', texto: '#FFFFFF' },
  { bg: '#FFDD00', texto: '#1C1B1A' },
  { bg: '#FC4C02', texto: '#FFFFFF' },
  { bg: '#047857', texto: '#FFFFFF' },
  { bg: '#78716C', texto: '#FFFFFF' },
] as const

/** Hash estável do nome: a mesma pessoa mantém a mesma cor entre telas. */
function corDe(semente: string) {
  let h = 0
  for (let i = 0; i < semente.length; i++) h = (h * 31 + semente.charCodeAt(i)) >>> 0
  return FUNDOS[h % FUNDOS.length]
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const TAMANHOS = {
  sm: { px: 24, texto: 'text-[10px]', ponto: 'h-2 w-2' },
  md: { px: 32, texto: 'text-[11px]', ponto: 'h-2.5 w-2.5' },
  lg: { px: 40, texto: 'text-[13px]', ponto: 'h-3 w-3' },
  xl: { px: 56, texto: 'text-[18px]', ponto: 'h-3.5 w-3.5' },
} as const

export type TamanhoAvatar = keyof typeof TAMANHOS
export type StatusAvatar = 'online' | 'ausente' | 'offline'

const CORES_STATUS: Record<StatusAvatar, string> = {
  online: 'bg-verde',
  ausente: 'bg-amarelo',
  offline: 'bg-control',
}

export function Avatar({
  nome,
  src,
  tamanho = 'md',
  status,
  anel = true,
  className,
}: {
  nome: string
  src?: string
  tamanho?: TamanhoAvatar
  status?: StatusAvatar
  anel?: boolean
  className?: string
}) {
  const [falhou, setFalhou] = useState(false)
  const t = TAMANHOS[tamanho]
  const cor = corDe(nome)
  const mostrarImagem = src && !falhou

  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: t.px, height: t.px }}>
      {mostrarImagem ? (
        <img
          src={src}
          alt={nome}
          title={nome}
          onError={() => setFalhou(true)}
          className={cn(
            'h-full w-full rounded-full object-cover',
            anel && 'ring-2 ring-white',
          )}
        />
      ) : (
        <span
          title={nome}
          aria-label={nome}
          style={{ backgroundColor: cor.bg, color: cor.texto }}
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full font-semibold leading-none',
            t.texto,
            anel && 'ring-2 ring-white',
          )}
        >
          {iniciais(nome)}
        </span>
      )}

      {status && (
        <span
          aria-label={status}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white',
            t.ponto,
            CORES_STATUS[status],
          )}
        />
      )}
    </span>
  )
}

/** Pilha de avatares sobrepostos, com "+N" quando passa do limite. */
export function GrupoAvatares({
  nomes,
  limite = 4,
  tamanho = 'sm',
}: {
  nomes: string[]
  limite?: number
  tamanho?: TamanhoAvatar
}) {
  const visiveis = nomes.slice(0, limite)
  const resto = nomes.length - visiveis.length
  const t = TAMANHOS[tamanho]

  return (
    <span className="flex items-center">
      {visiveis.map((nome, i) => (
        <span key={nome} className={i === 0 ? '' : '-ml-2'}>
          <Avatar nome={nome} tamanho={tamanho} />
        </span>
      ))}
      {resto > 0 && (
        <span
          style={{ width: t.px, height: t.px }}
          className={cn(
            '-ml-2 flex items-center justify-center rounded-full bg-hairline font-semibold text-muted ring-2 ring-white',
            t.texto,
          )}
        >
          +{resto}
        </span>
      )}
    </span>
  )
}
