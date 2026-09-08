import { makeRng } from './rng'
import type {
  Categoria,
  Dataset,
  DimExecutivo,
  DimGerente,
  DimParceiro,
  FatoHoras,
  FatoOcorrencia,
  FatoPedido,
  FatoPromo,
  FatoReclamacao,
  HistBanner,
  MotivoOcorrencia,
  Responsabilidade,
  SubtipoReclamacao,
  TipoOcorrencia,
  TipoPromo,
  TipoReclamacao,
} from './types'

export const HOJE = '2026-09-08'
export const MESES = ['2026-07', '2026-08', '2026-09']
export const MES_ATUAL = '2026-09'
export const MES_ANTERIOR = '2026-08'

const INICIO = '2026-07-01'

/**
 * Casos plantados para que cada alerta tenha evidência real no seed.
 * Os IDs são fixos para que a demonstração seja reprodutível.
 */
export const CASOS: {
  zeroHoras: string[]
  pizzaAlmoco: string[]
  pedidoSemHora: string[]
  budgetEstourado: string[]
  aderenciaTravada: string[]
  executivoPerfeito: string
  perdeuBanner: string[]
  qualidadeCaindo: string[]
  chargebackRecorrente: string[]
  reembolsoAlto: string[]
  naoEntregueMesAtual: string[]
} = {
  zeroHoras: ['P07', 'P23', 'P41'],
  pizzaAlmoco: ['P13', 'P34'],
  pedidoSemHora: ['P19'],
  budgetEstourado: ['P05', 'P28', 'P44'],
  aderenciaTravada: ['P16', 'P31'],
  executivoPerfeito: 'E04',
  perdeuBanner: ['P03', 'P11', 'P22', 'P37'],
  qualidadeCaindo: ['P09', 'P26', 'P48'],
  // Operação de problemas: cada caso sustenta uma leitura da aba de perdas.
  chargebackRecorrente: ['P12'],
  reembolsoAlto: ['P29'],
  naoEntregueMesAtual: ['P08', 'P17'],
}

const GERENTES: DimGerente[] = [
  { id_gerente: 'G01', nome: 'Marina Prado', regiao: 'São Paulo' },
  { id_gerente: 'G02', nome: 'Diego Fontes', regiao: 'Rio de Janeiro' },
  { id_gerente: 'G03', nome: 'Aline Rebouças', regiao: 'Nordeste' },
]

const NOMES_EXEC = [
  'Bruno Tavares',
  'Camila Nakamura',
  'Rafael Siqueira',
  'Letícia Barros',
  'Thiago Menezes',
  'Priscila Domingues',
  'Gustavo Alencar',
  'Fernanda Lopes',
  'Everton Machado',
  'Juliana Castro',
]

const PRACAS: Record<string, { praca: string; cidade: string }[]> = {
  G01: [
    { praca: 'SP — Zona Sul', cidade: 'São Paulo' },
    { praca: 'SP — Zona Oeste', cidade: 'São Paulo' },
    { praca: 'ABC Paulista', cidade: 'Santo André' },
  ],
  G02: [
    { praca: 'RJ — Zona Sul', cidade: 'Rio de Janeiro' },
    { praca: 'RJ — Barra', cidade: 'Rio de Janeiro' },
    { praca: 'Niterói', cidade: 'Niterói' },
  ],
  G03: [
    { praca: 'Recife', cidade: 'Recife' },
    { praca: 'Salvador', cidade: 'Salvador' },
    { praca: 'Fortaleza', cidade: 'Fortaleza' },
  ],
}

const PREFIXO: Record<Categoria, string[]> = {
  pizza: ['Pizzaria', 'Forno', 'Cantina', 'Mamma', 'Pizza'],
  burger: ['Burger', 'Smash', 'Grill', 'Brasa', 'Hamburgueria'],
  combo: ['Sabor', 'Rango', 'Cozinha', 'Casa', 'Bistrô'],
}

const SUFIXO = [
  'do Vale',
  'Central',
  'da Praça',
  'Express',
  'do Porto',
  'Bella',
  'Real',
  'da Vila',
  'Dois Irmãos',
  'Prime',
  'da Serra',
  'Nova',
  'Popular',
  'do Largo',
  'Artesanal',
  'Bom Ponto',
  'Recanto',
  'Esquina',
]

function diasDoMes(mes: string): string[] {
  const [y, m] = mes.split('-').map(Number)
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const out: string[] = []
  for (let d = 1; d <= total; d++) {
    const iso = `${mes}-${String(d).padStart(2, '0')}`
    if (iso > HOJE) break
    out.push(iso)
  }
  return out
}

function todosOsDias(): string[] {
  return MESES.flatMap(diasDoMes).filter((d) => d >= INICIO)
}

/** Deslocamento de data em UTC — o seed nunca lê o relógio da máquina. */
function addDiasIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function diaSemana(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Peso relativo de pedidos por hora do dia, separado em almoço e jantar. */
const CURVA_ALMOCO: Record<number, number> = { 11: 0.6, 12: 1, 13: 0.8, 14: 0.35 }
const CURVA_JANTAR: Record<number, number> = {
  18: 0.52,
  19: 0.9,
  20: 1,
  21: 0.83,
  22: 0.44,
  23: 0.21,
}

/** Cada subtipo pertence a uma família só — é o que faz os dois cortes baterem. */
const SUBTIPOS_POR_TIPO: Record<TipoReclamacao, SubtipoReclamacao[]> = {
  atraso: ['atraso_entrega', 'atraso_preparo'],
  pedido_errado: ['pedido_incompleto', 'pedido_trocado', 'cobranca_indevida'],
  qualidade: ['comida_fria', 'comida_estragada', 'embalagem_violada'],
  cancelamento: [
    'cancelado_pelo_parceiro',
    'cancelado_por_falta_de_entregador',
    'cancelado_pelo_cliente',
  ],
}

type Peso<T extends string> = [T, number][]

/** Frequência relativa de cada motivo na operação de delivery. */
const PESO_MOTIVO: Peso<MotivoOcorrencia> = [
  ['atraso_excessivo', 20],
  ['item_faltando', 18],
  ['pedido_nao_entregue', 14],
  ['item_errado', 14],
  ['qualidade_comida', 12],
  ['embalagem_danificada', 7],
  ['restaurante_fechado', 6],
  ['endereco_incorreto', 5],
  ['cobranca_duplicada', 5],
  ['fraude_suspeita', 3],
]

/** O desfecho financeiro depende do motivo: item faltando vira reembolso, cobrança duplicada vira estorno. */
const TIPO_POR_MOTIVO: Record<MotivoOcorrencia, Peso<TipoOcorrencia>> = {
  pedido_nao_entregue: [
    ['reembolso', 62],
    ['estorno', 20],
    ['cancelamento', 12],
    ['chargeback', 6],
  ],
  atraso_excessivo: [
    ['cancelamento', 48],
    ['reembolso', 40],
    ['estorno', 12],
  ],
  item_faltando: [
    ['reembolso', 78],
    ['estorno', 22],
  ],
  item_errado: [
    ['reembolso', 70],
    ['estorno', 22],
    ['cancelamento', 8],
  ],
  qualidade_comida: [
    ['reembolso', 80],
    ['estorno', 20],
  ],
  embalagem_danificada: [
    ['reembolso', 85],
    ['estorno', 15],
  ],
  cobranca_duplicada: [
    ['estorno', 55],
    ['chargeback', 35],
    ['reembolso', 10],
  ],
  fraude_suspeita: [
    ['chargeback', 72],
    ['estorno', 22],
    ['reembolso', 6],
  ],
  endereco_incorreto: [
    ['cancelamento', 55],
    ['reembolso', 30],
    ['estorno', 15],
  ],
  restaurante_fechado: [
    ['cancelamento', 82],
    ['reembolso', 18],
  ],
}

const RESPONSAVEL_POR_MOTIVO: Record<MotivoOcorrencia, Peso<Responsabilidade>> = {
  pedido_nao_entregue: [
    ['entregador', 46],
    ['plataforma', 22],
    ['parceiro', 18],
    ['indefinida', 14],
  ],
  atraso_excessivo: [
    ['entregador', 40],
    ['parceiro', 38],
    ['plataforma', 18],
    ['cliente', 4],
  ],
  item_faltando: [
    ['parceiro', 86],
    ['entregador', 8],
    ['indefinida', 6],
  ],
  item_errado: [
    ['parceiro', 88],
    ['plataforma', 6],
    ['indefinida', 6],
  ],
  qualidade_comida: [
    ['parceiro', 92],
    ['plataforma', 4],
    ['indefinida', 4],
  ],
  embalagem_danificada: [
    ['parceiro', 55],
    ['entregador', 40],
    ['indefinida', 5],
  ],
  cobranca_duplicada: [
    ['plataforma', 78],
    ['indefinida', 12],
    ['parceiro', 10],
  ],
  fraude_suspeita: [
    ['cliente', 52],
    ['indefinida', 26],
    ['plataforma', 14],
    ['parceiro', 8],
  ],
  endereco_incorreto: [
    ['cliente', 72],
    ['entregador', 16],
    ['plataforma', 8],
    ['indefinida', 4],
  ],
  restaurante_fechado: [
    ['parceiro', 90],
    ['plataforma', 8],
    ['indefinida', 2],
  ],
}

/** Reembolso de item faltando devolve parte; não entregue e cancelamento devolvem tudo. */
const MOTIVOS_PARCIAIS: MotivoOcorrencia[] = ['item_faltando', 'item_errado', 'embalagem_danificada']

function sorteioPonderado<T extends string>(pesos: Peso<T>, sorteio: number): T {
  let total = 0
  for (const [, peso] of pesos) total += peso
  let acc = 0
  const alvo = sorteio * total
  for (const [valor, peso] of pesos) {
    acc += peso
    if (alvo < acc) return valor
  }
  return pesos[pesos.length - 1][0]
}

function build(): Dataset {
  const rng = makeRng(99_2026)
  const dias = todosOsDias()

  const executivos: DimExecutivo[] = NOMES_EXEC.map((nome, i) => ({
    id_executivo: `E${String(i + 1).padStart(2, '0')}`,
    nome,
    id_gerente: i < 4 ? 'G01' : i < 7 ? 'G02' : 'G03',
    ativo: true,
  }))

  const categorias: Categoria[] = ['pizza', 'burger', 'combo']
  const parceiros: DimParceiro[] = []
  for (let i = 0; i < 50; i++) {
    const id_parceiro = `P${String(i + 1).padStart(2, '0')}`
    const exec = executivos[i % executivos.length]
    const categoria = categorias[i % 3]
    const local = PRACAS[exec.id_gerente][i % 3]
    const abreAlmoco = CASOS.pizzaAlmoco.includes(id_parceiro) ? false : rng.bool(0.62)
    parceiros.push({
      id_parceiro,
      nome: `${rng.pick(PREFIXO[categoria])} ${rng.pick(SUFIXO)}`,
      categoria,
      abre_almoco: abreAlmoco,
      cidade: local.cidade,
      praca: local.praca,
      id_executivo: exec.id_executivo,
      ativo: true,
    })
  }

  // Desambigua nomes repetidos para que a tabela nunca mostre duas linhas idênticas.
  const vistos = new Map<string, number>()
  for (const p of parceiros) {
    const n = (vistos.get(p.nome) ?? 0) + 1
    vistos.set(p.nome, n)
    if (n > 1) p.nome = `${p.nome} ${n}`
  }

  const porId = new Map(parceiros.map((p) => [p.id_parceiro, p]))

  // ---- fato_horas ----------------------------------------------------------
  const horas: FatoHoras[] = []
  const horasPorChave = new Map<string, number>()
  for (const p of parceiros) {
    const base = rng.float(6.5, 11.5)
    for (const dia of dias) {
      const mes = dia.slice(0, 7)
      const fds = [0, 6].includes(diaSemana(dia))
      let h = Math.max(0, base * (fds ? rng.float(0.75, 1.15) : rng.float(0.85, 1.1)))

      // Parceiro que zerou a operação no mês atual mesmo com promo rodando.
      if (CASOS.zeroHoras.includes(p.id_parceiro) && mes === MES_ATUAL) h = 0
      // Parceiro que registra pedido sem nenhuma hora online no dia.
      if (CASOS.pedidoSemHora.includes(p.id_parceiro) && mes === MES_ATUAL) h = 0

      const val = Number(h.toFixed(2))
      horas.push({ id_parceiro: p.id_parceiro, data: dia, horas_online: val })
      horasPorChave.set(`${p.id_parceiro}|${dia}`, val)
    }
  }

  // ---- fato_pedidos --------------------------------------------------------
  const pedidos: FatoPedido[] = []
  let seqPedido = 0
  for (const p of parceiros) {
    const conversaoBase =
      p.categoria === 'pizza' ? rng.float(1.1, 2.2) : p.categoria === 'burger' ? rng.float(1.3, 2.6) : rng.float(0.9, 1.8)
    const ticket = p.categoria === 'pizza' ? 78 : p.categoria === 'burger' ? 54 : 46
    // Nem todo parceiro rende igual no fim de semana nem no almoço: sem essa
    // variação por parceiro, "abaixo da média" não existiria em lugar nenhum.
    const fatorWeekend = rng.bool(0.3) ? rng.float(0.55, 0.85) : rng.float(1.05, 1.5)
    const fatorAlmoco = rng.bool(0.35) ? rng.float(0.15, 0.5) : rng.float(0.85, 1.25)

    for (const dia of dias) {
      const dow = diaSemana(dia)
      const fds = dow === 0 || dow === 6
      const h = horasPorChave.get(`${p.id_parceiro}|${dia}`) ?? 0

      let qtd = Math.round(h * conversaoBase * (fds ? fatorWeekend : rng.float(0.85, 1.1)))

      // Pedidos registrados sem hora online — padrão de fraude.
      if (CASOS.pedidoSemHora.includes(p.id_parceiro) && dia.startsWith(MES_ATUAL)) {
        qtd = rng.int(4, 9)
      }
      if (qtd <= 0) continue

      const almoco = p.abre_almoco || CASOS.pizzaAlmoco.includes(p.id_parceiro)
      const curva: [number, number][] = [
        ...(almoco
          ? Object.entries(CURVA_ALMOCO).map(
              ([k, v]) => [Number(k), v * fatorAlmoco] as [number, number],
            )
          : []),
        ...Object.entries(CURVA_JANTAR).map(([k, v]) => [Number(k), v] as [number, number]),
      ]
      const somaPesos = curva.reduce((s, [, w]) => s + w, 0)

      for (const [hora, peso] of curva) {
        const n = Math.round((qtd * peso) / somaPesos)
        for (let k = 0; k < n; k++) {
          seqPedido++
          pedidos.push({
            id_pedido: `O${String(seqPedido).padStart(6, '0')}`,
            id_parceiro: p.id_parceiro,
            data: dia,
            hora,
            valor: Number((ticket * rng.float(0.6, 1.6)).toFixed(2)),
            dia_semana: dow,
          })
        }
      }
    }
  }

  // ---- fato_promo ----------------------------------------------------------
  const promos: FatoPromo[] = []
  for (const mes of MESES) {
    const diasPeriodo = diasDoMes(mes).length
    for (const p of parceiros) {
      const tipos: TipoPromo[] = []
      if (rng.bool(0.78)) tipos.push('smart')
      if (rng.bool(0.55)) tipos.push('banner')
      if (rng.bool(0.48)) tipos.push('special')
      // Garante promo ativa nos casos plantados que dependem dela.
      if (CASOS.zeroHoras.includes(p.id_parceiro) && !tipos.includes('smart')) tipos.push('smart')
      if (CASOS.pizzaAlmoco.includes(p.id_parceiro) && !tipos.includes('special')) tipos.push('special')

      for (const tipo of tipos) {
        const needed = Math.round(rng.float(1800, 9500))
        let ratio = rng.float(0.62, 1.18)
        let dias_aderencia = Math.round(diasPeriodo * rng.float(0.35, 0.98))

        if (CASOS.budgetEstourado.includes(p.id_parceiro)) ratio = rng.float(1.55, 2.1)
        if (CASOS.aderenciaTravada.includes(p.id_parceiro)) dias_aderencia = diasPeriodo
        if (p.id_executivo === CASOS.executivoPerfeito) dias_aderencia = diasPeriodo
        // Quem zerou horas não pode ter cumprido a promo.
        if (CASOS.zeroHoras.includes(p.id_parceiro) && mes === MES_ATUAL) dias_aderencia = 0

        promos.push({
          id_parceiro: p.id_parceiro,
          id_executivo: p.id_executivo,
          tipo_promo: tipo,
          budget_needed: needed,
          budget_real: Math.round(needed * ratio),
          aderente: dias_aderencia / diasPeriodo >= 0.8,
          dias_aderencia,
          dias_periodo: diasPeriodo,
          data: `${mes}-01`,
        })
      }
    }
  }

  // ---- hist_banner ---------------------------------------------------------
  const banners: HistBanner[] = []
  const bannerAnterior = new Map<string, boolean>()
  for (const mes of MESES) {
    for (const p of parceiros) {
      let tem: boolean
      if (CASOS.perdeuBanner.includes(p.id_parceiro)) {
        tem = mes !== MES_ATUAL
      } else {
        const antes = bannerAnterior.get(p.id_parceiro)
        tem = antes === undefined ? rng.bool(0.55) : rng.bool(antes ? 0.88 : 0.18)
      }
      bannerAnterior.set(p.id_parceiro, tem)
      banners.push({ id_parceiro: p.id_parceiro, mes_ano: mes, tem_banner: tem })
    }
  }

  // ---- fato_reclamacoes ----------------------------------------------------
  const reclamacoes: FatoReclamacao[] = []
  const tiposReclamacao: TipoReclamacao[] = ['atraso', 'pedido_errado', 'qualidade', 'cancelamento']
  // Gerador próprio: o detalhe da reclamação e as ocorrências entram sem
  // deslocar nenhum sorteio das tabelas que já existiam.
  const rngDetalhe = makeRng(31_2026)
  let seqReclamacao = 0
  for (const p of parceiros) {
    // Taxa por 100 pedidos: a maioria opera bem, alguns degradam no mês atual.
    const taxaBase = rng.float(0.8, 3.2)
    for (const dia of dias) {
      const pedidosDoDia = Math.round((horasPorChave.get(`${p.id_parceiro}|${dia}`) ?? 0) * 1.6)
      const degradado =
        CASOS.qualidadeCaindo.includes(p.id_parceiro) && dia.startsWith(MES_ATUAL) ? 4.5 : 1
      const esperado = (pedidosDoDia * taxaBase * degradado) / 100
      let n = Math.floor(esperado)
      if (rng.next() < esperado - n) n++
      for (let k = 0; k < n; k++) {
        seqReclamacao++
        const tipo = rng.pick(tiposReclamacao)
        reclamacoes.push({
          id_reclamacao: `R${String(seqReclamacao).padStart(6, '0')}`,
          id_parceiro: p.id_parceiro,
          data: dia,
          tipo,
          subtipo: rngDetalhe.pick(SUBTIPOS_POR_TIPO[tipo]),
          gravidade: rng.bool(0.18) ? 'alta' : rng.bool(0.45) ? 'media' : 'baixa',
        })
      }
    }
  }

  // ---- fato_ocorrencias ----------------------------------------------------
  const rngOco = makeRng(77_2026)
  const ocorrencias: FatoOcorrencia[] = []

  const pedidosPorParceiro = new Map<string, FatoPedido[]>()
  for (const o of pedidos) {
    const lista = pedidosPorParceiro.get(o.id_parceiro) ?? []
    lista.push(o)
    pedidosPorParceiro.set(o.id_parceiro, lista)
  }

  let seqOcorrencia = 0
  for (const p of parceiros) {
    const doParceiro = pedidosPorParceiro.get(p.id_parceiro) ?? []
    if (doParceiro.length === 0) continue

    // A carteira sadia fica entre 1,3% e 3% dos pedidos; os casos plantados destoam.
    let taxa = rngOco.float(0.013, 0.03)
    const pesoDe = new Map<MotivoOcorrencia, number>(
      PESO_MOTIVO.map(([m, w]): [MotivoOcorrencia, number] => [m, w * rngOco.float(0.6, 1.4)]),
    )
    const reforcar = (m: MotivoOcorrencia, fator: number) =>
      pesoDe.set(m, (pesoDe.get(m) ?? 0) * fator)

    if (CASOS.chargebackRecorrente.includes(p.id_parceiro)) {
      taxa = rngOco.float(0.045, 0.06)
      reforcar('fraude_suspeita', 16)
      reforcar('cobranca_duplicada', 10)
    }
    if (CASOS.reembolsoAlto.includes(p.id_parceiro)) {
      taxa = rngOco.float(0.085, 0.11)
      reforcar('item_faltando', 3)
      reforcar('qualidade_comida', 2.5)
    }
    if (CASOS.qualidadeCaindo.includes(p.id_parceiro)) reforcar('qualidade_comida', 2)

    const pico = CASOS.naoEntregueMesAtual.includes(p.id_parceiro)
    const jaVistos = new Map<MotivoOcorrencia, string[]>()

    for (const pedido of doParceiro) {
      const noPico = pico && pedido.data.startsWith(MES_ATUAL)
      if (rngOco.next() >= taxa * (noPico ? 4.5 : 1)) continue

      const motivo: MotivoOcorrencia =
        noPico && rngOco.bool(0.72)
          ? 'pedido_nao_entregue'
          : sorteioPonderado([...pesoDe], rngOco.next())
      const tipo = sorteioPonderado(TIPO_POR_MOTIVO[motivo], rngOco.next())
      const responsabilidade = sorteioPonderado(RESPONSAVEL_POR_MOTIVO[motivo], rngOco.next())

      const fracao = MOTIVOS_PARCIAIS.includes(motivo)
        ? rngOco.float(0.25, 0.7)
        : tipo === 'reembolso'
          ? rngOco.float(0.7, 1)
          : 1
      const valor = Math.min(pedido.valor, Number((pedido.valor * fracao).toFixed(2)))

      // Estorno e chargeback já saíram do caixa; reembolso ainda pode estar em análise.
      let ressarcido = valor
      if (tipo === 'reembolso') {
        ressarcido = rngOco.bool(0.12) ? 0 : Number((valor * rngOco.float(0.5, 1)).toFixed(2))
      }

      // Reincidência é recente, não histórica: o mesmo motivo já bateu duas
      // vezes nos 30 dias anteriores neste parceiro.
      const datas = jaVistos.get(motivo) ?? []
      const limite = addDiasIso(pedido.data, -30)
      const recentes = datas.filter((d) => d >= limite).length
      datas.push(pedido.data)
      jaVistos.set(motivo, datas)

      seqOcorrencia++
      ocorrencias.push({
        id_ocorrencia: `X${String(seqOcorrencia).padStart(6, '0')}`,
        id_pedido: pedido.id_pedido,
        id_parceiro: p.id_parceiro,
        data: pedido.data,
        tipo,
        motivo,
        responsabilidade,
        valor,
        valor_ressarcido: Math.min(valor, ressarcido),
        reincidente: recentes >= 2,
      })
    }
  }

  // Sanidade: todo parceiro plantado precisa existir.
  for (const id of [
    ...CASOS.zeroHoras,
    ...CASOS.pizzaAlmoco,
    ...CASOS.pedidoSemHora,
    ...CASOS.budgetEstourado,
    ...CASOS.aderenciaTravada,
    ...CASOS.perdeuBanner,
    ...CASOS.chargebackRecorrente,
    ...CASOS.reembolsoAlto,
    ...CASOS.naoEntregueMesAtual,
  ]) {
    if (!porId.has(id)) throw new Error(`Caso plantado aponta para parceiro inexistente: ${id}`)
  }

  // Sanidade: ocorrência sem pedido real, ou acima do valor do pedido, é dado inventado.
  const valorDoPedido = new Map(pedidos.map((o) => [o.id_pedido, o.valor]))
  for (const oc of ocorrencias) {
    const base = valorDoPedido.get(oc.id_pedido)
    if (base === undefined) {
      throw new Error(`Ocorrência ${oc.id_ocorrencia} aponta para pedido inexistente: ${oc.id_pedido}`)
    }
    if (oc.valor > base || oc.valor_ressarcido > oc.valor || oc.valor < 0) {
      throw new Error(`Ocorrência ${oc.id_ocorrencia} tem valor incoerente com o pedido.`)
    }
  }

  return {
    gerentes: GERENTES,
    executivos,
    parceiros,
    promos,
    pedidos,
    horas,
    banners,
    reclamacoes,
    ocorrencias,
    meses: MESES,
    hoje: HOJE,
  }
}

export const dataset: Dataset = build()

export { diaSemana, diasDoMes }
