# Arquitetura

## O formato

Aplicação de página única em React 18 + TypeScript, empacotada com Vite. Não há
servidor, banco nem autenticação: os dados moram em memória, gerados no
carregamento. O build é estático e sobe em qualquer host de arquivos.

## O fluxo de um número até a tela

```
src/data/seed.ts          gera o dataset (PRNG de semente fixa)
        ↓
src/lib/queries.ts        snapshot(parceiros, período) recorta os fatos
        ↓
src/lib/*.ts              funções puras derivam KPI, alerta, nota, série
        ↓
src/tabs/*.tsx            a tela só formata e posiciona
```

**A tela nunca calcula.** Se um componente está fazendo conta, é sinal de que a
função devia estar em `src/lib/`.

O `Snapshot` é a peça central: `App.tsx` monta dois por vez — o período atual e
o de comparação — e passa para as abas. Trocar filtro, período ou perfil
remonta os dois.

## Camadas

### `src/data/` — o modelo
- `types.ts` — as 9 tabelas: `dim_gerente`, `dim_executivo`, `dim_parceiro`,
  `fato_promo`, `fato_pedidos`, `fato_horas`, `hist_banner`,
  `fato_reclamacoes`, `fato_ocorrencias`.
- `seed.ts` — a geração. Cada bloco usa seu próprio RNG, para acrescentar dado
  novo não deslocar o que já existia.
- `rng.ts` — mulberry32, determinístico.

### `src/lib/` — as regras
| Arquivo | Responsabilidade |
| --- | --- |
| `queries.ts` | `Snapshot`, filtros, KPIs, alertas, tabelas das promos |
| `periodo.ts` | recorte de datas, atalhos, período de comparação |
| `sugestoes.ts` | as nove regras de sugestão |
| `assistente.ts` | interpretação da pergunta do copiloto |
| `performance.ts` | a nota de 0 a 100 e os três recortes |
| `relatorio.ts` | agregação por dimensão, detalhe por parceiro, CSV |
| `ocorrencias.ts` | perdas: reembolso, estorno, cancelamento, chargeback |
| `series.ts` | séries temporais dos gráficos |
| `equipe.ts` | membros, papéis, permissões, convite |
| `times.ts` | grupos de trabalho |
| `tarefas.ts` | tarefas do Gantt |
| `perfil.ts` | troca de perfil e metas do executivo |
| `importacao.ts` | leitura de arquivo e classificação de coluna |
| `integracoes.ts` | catálogo de integrações |
| `format.ts` | `cn` e formatadores pt-BR |

### `src/components/` — o que se repete
`DataTable` (tabela ordenável com busca), `FilterBar`, `KpiCard`, `Heatmap`,
`chart.tsx` (wrappers de Recharts), `Sidebar`, `PageHeader`, `ToggleTema`,
`SeletorPerfil`.

Em `src/components/ui/` ficam os três componentes portados de fora: `sidebar`
(shadcn), `gantt` (roadmap-ui) e `avatar`.

### `src/tabs/` — as telas
Uma por aba. Recebem `Snapshot` por prop, não buscam dado sozinhas.

## Tema

Todo token de cor é uma CSS variable definida em `src/index.css`: `:root` para o
claro, `.dark` para o escuro. O `tailwind.config.js` só aponta para elas. Por
isso nenhum componente sabe que existe tema — trocar a classe `dark` no `<html>`
troca a interface inteira.

Duas notas para quem for mexer:

1. **As classes `bg-white` e `text-white` sobreviveram** em uns 67 pontos, de
   antes do tema existir. Elas são redefinidas dentro de `.dark` no
   `index.css`. Isso **não alcança variantes com opacidade** (`bg-white/95`
   gera outra classe) — já causou um painel branco no tema escuro. Ao escrever
   código novo, use `bg-superficie`.
2. **Cor de gráfico vai como `rgb(var(--token))`**, não como hexadecimal, senão
   não acompanha o tema.

## Carregamento

As abas pesadas são carregadas sob demanda com `lazy`. O `xlsx` sozinho pesa
mais que todo o resto e não faz sentido no carregamento inicial de quem nunca
abre a tela de importação. Primeiro carregamento: ~163 kB comprimidos.

## Dependências que valem saber

| Pacote | Para quê |
| --- | --- |
| `recharts` | todos os gráficos |
| `@dnd-kit/*` | arrastar as barras do Gantt |
| `date-fns` | datas do Gantt (locale `ptBR`) |
| `jotai` | dois átomos do Gantt (arrasto e scroll) |
| `xlsx`, `papaparse` | leitura de planilha na importação |
| `@radix-ui/*` | diálogo, menu, popover, tooltip |
| `motion` | transições do copiloto |
| `simple-icons` | logos das integrações (devDependency) |

## O que não existe

Nenhum teste automatizado. A verificação até aqui foi manual e por script de
navegador. Se o projeto for crescer, é o primeiro buraco a tapar — as funções
de `src/lib/` são puras e fáceis de testar.
