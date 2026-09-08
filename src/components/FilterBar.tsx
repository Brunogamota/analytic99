import { useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RotateCcw,
  UserRound,
  Users,
} from 'lucide-react'
import { dataset, MES_ANTERIOR, MES_ATUAL } from '@/data/seed'
import {
  deslocar,
  periodoDeMes,
  podeAvancar,
  rotuloPeriodo,
  type Periodo,
} from '@/lib/periodo'
import { executivosDisponiveis, PRACAS, type Filtros } from '@/lib/queries'
import { cn } from '@/lib/format'

const menuClasses =
  'z-50 min-w-[200px] max-h-[320px] overflow-y-auto rounded-lg border border-stroke bg-white p-1 shadow-[0_2px_8px_rgba(17,24,39,0.08)]'

const itemClasses =
  'flex cursor-pointer select-none items-center justify-between gap-3 rounded px-2 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hairline'

function Chip({
  icone: Icone,
  label,
  valor,
  ativo,
}: {
  icone: typeof Users
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

function resumo(nomes: string[], vazio: string): string {
  if (nomes.length === 0) return vazio
  if (nomes.length === 1) return nomes[0]
  return `${nomes.length} selecionados`
}

function PeriodoFiltro({
  periodo,
  onChange,
}: {
  periodo: Periodo
  onChange: (p: Periodo) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [inicio, setInicio] = useState(periodo.inicio)
  const [fim, setFim] = useState(periodo.fim)

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Período anterior"
        onClick={() => onChange(deslocar(periodo, -1))}
        className="chip w-8 justify-center px-0"
      >
        <ChevronLeft className="h-4 w-4 text-muted" strokeWidth={1.75} />
      </button>

      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger className="chip">
          <Chip
            icone={CalendarDays}
            label="Período"
            valor={rotuloPeriodo(periodo)}
            ativo={periodo.tipo === 'custom'}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} className={cn(menuClasses, 'w-[260px] p-2')}>
            <p className="label-track px-1 pb-1.5">Atalhos</p>
            {(
              [
                ['mes_atual', 'Mês atual', MES_ATUAL],
                ['mes_anterior', 'Mês anterior', MES_ANTERIOR],
              ] as const
            ).map(([tipo, label, mes]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  onChange(periodoDeMes(mes, tipo))
                  setAberto(false)
                }}
                className={cn(itemClasses, 'w-full hover:bg-hairline')}
              >
                {label}
                {periodo.tipo === tipo && <Check className="h-3.5 w-3.5 text-rosa" />}
              </button>
            ))}

            <div className="mt-2 border-t border-hairline pt-2">
              <p className="label-track px-1 pb-1.5">Range personalizado</p>
              <div className="flex items-center gap-2 px-1">
                <input
                  type="date"
                  value={inicio}
                  max={fim}
                  onChange={(e) => setInicio(e.target.value)}
                  className="h-8 w-full rounded-md border border-control px-2 text-[12px] text-ink outline-none focus:border-rosa"
                />
                <span className="text-muted">→</span>
                <input
                  type="date"
                  value={fim}
                  min={inicio}
                  max={dataset.hoje}
                  onChange={(e) => setFim(e.target.value)}
                  className="h-8 w-full rounded-md border border-control px-2 text-[12px] text-ink outline-none focus:border-rosa"
                />
              </div>
              <button
                type="button"
                disabled={inicio > fim}
                onClick={() => {
                  onChange({ tipo: 'custom', inicio, fim })
                  setAberto(false)
                }}
                className="mt-2 h-8 w-full rounded-md bg-rosa text-[13px] font-medium text-white disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <button
        type="button"
        aria-label="Próximo período"
        disabled={!podeAvancar(periodo)}
        onClick={() => onChange(deslocar(periodo, 1))}
        className="chip w-8 justify-center px-0 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4 text-muted" strokeWidth={1.75} />
      </button>
    </div>
  )
}

function MultiSelect({
  icone,
  label,
  vazio,
  opcoes,
  selecionados,
  onChange,
  desabilitado,
  dica,
}: {
  icone: typeof Users
  label: string
  vazio: string
  opcoes: { id: string; nome: string; nota?: string }[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  desabilitado?: boolean
  dica?: string
}) {
  const nomes = opcoes.filter((o) => selecionados.includes(o.id)).map((o) => o.nome)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="chip disabled:opacity-50" disabled={desabilitado}>
        <Chip icone={icone} label={label} valor={resumo(nomes, vazio)} ativo={nomes.length > 0} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
          {dica && <p className="px-2 py-1.5 text-[12px] text-muted">{dica}</p>}
          {opcoes.map((o) => (
            <DropdownMenu.CheckboxItem
              key={o.id}
              checked={selecionados.includes(o.id)}
              onCheckedChange={(marcado) =>
                onChange(
                  marcado ? [...selecionados, o.id] : selecionados.filter((id) => id !== o.id),
                )
              }
              onSelect={(e) => e.preventDefault()}
              className={itemClasses}
            >
              <span className="flex flex-col">
                {o.nome}
                {o.nota && <span className="text-[11px] text-muted">{o.nota}</span>}
              </span>
              <DropdownMenu.ItemIndicator>
                <Check className="h-3.5 w-3.5 text-rosa" strokeWidth={2.5} />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          ))}
          {selecionados.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full border-t border-hairline px-2 pt-2 pb-1 text-left text-[12px] text-muted hover:text-ink"
            >
              Limpar seleção
            </button>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function FilterBar({
  filtros,
  onChange,
}: {
  filtros: Filtros
  onChange: (f: Filtros) => void
}) {
  const execs = useMemo(() => executivosDisponiveis(filtros.gerentes), [filtros.gerentes])
  const limpo =
    filtros.gerentes.length === 0 && filtros.executivos.length === 0 && filtros.praca === null

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-stroke pb-4">
      <PeriodoFiltro
        periodo={filtros.periodo}
        onChange={(periodo) => onChange({ ...filtros, periodo })}
      />

      <MultiSelect
        icone={Users}
        label="Gerente"
        vazio="Todos"
        opcoes={dataset.gerentes.map((g) => ({ id: g.id_gerente, nome: g.nome, nota: g.regiao }))}
        selecionados={filtros.gerentes}
        onChange={(gerentes) => {
          // Cascateia: mantém só os executivos que continuam sob os gerentes escolhidos.
          const visiveis = new Set(executivosDisponiveis(gerentes).map((e) => e.id_executivo))
          onChange({
            ...filtros,
            gerentes,
            executivos: filtros.executivos.filter((id) => visiveis.has(id)),
          })
        }}
      />

      <MultiSelect
        icone={UserRound}
        label="Executivo"
        vazio="Todos"
        dica={
          filtros.gerentes.length > 0
            ? `${execs.length} executivos sob o gerente selecionado`
            : undefined
        }
        opcoes={execs.map((e) => ({ id: e.id_executivo, nome: e.nome }))}
        selecionados={filtros.executivos}
        onChange={(executivos) => onChange({ ...filtros, executivos })}
      />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="chip">
          <Chip
            icone={MapPin}
            label="Praça"
            valor={filtros.praca ?? 'Todas'}
            ativo={filtros.praca !== null}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={menuClasses}>
            <DropdownMenu.Item
              className={itemClasses}
              onSelect={() => onChange({ ...filtros, praca: null })}
            >
              Todas
              {filtros.praca === null && <Check className="h-3.5 w-3.5 text-rosa" />}
            </DropdownMenu.Item>
            {PRACAS.map((praca) => (
              <DropdownMenu.Item
                key={praca}
                className={itemClasses}
                onSelect={() => onChange({ ...filtros, praca })}
              >
                {praca}
                {filtros.praca === praca && <Check className="h-3.5 w-3.5 text-rosa" />}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {!limpo && (
        <button
          type="button"
          onClick={() => onChange({ ...filtros, gerentes: [], executivos: [], praca: null })}
          className="chip text-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Limpar filtros
        </button>
      )}
    </div>
  )
}
