import { dataset } from '@/data/seed'
import { nomeExecutivo, statusBanner, type Snapshot } from './queries'

/** De onde a sugestão saiu — é o eixo de navegação da aba. */
export type BaseSugestao = 'vendas' | 'pedidos' | 'reclamacoes' | 'operacao'

export type Prioridade = 'alta' | 'media' | 'baixa'

export interface Sugestao {
  id: string
  base: BaseSugestao
  acao: string
  parceiro: string | null
  executivo: string
  motivo: string
  impacto: string
  prioridade: Prioridade
  score: number
}

export const BASES: { id: BaseSugestao; label: string; descricao: string }[] = [
  {
    id: 'vendas',
    label: 'Vendas',
    descricao: 'Onde a receita responde a uma promo que ainda não existe.',
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    descricao: 'Faixas de horário e dias com demanda sem cobertura.',
  },
  {
    id: 'reclamacoes',
    label: 'Reclamações',
    descricao: 'Qualidade caindo antes de a venda cair junto.',
  },
  {
    id: 'operacao',
    label: 'Operação',
    descricao: 'Cadastro, budget e horas que não fecham com a promo.',
  },
]

const media = (ns: number[]) => (ns.length === 0 ? 0 : ns.reduce((a, b) => a + b, 0) / ns.length)
const pct = (v: number) => `${(v * 100).toFixed(0)}%`
const dec = (v: number) => v.toFixed(2).replace('.', ',')
const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    .format(v)

/**
 * Cada regra cruza um sinal medido com a ausência de uma ação, e só entra na
 * lista quando os dois lados existem — sugestão sem evidência é chute caro.
 */
export function sugestoes(atual: Snapshot, anterior: Snapshot): Sugestao[] {
  const out: Sugestao[] = []

  const conversaoDe = (s: Snapshot, id: string) => {
    const h = s.horasPorParceiro.get(id) ?? 0
    return h === 0 ? 0 : (s.pedidosPorParceiro.get(id) ?? 0) / h
  }

  const comSpecial = new Set(
    atual.promos.filter((p) => p.tipo_promo === 'special').map((p) => p.id_parceiro),
  )
  const promosPorParceiro = new Map<string, typeof atual.promos>()
  for (const p of atual.promos) {
    const lista = promosPorParceiro.get(p.id_parceiro) ?? []
    lista.push(p)
    promosPorParceiro.set(p.id_parceiro, lista)
  }

  const ativos = atual.parceiros.filter((p) => (atual.horasPorParceiro.get(p.id_parceiro) ?? 0) > 0)
  const conversaoMedia = media(ativos.map((p) => conversaoDe(atual, p.id_parceiro)))

  // 1. Vendas: converte bem e não tem promo special para segurar o ganho.
  for (const p of ativos) {
    if (comSpecial.has(p.id_parceiro)) continue
    const c = conversaoDe(atual, p.id_parceiro)
    if (conversaoMedia === 0 || c < conversaoMedia * 1.15) continue
    const receita = atual.receitaPorParceiro.get(p.id_parceiro) ?? 0
    const acima = c / conversaoMedia - 1
    out.push({
      id: `${p.id_parceiro}:special`,
      base: 'vendas',
      acao: 'Criar promo special',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `Converte ${dec(c)} pedidos por hora online, ${pct(acima)} acima da média do grupo (${dec(conversaoMedia)}), e não tem promo special ativa.`,
      impacto: `${moeda(receita)} de receita no período sem nenhum incentivo sustentando.`,
      prioridade: acima > 0.35 ? 'alta' : 'media',
      score: acima * 100 + receita / 1000,
    })
  }

  // 2. Vendas: receita caiu contra o período anterior.
  for (const p of ativos) {
    const agora = atual.receitaPorParceiro.get(p.id_parceiro) ?? 0
    const antes = anterior.receitaPorParceiro.get(p.id_parceiro) ?? 0
    if (antes < 500) continue
    const variacao = (agora - antes) / antes
    if (variacao > -0.2) continue
    out.push({
      id: `${p.id_parceiro}:queda`,
      base: 'vendas',
      acao: 'Montar plano de retomada',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `Receita caiu ${pct(Math.abs(variacao))} contra o período anterior, de ${moeda(antes)} para ${moeda(agora)}.`,
      impacto: `${moeda(antes - agora)} a menos no período.`,
      prioridade: variacao < -0.4 ? 'alta' : 'media',
      score: Math.abs(variacao) * 120,
    })
  }

  // 3. Pedidos: abre no almoço e quase não vende no almoço.
  for (const p of ativos) {
    if (!p.abre_almoco) continue
    const total = atual.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    const almoco = atual.pedidosAlmoco.get(p.id_parceiro) ?? 0
    if (total < 40) continue
    const fatia = almoco / total
    if (fatia > 0.18) continue
    out.push({
      id: `${p.id_parceiro}:almoco`,
      base: 'pedidos',
      acao: 'Criar promo de almoço',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo:
        almoco === 0
          ? `Abre no almoço e nenhum dos ${total} pedidos do período aconteceu entre 11h e 14h.`
          : `Abre no almoço, mas só ${pct(fatia)} dos ${total} pedidos acontecem entre 11h e 14h.`,
      impacto: 'Faixa de almoço aberta e ociosa — a demanda do grupo se concentra às 12h.',
      prioridade: fatia < 0.1 ? 'alta' : 'baixa',
      score: (0.18 - fatia) * 300,
    })
  }

  // 4. Pedidos: fim de semana rende menos que dia útil no mesmo parceiro.
  for (const p of ativos) {
    const hw = atual.horasWeekend.get(p.id_parceiro) ?? 0
    const ht = atual.horasPorParceiro.get(p.id_parceiro) ?? 0
    const pw = atual.pedidosWeekend.get(p.id_parceiro) ?? 0
    const pt = atual.pedidosPorParceiro.get(p.id_parceiro) ?? 0
    const hs = ht - hw
    if (hw <= 0 || hs <= 0) continue
    const convWeekend = pw / hw
    const convSemana = (pt - pw) / hs
    if (convSemana === 0 || convWeekend >= convSemana * 0.85) continue
    const gap = 1 - convWeekend / convSemana
    out.push({
      id: `${p.id_parceiro}:weekend`,
      base: 'pedidos',
      acao: 'Criar promo de fim de semana',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `Converte ${dec(convWeekend)} por hora no fim de semana contra ${dec(convSemana)} em dia útil — ${pct(gap)} abaixo do próprio desempenho.`,
      impacto: 'Fim de semana é quando o grupo mais pede; aqui o parceiro perde tração.',
      prioridade: gap > 0.3 ? 'media' : 'baixa',
      score: gap * 90,
    })
  }

  // 5. Reclamações: taxa por 100 pedidos muito acima da média do grupo.
  const taxaDe = (s: Snapshot, id: string) => {
    const pedidos = s.pedidosPorParceiro.get(id) ?? 0
    return pedidos === 0 ? 0 : ((s.reclamacoes.get(id) ?? 0) / pedidos) * 100
  }
  const taxaMedia = media(ativos.map((p) => taxaDe(atual, p.id_parceiro)))
  for (const p of ativos) {
    const taxa = taxaDe(atual, p.id_parceiro)
    if (taxaMedia === 0 || taxa < taxaMedia * 1.8) continue
    const graves = atual.reclamacoesGraves.get(p.id_parceiro) ?? 0
    const antes = taxaDe(anterior, p.id_parceiro)
    out.push({
      id: `${p.id_parceiro}:qualidade`,
      base: 'reclamacoes',
      acao: 'Abrir plano de qualidade antes de investir em promo',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `${dec(taxa)} reclamações por 100 pedidos contra ${dec(taxaMedia)} da média${antes > 0 ? `, e era ${dec(antes)} no período anterior` : ''}. ${graves} de gravidade alta.`,
      impacto: 'Promoção em cima de operação ruim acelera o churn em vez de segurar o parceiro.',
      prioridade: taxa > taxaMedia * 2.5 ? 'alta' : 'media',
      score: (taxa / Math.max(taxaMedia, 0.01)) * 40,
    })
  }

  // 6. Operação: perdeu banner tendo boa conversão.
  for (const linha of statusBanner(atual)) {
    if (linha.status !== 'Perdeu') continue
    const c = conversaoDe(atual, linha.id_parceiro)
    if (conversaoMedia === 0 || c < conversaoMedia) continue
    out.push({
      id: `${linha.id_parceiro}:banner`,
      base: 'operacao',
      acao: 'Recolocar banner',
      parceiro: linha.parceiro,
      executivo: linha.executivo,
      motivo: `Perdeu o banner este mês e mesmo assim converte ${dec(c)} por hora, acima da média de ${dec(conversaoMedia)}.`,
      impacto: 'Vitrine retirada de um parceiro que estava performando acima do grupo.',
      prioridade: 'alta',
      score: 80 + (c / conversaoMedia - 1) * 60,
    })
  }

  // 7. Operação: cadastro de almoço contradiz o que os pedidos mostram.
  for (const p of atual.parceiros) {
    if (p.abre_almoco) continue
    const almoco = atual.pedidosAlmoco.get(p.id_parceiro) ?? 0
    if (almoco === 0) continue
    out.push({
      id: `${p.id_parceiro}:cadastro`,
      base: 'operacao',
      acao: 'Corrigir cadastro de horário',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `Cadastro diz que não abre no almoço, mas ${almoco} pedidos foram registrados entre 11h e 14h.`,
      impacto: 'Enquanto o cadastro estiver errado, toda promo de almoço vai para o alvo errado.',
      prioridade: 'alta',
      score: 90 + almoco / 10,
    })
  }

  // 8. Operação: budget parado que dá para realocar.
  for (const [id, promos] of promosPorParceiro) {
    const needed = promos.reduce((a, x) => a + x.budget_needed, 0)
    const real = promos.reduce((a, x) => a + x.budget_real, 0)
    if (needed < 1000 || real / needed > 0.6) continue
    const p = atual.parceiros.find((x) => x.id_parceiro === id)
    if (!p) continue
    out.push({
      id: `${id}:budget`,
      base: 'operacao',
      acao: 'Realocar budget não consumido',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `Consumiu ${pct(real / needed)} do budget previsto — ${moeda(needed - real)} parados no período.`,
      impacto: `${moeda(needed - real)} disponíveis para quem está convertendo acima da média.`,
      prioridade: needed - real > 4000 ? 'media' : 'baixa',
      score: (needed - real) / 100,
    })
  }

  // 9. Operação: promo ativa sem nenhuma hora online.
  for (const p of atual.parceiros) {
    const horas = atual.horasPorParceiro.get(p.id_parceiro) ?? 0
    const promos = promosPorParceiro.get(p.id_parceiro) ?? []
    if (horas > 0 || promos.length === 0) continue
    out.push({
      id: `${p.id_parceiro}:retomar`,
      base: 'operacao',
      acao: 'Pausar promo e reativar a operação',
      parceiro: p.nome,
      executivo: nomeExecutivo(p.id_executivo),
      motivo: `${promos.length} ${promos.length === 1 ? 'promoção ativa' : 'promoções ativas'} e zero hora online em ${atual.dias.length} dias.`,
      impacto: `${moeda(promos.reduce((a, x) => a + x.budget_real, 0))} de budget rodando para uma loja fechada.`,
      prioridade: 'alta',
      score: 140,
    })
  }

  return out.sort((a, b) => b.score - a.score)
}

export function contarPorBase(lista: Sugestao[]): Record<BaseSugestao, number> {
  const base: Record<BaseSugestao, number> = {
    vendas: 0,
    pedidos: 0,
    reclamacoes: 0,
    operacao: 0,
  }
  for (const s of lista) base[s.base]++
  return base
}

/** Reclamações por 100 pedidos no recorte — usada no cabeçalho da aba. */
export function taxaReclamacaoGeral(s: Snapshot): number {
  let reclamacoes = 0
  for (const v of s.reclamacoes.values()) reclamacoes += v
  return s.totalPedidos === 0 ? 0 : (reclamacoes / s.totalPedidos) * 100
}

export const TOTAL_RECLAMACOES_SEED = dataset.reclamacoes.length
