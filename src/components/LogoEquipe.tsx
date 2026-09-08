import { useState } from 'react'
import { cn } from '@/lib/format'

/**
 * O arquivo real da equipe entra em `public/logo-equipe.png`. Enquanto ele não
 * existe, o monograma segura o lugar sem quebrar o layout da barra.
 */
export function LogoEquipe({ tamanho = 32 }: { tamanho?: number }) {
  const [falhou, setFalhou] = useState(false)

  if (falhou) {
    return (
      <span
        aria-label="Barbie Village"
        style={{ width: tamanho, height: tamanho }}
        className="flex shrink-0 items-center justify-center rounded-md bg-rosa ring-2 ring-amarelo"
      >
        <span className="text-[11px] font-bold leading-none tracking-tight text-white">BV</span>
      </span>
    )
  }

  return (
    <img
      src="/logo-equipe.png"
      alt="Barbie Village"
      width={tamanho}
      height={tamanho}
      onError={() => setFalhou(true)}
      className={cn('shrink-0 rounded-md object-contain')}
      style={{ width: tamanho, height: tamanho }}
    />
  )
}
