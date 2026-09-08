# Performance Comercial — 99

Dashboard interno para a gestora acompanhar a execução do time de executivos
junto aos parceiros. Referência visual: Front (Analytics → Team performance).
Referência de interação: Fresha (estado vazio vs. populado, filtro que
transforma a visão sem mudar o layout).

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run typecheck
```

Largura mínima de trabalho: 1366×768.

## Stack

React 18 + TypeScript, Vite, Tailwind CSS, Radix UI (dropdown, popover, dialog,
tooltip), lucide-react.

## Dados

Não há mock estático: todo card, tabela, alerta e heatmap é calculado a partir
do seed em `src/data/seed.ts`, que gera de forma determinística (PRNG com
semente fixa) 3 gerentes, 10 executivos, 50 parceiros e 3 meses de histórico
(jul–set/2026, sendo setembro até o dia 8).

Tabelas, conforme o modelo pedido: `dim_gerente`, `dim_executivo`,
`dim_parceiro`, `fato_promo` (uma linha por parceiro × tipo de promo × mês),
`fato_pedidos`, `fato_horas`, `hist_banner`.

### Casos plantados

Cada alerta tem pelo menos uma ocorrência real no seed — os IDs estão em
`CASOS`, em `src/data/seed.ts`:

| Alerta | Parceiros |
| --- | --- |
| Zero horas online com promo ativa | `P07`, `P23`, `P41` |
| Promo de pizza no almoço sem abrir no almoço | `P13`, `P34` |
| Pedido registrado sem hora online | `P19` |
| Budget real acima de 1,5× o necessário | `P05`, `P28`, `P44` |
| Aderência cravada em 100% sem variação | `P16`, `P31` |
| Executivo com carteira inteira aderente | `E04` |
| Perdeu banner de um mês para o outro | `P03`, `P11`, `P22`, `P37` |

## Decisões que valem registro

- **Comparação de período.** Quando o recorte começa no dia 1, o período de
  comparação é o mesmo intervalo de dias do mês anterior (1–8 de setembro vs.
  1–8 de agosto), não o mês inteiro. Comparar 8 dias com 31 inventaria queda.
- **Heatmap normalizado.** Um recorte de 8 dias contém duas terças e uma
  quarta. As métricas de pedidos e receita são divididas pelas ocorrências de
  cada dia da semana; sem isso a coluna repetida parece o dobro.
- **"Parceiro ativo" é quem ficou online.** O KPI conta parceiros com ao menos
  uma hora online no período, não parceiros cadastrados — é o que torna o
  alerta de zero horas coerente com o número do topo.
- **`fato_promo` é mensal.** Aderência e budget são fechados por mês; um
  recorte custom dentro do mês usa o mês inteiro para essas colunas.

## Onde está o quê

```
src/data/seed.ts       geração determinística dos fatos e dimensões
src/lib/queries.ts     KPIs, alertas, tabelas, heatmap — tudo derivado do seed
src/lib/periodo.ts     recorte de datas, navegação < > e período de comparação
src/components/        Sidebar, FilterBar, KpiCard, AlertBanner, DataTable, Heatmap
src/tabs/              Gerencial, Promo Smart, Promo Banner, Promo Special
```
