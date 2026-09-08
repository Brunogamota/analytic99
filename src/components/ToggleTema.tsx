import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Tema = 'claro' | 'escuro'

const CHAVE = 'tema'

function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'claro' || salvo === 'escuro') return salvo
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function ToggleTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    localStorage.setItem(CHAVE, tema)
  }, [tema])

  const escuro = tema === 'escuro'
  const Icone = escuro ? Sun : Moon

  return (
    <button
      type="button"
      aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      onClick={() => setTema(escuro ? 'claro' : 'escuro')}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-stroke bg-superficie text-muted outline-none transition-colors hover:bg-hairline hover:text-ink focus-visible:ring-2 focus-visible:ring-rosa/30"
    >
      <Icone className="h-4 w-4" strokeWidth={1.75} />
    </button>
  )
}
