# O produto

## Quem usa e para quê

**Carolina Martinovic**, gestora comercial da equipe Barbie Village no 99Food.
Abaixo dela há 3 gerentes regionais, 10 executivos de contas e 50 parceiros
(restaurantes) distribuídos em 9 praças.

O trabalho dela é garantir que o time execute: que o parceiro com promoção
esteja de fato operando, que o budget aprovado seja usado como devia, que quem
perdeu vitrine seja recuperado, e que ninguém esteja inflando número.

A pergunta que o dashboard responde: **onde eu preciso olhar hoje?**

---

## As telas

### Gerencial
A porta de entrada. Quatro KPIs no topo (parceiros ativos, com promo ativa, taxa
de aderência e budget consumido), a lista de alertas, o heatmap de horários, os
três gráficos do período e a tabela do time com drill-down por executivo.

Aderência abaixo de 70% e budget acima de 110% ficam em rosa — o resto fica
neutro.

### Sugestões
Um copiloto que responde por palavra-chave, **sem LLM**. A pessoa pergunta
("onde estou perdendo receita?") e ele responde com os números reais das
queries, mais os cartões de sugestão que couberem.

As sugestões vêm de nove regras em `src/lib/sugestoes.ts`, cada uma cruzando um
sinal medido com a ausência de uma ação: converte acima da média **e** não tem
promo special; perdeu o banner **e** performa acima do grupo; reclamação
dobrando **antes** de a venda cair. Cada cartão carrega o número que o gerou,
para poder ser contestado.

Quando não entende a pergunta, ele diz que não entendeu e lista o que sabe
responder. Não inventa.

### Performance
A mesma base em três recortes: **pessoa**, **local** (praça, com detalhe por
cidade) e **categoria** (pizza, burger, combo).

Cada recorte recebe uma **nota de 0 a 100** cuja composição aparece na tela:
aderência 40, conversão 30, disciplina de budget 20, qualidade 10. Parcela sem
base sai da conta em vez de virar zero, e os pesos restantes são reescalados.
Clicar numa linha vira um chip de filtro que recorta a página inteira.

### Relatórios
Duas visões. **Operação**: a mesma base quebrada por praça, categoria, gerente
ou executivo, mais o detalhe por parceiro, com exportação CSV em formato
brasileiro. **Perdas e ocorrências**: reembolso, estorno, cancelamento e
chargeback, com dez motivos de delivery e a responsabilidade apurada de cada um.

### Promo Smart / Banner / Special
As três frentes de promoção, uma tabela cada. Banner compara o mês atual com o
anterior e classifica em Manteve, Perdeu, Ganhou ou Nunca teve — "Perdeu" é o
que vira alerta.

### Times
Grupos de trabalho no fluxo do ClickUp: lista à esquerda, criação com ícone,
nome e handle, e o detalhe com abas internas de visão geral, analytics, membros
e prioridades. O período do detalhe recalcula um snapshot só daquele time.

### Equipe
As pessoas e o que cada uma acessa. Filtro por papel, área e **por permissão**
("mostre quem pode aprovar budget"). Dois fluxos: adicionar membro direto e
convidar, sendo que o convite define acesso em duas colunas — o que pode e o que
não pode, com o efeito da negação escrito por extenso. Convidado entra como
pendente, nunca como ativo.

### Tarefas
Gantt com as frentes de trabalho, arraste para mudar prazo, marcos e linha do
"hoje". Criação no padrão do ClickUp: o nome é o primeiro campo e já nasce com
foco, as propriedades ficam em chips, e a tarefa pode nascer só com o nome.

### Minha visão
O dashboard como um executivo veria: metas dele, tarefas dele, copiloto
restrito à carteira dele. **Não vê ranking, colega nem budget consolidado.**

A gestora entra nessa visão pelo seletor de perfil no topo, e uma faixa fixa
avisa "vendo como fulano" com saída em um clique. O perfil sobrepõe os filtros
antes do snapshot, então não dá para sair do recorte pelo filtro.

### Importar dados
Sobe CSV, TSV ou XLSX e o sistema reconhece a que tabela o arquivo pertence e o
que cada coluna significa. O reconhecimento cruza dois sinais — nome da coluna e
formato dos valores — e **o formato pode derrubar o nome** quando discordam: uma
coluna chamada "loja" cheia de datas fica sem mapeamento em vez de virar
parceiro. Valida antes de importar e mostra o que está errado, linha a linha.

Nada é gravado no seed: o dado importado vive na sessão.

### Integrações
Catálogo de SAP, Claude, ChatGPT, Excel, Google Drive, Gmail e WhatsApp, com o
que cada uma faria e o que falta para ligar de verdade. **Nenhuma conecta** —
está escrito na tela.

---

## Os dados de exemplo

3 gerentes, 10 executivos, 50 parceiros, 9 praças e 3 meses de histórico
(jul–set/2026, com setembro até o dia 8, que é o "hoje" do produto).

Cada alerta tem pelo menos um caso plantado, com ID fixo, para a demonstração
ser reprodutível. A lista está em `CASOS`, no `src/data/seed.ts`:

| Situação | Parceiros |
| --- | --- |
| Zero horas online com promo ativa | `P07`, `P23`, `P41` |
| Promo de pizza no almoço sem abrir no almoço | `P13`, `P34` |
| Pedido registrado sem hora online | `P19` |
| Budget acima de 1,5× o necessário | `P05`, `P28`, `P44` |
| Aderência cravada em 100% sem variação | `P16`, `P31` |
| Executivo com carteira inteira aderente | `E04` |
| Perdeu banner de um mês para o outro | `P03`, `P11`, `P22`, `P37` |
| Reclamações disparando no mês atual | `P09`, `P26`, `P48` |
| Chargeback recorrente | `P12` |
| Reembolso muito acima do grupo | `P29` |
| "Pedido não entregue" explodindo em setembro | `P08`, `P17` |
