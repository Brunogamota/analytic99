export type CategoriaIntegracao = 'erp' | 'ia' | 'planilhas' | 'arquivos' | 'comunicacao'

export type EstadoIntegracao = 'nao_conectado' | 'aguardando_credenciais' | 'indisponivel'

export interface Integracao {
  id: string
  nome: string
  categoria: CategoriaIntegracao
  estado: EstadoIntegracao
  resumo: string
  /** O ganho concreto dentro deste dashboard, se um dia estiver ligada. */
  oQueFaz: string[]
  /** O que ainda não existe — credencial, endpoint, aprovação. */
  oQueFalta: string[]
  /**
   * Cor de marca do terceiro — única exceção à paleta do projeto, e só dentro
   * da marca da integração. Borda, texto, badge e botão do card seguem os tokens.
   */
  cor: string
  sigla: string
  /**
   * SVG oficial monocromático (simple-icons) em `public/logos`. Ausente quando a
   * marca não distribui o logo: aí vale o monograma, nunca uma imitação.
   */
  logo?: string
}

export const ROTULO_CATEGORIA: Record<CategoriaIntegracao, string> = {
  erp: 'ERP e financeiro',
  ia: 'Inteligência artificial',
  planilhas: 'Planilhas',
  arquivos: 'Arquivos',
  comunicacao: 'Comunicação',
}

export const ROTULO_ESTADO: Record<EstadoIntegracao, string> = {
  nao_conectado: 'Não conectado',
  aguardando_credenciais: 'Aguardando credenciais',
  indisponivel: 'Indisponível',
}

export const CATEGORIAS: CategoriaIntegracao[] = ['erp', 'ia', 'planilhas', 'arquivos', 'comunicacao']

export const INTEGRACOES: Integracao[] = [
  {
    id: 'sap',
    nome: 'SAP',
    categoria: 'erp',
    estado: 'nao_conectado',
    resumo:
      'O ERP onde o budget do trade já é aprovado. Hoje esse número chega ao dashboard por digitação.',
    oQueFaz: [
      'Traz o budget aprovado por parceiro direto do ERP, em vez de digitação manual.',
      'Carimba cada promoção com o centro de custo que vai pagar a conta.',
      'Gera a nota de débito da promoção sem passar por planilha no meio do caminho.',
    ],
    oQueFalta: [
      'Liberar o endpoint do SAP para a rede do dashboard — hoje ele só responde dentro da VPN.',
      'Cadastrar o usuário técnico e a senha no cofre de credenciais. Peça ao time de TI.',
      'Aprovação de segurança para leitura das tabelas de budget e centro de custo.',
    ],
    cor: '#0FAAFF',
    sigla: 'SAP',
    logo: '/logos/sap.svg',
  },
  {
    id: 'claude',
    nome: 'Claude',
    categoria: 'ia',
    estado: 'nao_conectado',
    resumo:
      'Modelo de linguagem para redigir o resumo do período e explicar de onde veio cada sugestão.',
    oQueFaz: [
      'Redige o resumo do período em texto corrido, a partir dos números do recorte aberto.',
      'Explica por que uma sugestão apareceu, citando o parceiro e a métrica que a puxou.',
      'Reescreve o comentário do executivo no tom do relatório que vai para a diretoria.',
    ],
    oQueFalta: [
      'Chave de API da Anthropic guardada no cofre — nunca no .env que vai para o navegador.',
      'Decidir quais campos podem sair do dashboard: nome de parceiro e receita saem ou ficam?',
      'Aprovação de segurança e do jurídico para enviar dado de parceiro a serviço externo.',
    ],
    cor: '#D97757',
    sigla: 'CL',
    logo: '/logos/claude.svg',
  },
  {
    id: 'chatgpt',
    nome: 'ChatGPT',
    categoria: 'ia',
    estado: 'nao_conectado',
    resumo:
      'Alternativa ao Claude para os mesmos textos. Escolha uma das duas: ligar as duas não melhora o resumo, só duplica custo.',
    oQueFaz: [
      'Redige o resumo do período com os mesmos números que o Claude usaria.',
      'Explica a origem de uma sugestão em linguagem de negócio.',
      'Serve de plano B se o contrato com a outra IA não for aprovado.',
    ],
    oQueFalta: [
      'Chave de API da OpenAI no cofre de credenciais, com limite de gasto definido.',
      'Escolher entre esta e o Claude — o dashboard usa uma IA de texto por vez.',
      'Aprovação de segurança e do jurídico para enviar dado de parceiro a serviço externo.',
    ],
    // OpenAI pediu a remoção do logo do simple-icons: aqui vale monograma.
    cor: '#111111',
    sigla: 'GPT',
  },
  {
    id: 'excel',
    nome: 'Excel',
    categoria: 'planilhas',
    estado: 'nao_conectado',
    resumo: 'A planilha continua sendo o formato que a área financeira aceita. Entra base, sai relatório.',
    oQueFaz: [
      'Importa a base de budget da planilha que a área financeira já mantém.',
      'Exporta o relatório do recorte no layout que o financeiro usa hoje, sem reformatar à mão.',
      'Avisa quando a coluna da planilha mudar de nome e a importação deixar de bater.',
    ],
    oQueFalta: [
      'Fixar o layout da planilha de budget: qual aba, quais colunas, qual mês em qual coluna.',
      'Definir quem publica a versão oficial da base — hoje circulam cópias por e-mail.',
      'Credenciais do Microsoft 365 se a importação for direto do OneDrive, e não por upload.',
    ],
    // Microsoft também saiu do simple-icons: monograma, não uma imitação do ícone.
    cor: '#111111',
    sigla: 'XL',
  },
  {
    id: 'google-drive',
    nome: 'Google Drive',
    categoria: 'arquivos',
    estado: 'nao_conectado',
    resumo: 'Lugar onde o relatório exportado fica depois de pronto, na pasta que o time já usa.',
    oQueFaz: [
      'Salva o relatório exportado direto na pasta do time, sem passar pela pasta de downloads.',
      'Mantém o histórico de versões de cada relatório no lugar onde o time já procura.',
      'Mostra se o relatório do período já foi gerado, para não duplicar arquivo.',
    ],
    oQueFalta: [
      'Consentimento OAuth do Google para a conta do time, aprovado pelo administrador do domínio.',
      'Definir a pasta de destino e quem tem acesso a ela.',
      'Confirmar com segurança se relatório com receita de parceiro pode ficar no Drive.',
    ],
    cor: '#4285F4',
    sigla: 'GD',
    logo: '/logos/googledrive.svg',
  },
  {
    id: 'gmail',
    nome: 'Gmail',
    categoria: 'comunicacao',
    estado: 'nao_conectado',
    resumo: 'Envio do resumo semanal para os gerentes, no e-mail em que eles já leem tudo.',
    oQueFaz: [
      'Envia o resumo semanal do recorte para os gerentes, na segunda de manhã.',
      'Usa o texto do relatório já gerado, sem alguém copiar e colar em uma nova mensagem.',
      'Registra quem recebeu, para o envio não sumir sem ninguém notar.',
    ],
    oQueFalta: [
      'Consentimento OAuth do Google com escopo de envio, aprovado pelo administrador.',
      'Uma conta remetente do time — enviar pela conta pessoal de quem configurou não serve.',
      'Definir a lista de destinatários e a hora do envio.',
    ],
    cor: '#EA4335',
    sigla: 'GM',
    logo: '/logos/gmail.svg',
  },
  {
    id: 'whatsapp',
    nome: 'WhatsApp',
    categoria: 'comunicacao',
    estado: 'nao_conectado',
    resumo: 'Alerta curto para o executivo quando um parceiro da carteira dele zera horas.',
    oQueFaz: [
      'Avisa o executivo no mesmo dia em que um parceiro da carteira dele zera horas.',
      'Manda o nome do parceiro e o link da aba, para a conversa começar já com contexto.',
      'Evita que a queda só apareça na reunião de segunda.',
    ],
    oQueFalta: [
      'Número verificado na API oficial do WhatsApp Business e conta aprovada pela Meta.',
      'Modelo de mensagem aprovado pela Meta — texto livre não passa em alerta automático.',
      'Aceite de cada executivo para receber alerta no número pessoal.',
    ],
    cor: '#25D366',
    sigla: 'WA',
    logo: '/logos/whatsapp.svg',
  },
]

export interface PermissaoEscopo {
  id: string
  /** 'saida': dado do dashboard vai para o serviço. 'entrada': dado do serviço entra no dashboard. */
  direcao: 'saida' | 'entrada'
  rotulo: string
  descricao: string
}

/** Escopo por integração: o que sairia daqui e o que entraria, se um dia ligar. */
export const ESCOPO: Record<string, PermissaoEscopo[]> = {
  sap: [
    {
      id: 'sap-budget',
      direcao: 'entrada',
      rotulo: 'Budget aprovado por parceiro',
      descricao: 'Substitui o valor digitado hoje na aba Gerencial.',
    },
    {
      id: 'sap-centro-custo',
      direcao: 'entrada',
      rotulo: 'Centro de custo e conta contábil',
      descricao: 'Para cada promoção saber qual área paga.',
    },
    {
      id: 'sap-gasto',
      direcao: 'saida',
      rotulo: 'Gasto realizado da promoção',
      descricao: 'Base da nota de débito emitida no ERP.',
    },
    {
      id: 'sap-parceiro',
      direcao: 'saida',
      rotulo: 'Identificação do parceiro e da praça',
      descricao: 'CNPJ e praça, para casar com o cadastro do ERP.',
    },
  ],
  claude: [
    {
      id: 'claude-numeros',
      direcao: 'saida',
      rotulo: 'Números do recorte aberto',
      descricao: 'Horas, receita e budget dos parceiros que estão na tela.',
    },
    {
      id: 'claude-comentarios',
      direcao: 'saida',
      rotulo: 'Comentários escritos pelo time',
      descricao: 'Texto livre do executivo sobre o parceiro.',
    },
    {
      id: 'claude-texto',
      direcao: 'entrada',
      rotulo: 'Resumo e explicação em texto',
      descricao: 'Volta como rascunho, sempre editável antes de enviar.',
    },
  ],
  chatgpt: [
    {
      id: 'chatgpt-numeros',
      direcao: 'saida',
      rotulo: 'Números do recorte aberto',
      descricao: 'Horas, receita e budget dos parceiros que estão na tela.',
    },
    {
      id: 'chatgpt-comentarios',
      direcao: 'saida',
      rotulo: 'Comentários escritos pelo time',
      descricao: 'Texto livre do executivo sobre o parceiro.',
    },
    {
      id: 'chatgpt-texto',
      direcao: 'entrada',
      rotulo: 'Resumo e explicação em texto',
      descricao: 'Volta como rascunho, sempre editável antes de enviar.',
    },
  ],
  excel: [
    {
      id: 'excel-base',
      direcao: 'entrada',
      rotulo: 'Base de budget da planilha',
      descricao: 'Uma linha por parceiro e mês, do arquivo do financeiro.',
    },
    {
      id: 'excel-relatorio',
      direcao: 'saida',
      rotulo: 'Relatório do recorte em .xlsx',
      descricao: 'No layout que o financeiro já recebe hoje.',
    },
    {
      id: 'excel-metas',
      direcao: 'entrada',
      rotulo: 'Metas por praça',
      descricao: 'Se estiverem na mesma planilha, entram junto.',
    },
  ],
  'google-drive': [
    {
      id: 'drive-arquivos',
      direcao: 'saida',
      rotulo: 'Arquivos de relatório exportados',
      descricao: 'Gravados na pasta do time, com data no nome.',
    },
    {
      id: 'drive-lista',
      direcao: 'entrada',
      rotulo: 'Lista de arquivos já na pasta',
      descricao: 'Só nome e data, para não gerar relatório duplicado.',
    },
  ],
  gmail: [
    {
      id: 'gmail-resumo',
      direcao: 'saida',
      rotulo: 'Resumo semanal do recorte',
      descricao: 'Corpo do e-mail, com os mesmos números da tela.',
    },
    {
      id: 'gmail-destinatarios',
      direcao: 'saida',
      rotulo: 'E-mails dos gerentes',
      descricao: 'Endereços do time, usados como destinatários.',
    },
    {
      id: 'gmail-status',
      direcao: 'entrada',
      rotulo: 'Status de entrega',
      descricao: 'Enviado ou falhou, para o envio não sumir calado.',
    },
  ],
  whatsapp: [
    {
      id: 'whatsapp-alerta',
      direcao: 'saida',
      rotulo: 'Alerta de parceiro zerado',
      descricao: 'Nome do parceiro, praça e horas no período.',
    },
    {
      id: 'whatsapp-numero',
      direcao: 'saida',
      rotulo: 'Número do executivo',
      descricao: 'Telefone cadastrado no time, usado como destinatário.',
    },
    {
      id: 'whatsapp-entrega',
      direcao: 'entrada',
      rotulo: 'Confirmação de entrega',
      descricao: 'Se a mensagem chegou ao aparelho.',
    },
  ],
}

export const escopoDe = (id: string): PermissaoEscopo[] => ESCOPO[id] ?? []

/** Fundo do quadrado da marca: a própria cor a 10%, para o glifo respirar. */
export const corFundo = (cor: string): string => `${cor}1A`
