import { useState } from 'react'
import { cn } from '@/lib/format'

/**
 * Basta soltar o arquivo oficial em `public/logo-equipe.png` que ele assume o
 * lugar sozinho. Sem ele, cai no símbolo de `logo-equipe.svg`, que é uma
 * silhueta e não uma cópia do mascote.
 */
export function LogoEquipe({
  tamanho = 32,
  className,
}: {
  tamanho?: number
  className?: string
}) {
  const [origem, setOrigem] = useState('/logo-equipe.png')

  return (
    <img
      src={origem}
      alt="Barbie Village"
      width={tamanho}
      height={tamanho}
      onError={() => setOrigem('/logo-equipe.svg')}
      style={{ width: tamanho, height: tamanho }}
      className={cn('shrink-0 rounded-lg object-contain', className)}
    />
  )
}
