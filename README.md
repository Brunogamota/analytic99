# Performance Comercial — Barbie Village

Dashboard interno para acompanhar a execução do time comercial junto aos
parceiros do 99Food: aderência às promoções, uso de budget, alertas de operação,
perdas e distribuição de tarefas.

> **Os dados são fictícios.** Tudo é gerado por um seed determinístico dentro do
> próprio código. Não há banco, API nem login — nenhum número aqui vem da
> operação real.

---

## Rodar na sua máquina

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo. Confira com
`node -v`.

```bash
npm install     # uma vez, baixa as dependências
npm run dev     # sobe em http://localhost:5173
```

Abra o endereço no navegador. Para parar, `Ctrl+C` no terminal.

Outros comandos:

```bash
npm run build      # gera a versão de produção em dist/
npm run typecheck  # confere os tipos sem gerar arquivos
```

O dashboard foi desenhado para telas de **1366×768 ou maiores**. Não há versão
mobile.

## Colocar no ar

O build é estático, então sobe em qualquer host de arquivos. Na
[Vercel](https://vercel.com), conecte o repositório e ela detecta o Vite
sozinha; se pedir, use `npm run build` como comando e `dist` como diretório de
saída. Não há variável de ambiente para configurar.

---

## O que tem dentro

Doze telas, agrupadas na barra lateral:

**Análise** — Gerencial (KPIs, alertas, gráficos e o time), Sugestões (copiloto
que responde sobre os dados), Performance (nota por pessoa, praça e categoria) e
Relatórios (quebras, detalhe por parceiro e perdas, com exportação CSV).

**Promoções** — Smart, Banner e Special, uma tabela cada.

**Time** — Times (grupos de trabalho), Equipe (pessoas, papéis e permissões),
Tarefas (Gantt com prazos) e Minha visão (o dashboard como um executivo veria).

**Sistema** — Importar dados (sobe planilha e reconhece as colunas sozinho) e
Integrações (catálogo; nenhuma conecta de verdade ainda).

No topo da tela ficam o seletor de perfil — para ver o dashboard como um
executivo específico — e o botão de tema claro/escuro.

## Documentação

| Arquivo | Para quê |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | As regras de quem trabalha no código. **Leia antes de mexer.** |
| [`docs/produto.md`](docs/produto.md) | O que cada tela resolve e quais são os dados de exemplo |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Como o código está organizado e onde mexer |
| [`docs/decisoes.md`](docs/decisoes.md) | O que já foi decidido e o problema que cada decisão evitava |
| [`docs/proximos-passos.md`](docs/proximos-passos.md) | O que ficou em aberto |

## Stack

React 18, TypeScript e Vite. Tailwind CSS para estilo, Radix UI para os
primitivos de interação, Recharts para os gráficos, dnd-kit para o Gantt.
