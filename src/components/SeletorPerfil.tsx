import { useMemo } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Eye, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/format'
import {
  PERFIL_GESTORA,
  perfisDisponiveis,
  ROTULO_PERFIL,
  NOME_GESTORA,
  type PerfilAtivo,
} from '@/lib/perfil'

const menuClasses =
  'z-50 min-w-[240px] max-h-[340px] overflow-y-auto rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(17,17,17,0.08)]'

const itemClasses =
  'flex cursor-pointer select-none items-center gap-2.5 rounded px-2 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hairline'

const chaveDe = (p: PerfilAtivo) => (p.tipo === 'gestora' ? 'gestora' : p.id_executivo)

export function SeletorPerfil({
  perfil,
  onTrocar,
}: {
  perfil: PerfilAtivo
  onTrocar: (p: PerfilAtivo) => void
}) {
  const perfis = useMemo(() => perfisDisponiveis(), [])
  const ativa = chaveDe(perfil)
  const emprestada = perfil.tipo === 'executivo'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="chip" aria-label="Trocar de perfil">
          <Avatar nome={ROTULO_PERFIL(perfil)} tamanho="sm" anel={false} />
          <span className="font-medium text-ink">{ROTULO_PERFIL(perfil)}</span>
          <span className="text-muted">{emprestada ? 'executivo' : 'visão do time'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
            <p className="label-track px-2 pb-1 pt-1.5">Meu perfil</p>
            <DropdownMenu.Item
              className={itemClasses}
              onSelect={() => onTrocar(PERFIL_GESTORA)}
            >
              <Avatar nome="Gestora" tamanho="sm" anel={false} />
              <span className="min-w-0 flex-1">{NOME_GESTORA} (visão do time)</span>
              {ativa === 'gestora' && <Check className="h-3.5 w-3.5 shrink-0 text-rosa" />}
            </DropdownMenu.Item>

            <p className="label-track mt-1 border-t border-hairline px-2 pb-1 pt-2">
              Entrar na visão de
            </p>
            {perfis
              .filter((p): p is Extract<PerfilAtivo, { tipo: 'executivo' }> => p.tipo === 'executivo')
              .map((p) => (
                <DropdownMenu.Item
                  key={p.id_executivo}
                  className={itemClasses}
                  onSelect={() => onTrocar(p)}
                >
                  <Avatar nome={p.nome} tamanho="sm" anel={false} />
                  <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                  {ativa === p.id_executivo && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-rosa" />
                  )}
                </DropdownMenu.Item>
              ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* A visão emprestada nunca fica silenciosa: a faixa é o lembrete e a saída. */}
      {emprestada && (
        <span
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full border border-rosa-claro bg-rosa-fundo pl-3 pr-1.5',
            'text-[13px] text-rosa-escuro',
          )}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            Vendo como <span className="font-medium">{perfil.nome}</span>
          </span>
          <button
            type="button"
            onClick={() => onTrocar(PERFIL_GESTORA)}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-hairline"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
            Sair desta visão
          </button>
        </span>
      )}
    </div>
  )
}
