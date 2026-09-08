import { fmtDec, fmtInt, fmtMoeda, fmtPct } from './format'
import { alertas, kpis, tabelaExecutivos, type Snapshot } from './queries'
import {
  contarPorBase,
  sugestoes as calcularSugestoes,
  taxaReclamacaoGeral,
  type Sugestao,
} from './sugestoes'

export interface Resposta {
  texto: string
  sugestoes: Sugestao[]
  followUps: string[]
}

export const PERGUNTAS_INICIAIS: string[] = [
  'O que criar agora?',
  'Onde estou perdendo receita?',
  'Quem precisa de atenção?',
  'Resumo do período',
]

type Intento = 'criar' | 'receita' | 'reclamacoes' | 'executivos' | 'resumo'

/** Sem acento e em minúscula: o usuário escreve "atenção", "atencao" e "ATENÇÃO". */
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const PALAVRAS: { intento: Intento; termos: string[] }[] = [
  {
    intento: 'criar',
    termos: [
      'criar',
      'crio',
      'promo',
      'sugest',
      'oportunidad',
      'o que fazer',
      'recomend',
      'acao',
      'acoes',
      'prioridad',
      'proximo passo',
    ],
  },
  {
    intento: 'receita',
    termos: [
      'receita',
      'venda',
      'faturamento',
      'perdendo',
      'perda',
      'perder',
      'perco',
      'gmv',
      'dinheiro',
      'queda',
      'caiu',
      'ticket',
    ],
  },
  {
    intento: 'reclamacoes',
    termos: ['reclamac', 'qualidade', 'insatisfa', 'churn', 'nps', 'problema', 'gravidade'],
  },
  {
    intento: 'executivos',
    termos: [
      'quem',
      'executivo',
      'time',
      'atencao',
      'carteira',
      'responsavel',
      'pessoa',
      'aderencia',
      'gerente',
    ],
  },
  {
    intento: 'resumo',
    termos: [
      'resumo',
      'visao geral',
      'como estamos',
      'como esta',
      'panorama',
      'geral',
      'status',
      'numeros',
      'overview',
      'periodo',
      'alerta',
    ],
  },
]

/** Maior número de termos batidos vence; empate fica com a ordem da lista. */
function classificar(pergunta: string): Intento | null {
  const texto = normalizar(pergunta)
  if (texto === '') return null

  let melhor: Intento | null = null
  let maior = 0
  for (const { intento, termos } of PALAVRAS) {
    const acertos = termos.filter((t) => texto.includes(t)).length
    if (acertos > maior) {
      maior = acertos
      melhor = intento
    }
  }
  return melhor
}

const plural = (n: number, um: string, muitos: string) => `${fmtInt(n)} ${n === 1 ? um : muitos}`

function variacao(agora: number, antes: number): string {
  if (antes === 0) return 'sem base de comparação no período anterior'
  const d = (agora - antes) / antes
  const sinal = d >= 0 ? '+' : '−'
  return `${sinal}${fmtPct(Math.abs(d))} contra ${fmtMoeda(antes)} do período anterior`
}

export function responder(pergunta: string, atual: Snapshot, anterior: Snapshot): Resposta {
  const lista = calcularSugestoes(atual, anterior)
  const contagem = contarPorBase(lista)
  const intento = classificar(pergunta)

  switch (intento) {
    case 'criar': {
      const topo = lista.slice(0, 5)
      const altas = lista.filter((s) => s.prioridade === 'alta').length
      if (lista.length === 0) {
        return {
          texto:
            'Nenhuma sugestão sai do recorte atual: os sinais de vendas, pedidos, reclamações e operação estão dentro do esperado. Mudar o período ou tirar filtros costuma trazer casos de volta.',
          sugestoes: [],
          followUps: ['Resumo do período', 'Quem precisa de atenção?'],
        }
      }
      return {
        texto:
          `${plural(lista.length, 'sugestão sai', 'sugestões saem')} do recorte atual, ` +
          `${altas} de prioridade alta. Estas são as ${topo.length} de maior score.\n\n` +
          `Por base do sinal: vendas ${contagem.vendas}, pedidos ${contagem.pedidos}, ` +
          `reclamações ${contagem.reclamacoes}, operação ${contagem.operacao}.`,
        sugestoes: topo,
        followUps: [
          'Onde estou perdendo receita?',
          'Como estão as reclamações?',
          'Quem precisa de atenção?',
        ],
      }
    }

    case 'receita': {
      const daBase = lista.filter((s) => s.base === 'vendas')
      const quedas = daBase.filter((s) => s.acao.includes('retomada'))
      const semSpecial = daBase.length - quedas.length
      const cabecalho =
        `Receita do período: ${fmtMoeda(atual.receitaTotal)} em ` +
        `${fmtInt(atual.totalPedidos)} pedidos — ${variacao(atual.receitaTotal, anterior.receitaTotal)}.`

      const corpo =
        daBase.length === 0
          ? 'Nenhum parceiro do recorte disparou regra de vendas: ninguém caiu mais de 20% contra o período anterior nem converte muito acima da média sem promo special.'
          : `${plural(daBase.length, 'sugestão da base Vendas mostra', 'sugestões da base Vendas mostram')} onde a receita está exposta. ` +
            (quedas.length === 0
              ? 'Nenhum parceiro caiu mais de 20% contra o período anterior. '
              : `${plural(quedas.length, 'parceiro caiu', 'parceiros caíram')} mais de 20% contra o período anterior. `) +
            (semSpecial === 0
              ? ''
              : `${plural(semSpecial, 'converte', 'convertem')} acima da média do grupo sem promo special segurando o ganho.`)

      return {
        texto: `${cabecalho}\n\n${corpo}`,
        sugestoes: daBase.slice(0, 5),
        followUps: [
          'O que criar agora?',
          'Quem precisa de atenção?',
          'Como estão as reclamações?',
        ],
      }
    }

    case 'reclamacoes': {
      const daBase = lista.filter((s) => s.base === 'reclamacoes')
      let total = 0
      for (const v of atual.reclamacoes.values()) total += v
      let graves = 0
      for (const v of atual.reclamacoesGraves.values()) graves += v
      const taxa = taxaReclamacaoGeral(atual)
      const taxaAntes = taxaReclamacaoGeral(anterior)
      return {
        texto:
          `${fmtDec(taxa, 2)} reclamações por 100 pedidos no recorte ` +
          `(${fmtDec(taxaAntes, 2)} no período anterior). São ${fmtInt(total)} reclamações no total, ` +
          `${fmtInt(graves)} de gravidade alta.\n\n` +
          (daBase.length === 0
            ? 'Nenhum parceiro está tão acima da média a ponto de abrir plano de qualidade antes de promo.'
            : `${plural(daBase.length, 'parceiro está', 'parceiros estão')} com taxa muito acima da média do grupo — nestes, promoção em cima de operação ruim acelera o churn.`),
        sugestoes: daBase.slice(0, 5),
        followUps: ['Quem precisa de atenção?', 'O que criar agora?', 'Resumo do período'],
      }
    }

    case 'executivos': {
      const execs = tabelaExecutivos(atual, alertas(atual))
      const piores = execs.slice(0, 3)
      const porExec = new Map<string, number>()
      for (const s of lista) porExec.set(s.executivo, (porExec.get(s.executivo) ?? 0) + 1)

      if (piores.length === 0) {
        return {
          texto: 'Nenhum executivo tem parceiro no recorte atual. Tire filtros para ver a carteira.',
          sugestoes: [],
          followUps: PERGUNTAS_INICIAIS,
        }
      }

      const linhas = piores.map(
        (e) =>
          `• ${e.executivo} — ${fmtPct(e.pct_aderencia)} de aderência, ${e.ativos} de ${e.parceiros} parceiros ativos, ` +
          `${e.alertas} ${e.alertas === 1 ? 'alerta' : 'alertas'} e ${porExec.get(e.executivo) ?? 0} ${(porExec.get(e.executivo) ?? 0) === 1 ? 'sugestão' : 'sugestões'} na carteira.`,
      )
      const alvo = new Set(piores.map((e) => e.executivo))
      return {
        texto:
          `Os ${piores.length} executivos com pior aderência no recorte:\n\n${linhas.join('\n')}\n\n` +
          'Aderência é o primeiro corte porque promo que não roda todos os dias do período não vira receita.',
        sugestoes: lista.filter((s) => alvo.has(s.executivo)).slice(0, 5),
        followUps: ['O que criar agora?', 'Onde estou perdendo receita?', 'Resumo do período'],
      }
    }

    case 'resumo': {
      const listaAlertas = alertas(atual)
      const ocorrencias = listaAlertas.reduce((a, x) => a + x.linhas.length, 0)
      const ativos = [...atual.horasPorParceiro.values()].filter((h) => h > 0).length
      const aderencia = kpis(atual, anterior).find((k) => k.chave === 'aderencia')
      return {
        texto:
          `${fmtInt(atual.parceiros.length)} parceiros no recorte, ${fmtInt(ativos)} com hora online no período.\n\n` +
          `Pedidos: ${fmtInt(atual.totalPedidos)}. Receita: ${fmtMoeda(atual.receitaTotal)} — ` +
          `${variacao(atual.receitaTotal, anterior.receitaTotal)}.\n` +
          `Aderência geral: ${aderencia?.valor ?? '—'} (${aderencia?.contexto ?? 'sem promo no período'}).\n` +
          `Reclamações: ${fmtDec(taxaReclamacaoGeral(atual), 2)} por 100 pedidos.\n\n` +
          `${plural(listaAlertas.length, 'alerta aberto', 'alertas abertos')} com ${plural(ocorrencias, 'ocorrência', 'ocorrências')}, e ${plural(lista.length, 'sugestão', 'sugestões')} na fila.`,
        sugestoes: lista.slice(0, 3),
        followUps: [
          'O que criar agora?',
          'Quem precisa de atenção?',
          'Onde estou perdendo receita?',
        ],
      }
    }

    default:
      return {
        texto:
          'Não entendi essa. Eu não invento resposta: só leio os números do recorte que está filtrado agora.\n\n' +
          'O que eu sei responder: que promoções criar e com que prioridade, onde a receita está caindo, como estão as reclamações por 100 pedidos, quais executivos estão com pior aderência, e um resumo do período.',
        sugestoes: [],
        followUps: PERGUNTAS_INICIAIS,
      }
  }
}
