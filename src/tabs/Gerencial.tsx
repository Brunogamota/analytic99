import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ListaAlertas } from '@/components/AlertBanner'
import { Coluna, DataTable } from '@/components/DataTable'
import { GraficosGerencial } from '@/components/GraficosGerencial'
import { Heatmap } from '@/components/Heatmap'
import { KpiCard } from '@/components/KpiCard'
import { Badge, SecaoTitulo } from '@/components/ui'
import { cn, fmtDec, fmtInt, fmtPct } from '@/lib/format'
import {
  alertas as calcularAlertas,
  conversaoPorCategoria,
  conversaoWeekend,
  kpis as calcularKpis,
  statusBanner,
  tabelaExecutivos,
  type LinhaExecutivo,
  type MetricaHeatmap,
  type Snapshot,
} from '@/lib/queries'

function badgeAderencia(v: number) {
  if (v >= 0.8) return <Badge tom="verde">{fmtPct(v)}</Badge>
  if (v >= 0.7) return <Badge tom="amarelo">{fmtPct(v)}</Badge>
  return <Badge tom="laranja">{fmtPct(v)}</Badge>
}

function DrillDownExecutivo({
  linha,
  snapshot,
  onClose,
}: {
  linha: LinhaExecutivo
  snapshot: Snapshot
  onClose: () => void
}) {
  const carteira = useMemo(() => {
    const banners = new Map(statusBanner(snapshot).map((b) => [b.id_parceiro, b.status]))
    return snapshot.parceiros
      .filter((p) => p.id_executivo === linha.id_executivo)
      .map((p) => {
        const promos = snapshot.promos.filter((x) => x.id_parceiro === p.id_parceiro)
        const dias = promos.reduce((a, x) => a + x.dias_aderencia, 0)
        const periodo = promos.reduce((a, x) => a + x.dias_periodo, 0)
        const horas = snapshot.horasPorParceiro.get(p.id_parceiro) ?? 0
        const pedidos = snapshot.pedidosPorParceiro.get(p.id_parceiro) ?? 0
        return {
          id: p.id_parceiro,
          parceiro: p.nome,
          praca: p.praca,
          categoria: p.categoria,
          promos: promos.length,
          aderencia: periodo === 0 ? 0 : dias / periodo,
          horas,
          pedidos,
          conversao: horas === 0 ? 0 : pedidos / horas,
          banner: banners.get(p.id_parceiro) ?? 'Nunca teve',
        }
      })
      .sort((a, b) => a.aderencia - b.aderencia)
  }, [linha.id_executivo, snapshot])

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[84vh] w-[840px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-stroke bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-stroke px-5 py-4">
            <div>
              <Dialog.Title className="text-[16px] font-semibold text-ink">
                {linha.executivo}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                {linha.gerente} · {linha.parceiros} parceiros · {linha.ativos} ativos no período ·
                aderência {fmtPct(linha.pct_aderencia)}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted outline-none hover:bg-hairline focus-visible:ring-2 focus-visible:ring-rosa/30">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="max-h-[64vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-stroke">
                  <th className="label-track px-5 py-2 text-left">Parceiro</th>
                  <th className="label-track px-5 py-2 text-left">Praça</th>
                  <th className="label-track px-5 py-2 text-right">Promos</th>
                  <th className="label-track px-5 py-2 text-right">Aderência</th>
                  <th className="label-track px-5 py-2 text-right">Horas</th>
                  <th className="label-track px-5 py-2 text-right">Pedidos</th>
                  <th className="label-track px-5 py-2 text-left">Banner</th>
                </tr>
              </thead>
              <tbody>
                {carteira.map((c) => (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-2.5 text-[13px] text-ink">{c.parceiro}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-[13px] text-muted">{c.praca}</td>
                    <td className="num px-5 py-2.5 text-[13px]">{c.promos}</td>
                    <td className="px-5 py-2.5 text-right">{badgeAderencia(c.aderencia)}</td>
                    <td
                      className={cn(
                        'num px-5 py-2.5 text-[13px]',
                        c.horas === 0 && 'font-semibold text-[#C23A02]',
                      )}
                    >
                      {fmtDec(c.horas, 1)}
                    </td>
                    <td className="num px-5 py-2.5 text-[13px]">{fmtInt(c.pedidos)}</td>
                    <td className="px-5 py-2.5">
                      <Badge
                        tom={
                          c.banner === 'Perdeu'
                            ? 'laranja'
                            : c.banner === 'Manteve'
                              ? 'verde'
                              : c.banner === 'Ganhou'
                                ? 'amarelo'
                                : 'cinza'
                        }
                      >
                        {c.banner}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Gerencial({
  atual,
  anterior,
  comparacao,
}: {
  atual: Snapshot
  anterior: Snapshot
  comparacao: string
}) {
  const [metrica, setMetrica] = useState<MetricaHeatmap>('pedidos')
  const [drill, setDrill] = useState<LinhaExecutivo | null>(null)

  const kpis = useMemo(() => calcularKpis(atual, anterior), [atual, anterior])
  const alertas = useMemo(() => calcularAlertas(atual), [atual])
  const executivos = useMemo(() => tabelaExecutivos(atual, alertas), [atual, alertas])
  const weekend = useMemo(() => conversaoWeekend(atual), [atual])
  const categorias = useMemo(() => conversaoPorCategoria(atual, anterior), [atual, anterior])

  const colunas: Coluna<LinhaExecutivo>[] = [
    { chave: 'executivo', label: 'Executivo', valor: (l) => l.executivo, larguraMin: '180px' },
    { chave: 'gerente', label: 'Gerente', valor: (l) => l.gerente },
    { chave: 'parceiros', label: 'Parceiros', numerica: true, valor: (l) => l.parceiros },
    {
      chave: 'ativos',
      label: 'Ativos',
      numerica: true,
      valor: (l) => l.ativos,
      render: (l) => (
        <span className={cn(l.ativos < l.parceiros && 'font-medium text-[#C23A02]')}>
          {l.ativos}
        </span>
      ),
    },
    { chave: 'com_promo', label: 'Com promo', numerica: true, valor: (l) => l.com_promo },
    {
      chave: 'aderencia',
      label: '% aderência',
      numerica: true,
      valor: (l) => l.pct_aderencia,
      render: (l) => badgeAderencia(l.pct_aderencia),
    },
    {
      chave: 'budget',
      label: 'Budget vs. necessário',
      numerica: true,
      valor: (l) => l.razao_budget,
      render: (l) => (
        <span className={cn(l.razao_budget > 1.1 && 'font-medium text-[#C23A02]')}>
          {fmtPct(l.razao_budget)}
        </span>
      ),
    },
    {
      chave: 'alertas',
      label: 'Alertas',
      numerica: true,
      valor: (l) => l.alertas,
      render: (l) =>
        l.alertas === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          <Badge tom="laranja">{l.alertas}</Badge>
        ),
    },
  ]

  return (
    <div className="space-y-8">
      <section>
        <SecaoTitulo titulo="Métricas principais" descricao={`Comparado com ${comparacao}.`} />
        <div className="grid grid-cols-4 gap-3">
          {kpis.map((k) => (
            <KpiCard key={k.chave} kpi={k} comparacao={comparacao} />
          ))}
        </div>
      </section>

      <section>
        <ListaAlertas alertas={alertas} />
      </section>

      <section>
        <Heatmap snapshot={atual} metrica={metrica} onMetricaChange={setMetrica} />
      </section>

      <section>
        <SecaoTitulo
          titulo="Evolução e distribuição"
          descricao="O mesmo recorte visto por dia, por executivo e por tipo de reclamação."
        />
        <GraficosGerencial atual={atual} />
      </section>

      <section>
        <SecaoTitulo
          titulo="Time"
          descricao="Clique em uma linha para abrir a carteira do executivo."
        />
        <DataTable
          colunas={colunas}
          linhas={executivos}
          chaveDe={(l) => l.id_executivo}
          ordemInicial={{ chave: 'aderencia', asc: true }}
          onLinhaClick={setDrill}
          busca={{ placeholder: 'Buscar executivo', campos: (l) => `${l.executivo} ${l.gerente}` }}
          vazio={{
            titulo: 'Nenhum executivo no recorte',
            dica: 'Os filtros de gerente e praça combinados não deixaram nenhuma carteira.',
          }}
        />
      </section>

      <section>
        <SecaoTitulo
          titulo="Onde dá para melhorar"
          descricao="Comparações que apontam ação, não só diagnóstico."
        />
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-5">
            <p className="text-[12px] text-muted">Conversão no fim de semana</p>
            <p className="mt-1.5 text-[28px] font-bold leading-9 text-ink">
              {fmtDec(weekend.media, 2)}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              média do grupo, em pedidos por hora online
            </p>
            <div className="mt-3 border-t border-hairline pt-3">
              <p className="label-track pb-1.5">
                Abaixo da média ({weekend.abaixo.length})
              </p>
              {weekend.abaixo.length === 0 ? (
                <p className="text-[13px] text-muted">Ninguém abaixo da média neste recorte.</p>
              ) : (
                <ul className="space-y-1.5">
                  {weekend.abaixo.slice(0, 5).map((l) => (
                    <li key={l.id_parceiro} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] text-ink">{l.parceiro}</span>
                      <span className="shrink-0 text-[12px] tabular-nums text-muted">
                        {fmtDec(l.conv_weekend, 2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {categorias.map((c) => (
            <div key={c.categoria} className="card p-5">
              <p className="text-[12px] text-muted">
                Conversão {c.categoria === 'pizza' ? 'pizza' : 'burger'}
              </p>
              <p className="mt-1.5 text-[28px] font-bold leading-9 text-ink">
                {fmtDec(c.conversao, 2)}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {c.variacao === null
                  ? 'sem base de comparação'
                  : `${c.variacao >= 0 ? '+' : '−'}${fmtPct(Math.abs(c.variacao))} vs. ${comparacao}`}
              </p>
              <div className="mt-3 border-t border-hairline pt-3">
                <p className="label-track pb-1.5">
                  Sem promo special ({c.sem_special.length} de {c.parceiros})
                </p>
                {c.sem_special.length === 0 ? (
                  <p className="text-[13px] text-muted">Todos com promo special ativa.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {c.sem_special.slice(0, 5).map((p) => (
                      <li key={p.id_parceiro} className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13px] text-ink">{p.parceiro}</span>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted">
                          {fmtDec(p.conversao, 2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {drill && (
        <DrillDownExecutivo linha={drill} snapshot={atual} onClose={() => setDrill(null)} />
      )}
    </div>
  )
}
