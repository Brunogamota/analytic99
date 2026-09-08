# Decisões

Cada uma resolveu um problema concreto. Antes de desfazer alguma, vale saber o
que ela estava evitando.

---

## Dados e cálculo

### Comparação de período usa o mesmo intervalo de dias
Setembro tem 8 dias no seed. Comparar com agosto inteiro (31 dias) inventaria
uma queda de 74% que não existe. A comparação é 1–8 de setembro contra 1–8 de
agosto.

### O heatmap divide pelas ocorrências do dia da semana
Um recorte de 8 dias contém duas terças e uma quarta. Sem dividir, a coluna
repetida aparecia com o dobro do movimento, e o "pico de terça" era artefato do
calendário.

### "Parceiro ativo" é quem ficou online, não quem está cadastrado
É o que torna o alerta de zero horas coerente com o número do topo. Se ativo
fosse "cadastrado", o KPI diria 50 enquanto o alerta apontaria 4 parados.

### Parcela sem base sai da nota, não vira zero
Na nota de 0 a 100, um executivo sem nenhuma promo no período não tem como
pontuar em aderência. Zerar essa parcela puniria por ausência de dado; ela sai
da conta e os pesos restantes são reescalados.

### O seed tem variação por parceiro no fim de semana e no almoço
Sem ela, todo mundo convertia igual e "abaixo da média" não existia em lugar
nenhum — a base de sugestões por pedidos vinha vazia.

### Subtipo de reclamação em vez de ampliar o tipo
A tipagem fina entrou como campo `subtipo`. Ampliar `TipoReclamacao` quebraria
os `Record<TipoReclamacao, …>` exaustivos que já existiam e faria o gráfico do
Gerencial contar menos linhas do que a base tem. Os dois cortes somam o mesmo
total.

---

## Design

### Cor só onde há decisão
A interface teve quatro famílias de cor (amarelo, laranja, verde e rosa) e KPI
cards em fundo pastel. O olho ia para a moldura, não para o número, e nenhum
card se destacava porque todos gritavam. Hoje: o que cruzou a meta sai em rosa,
o resto fica em preto ou cinza.

### Os tokens semânticos antigos continuam existindo
`verde`, `amarelo` e `laranja` ainda estão no `tailwind.config.js`, apontando
para a nova família. Foi o que permitiu trocar a paleta inteira sem varrer
dezenas de arquivos. Não são cores de verdade — não conte com elas.

### Alertas viraram lista
Eram quatro banners coloridos empilhados, ocupando meia tela. A severidade cabe
num ponto de 6px, e o que a gestora compara entre as linhas é a contagem.

### Fontes hospedadas no projeto
Inter e Instrument Serif ficam em `public/fonts/`, não vêm do Google Fonts. O
dashboard pode rodar em rede fechada, e CDN de fonte é ponto de falha externo.

---

## Referências: o que foi adaptado e por quê

### Manus — o design system
Adotado: neutros quentes, cantos de 12px, chips em pill, título em serifa,
respiro. O chat do copiloto segue o layout dele.

Não adotado: o neutro quente virou cinza puro quando a paleta foi para
rosa/branco/preto.

### shadcn — a sidebar
Portada com a API completa (`SidebarProvider`, `SidebarMenuButton`,
`SidebarTrigger`), colapsável por botão ou Ctrl+B.

**Não instalamos o shadcn.** O componente original puxa `button`, `input`,
`sheet`, `skeleton`, `separator`, `tooltip` e os tokens `--sidebar-*` — seria um
segundo design system brigando com o que já existia. O `Sheet` mobile foi
cortado: o dash tem largura mínima de 1366px.

### TailGrids — os gráficos
O wrapper de Recharts foi portado com `cva`, adaptado para Recharts v3 e para os
nossos tokens.

### roadmap-ui — o Gantt
Portado sem Next.js e sem shadcn, com datas em `ptBR`.

### ClickUp — os fluxos de time e tarefa
A estrutura foi replicada: lista lateral, criação com ícone e handle, detalhe em
abas internas; e na tarefa, nome primeiro com foco, propriedades em chips.

### Front, Fresha, Intercom, Visitors
Front deu o padrão de KPI e tabela. Fresha deu o comportamento dos filtros
(transformar a visão sem mudar o layout) e dos formulários progressivos.
Intercom deu os atalhos de período. Visitors deu a nota em donut com
decomposição e os chips de filtro removíveis.

### Logos das integrações
SAP, Claude, Gmail, Google Drive e WhatsApp usam o SVG oficial do pacote
`simple-icons`. **ChatGPT e Excel ficaram em monograma**: a OpenAI e a Microsoft
pediram a remoção dos seus ícones dessa biblioteca, e desenhar de memória
produziria um logo errado se passando por oficial.

---

## Honestidade da interface

### Integrações não dizem "conectado"
Nenhuma conecta. O fluxo termina em "aguardando credenciais" e há uma faixa no
topo avisando. Um "conectado" falso faria alguém contar com um dado que nunca
vai chegar.

### O copiloto não é IA
É um classificador por palavra-chave sobre números já calculados. Quando não
entende, diz que não entendeu e lista o que sabe responder. A tela não usa a
palavra "IA" para descrever esse mecanismo.

### A importação também não é IA
O reconhecimento é heurístico: nome da coluna mais formato dos valores, com o
formato podendo derrubar o nome. A tela diz "detecção automática por nome e
formato das colunas. Confira antes de importar".

### A visão emprestada avisa que é emprestada
Ao ver como um executivo, uma faixa fixa diz de quem é a visão, com saída em um
clique. Sem isso, alguém decidiria achando que está vendo o time inteiro.
