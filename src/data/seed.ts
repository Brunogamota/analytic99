import { makeRng } from './rng'
import type {
  Categoria,
  Dataset,
  DimExecutivo,
  DimGerente,
  DimParceiro,
  FatoHoras,
  FatoPedido,
  FatoPromo,
  HistBanner,
  TipoPromo,
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
} = {
  zeroHoras: ['P07', 'P23', 'P41'],
  pizzaAlmoco: ['P13', 'P34'],
  pedidoSemHora: ['P19'],
  budgetEstourado: ['P05', 'P28', 'P44'],
  aderenciaTravada: ['P16', 'P31'],
  executivoPerfeito: 'E04',
  perdeuBanner: ['P03', 'P11', 'P22', 'P37'],
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

    for (const dia of dias) {
      const dow = diaSemana(dia)
      const fds = dow === 0 || dow === 6
      const h = horasPorChave.get(`${p.id_parceiro}|${dia}`) ?? 0

      let qtd = Math.round(h * conversaoBase * (fds ? rng.float(1.05, 1.5) : rng.float(0.85, 1.1)))

      // Pedidos registrados sem hora online — padrão de fraude.
      if (CASOS.pedidoSemHora.includes(p.id_parceiro) && dia.startsWith(MES_ATUAL)) {
        qtd = rng.int(4, 9)
      }
      if (qtd <= 0) continue

      const almoco = p.abre_almoco || CASOS.pizzaAlmoco.includes(p.id_parceiro)
      const curva: [number, number][] = [
        ...(almoco ? Object.entries(CURVA_ALMOCO).map(([k, v]) => [Number(k), v] as [number, number]) : []),
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

  // Sanidade: todo parceiro plantado precisa existir.
  for (const id of [
    ...CASOS.zeroHoras,
    ...CASOS.pizzaAlmoco,
    ...CASOS.pedidoSemHora,
    ...CASOS.budgetEstourado,
    ...CASOS.aderenciaTravada,
    ...CASOS.perdeuBanner,
  ]) {
    if (!porId.has(id)) throw new Error(`Caso plantado aponta para parceiro inexistente: ${id}`)
  }

  return {
    gerentes: GERENTES,
    executivos,
    parceiros,
    promos,
    pedidos,
    horas,
    banners,
    meses: MESES,
    hoje: HOJE,
  }
}

export const dataset: Dataset = build()

export { diaSemana, diasDoMes }
