# Como trabalhar neste projeto

Dashboard de performance comercial para a equipe **Barbie Village** no 99Food.
Quem usa é **Carolina Martinovic**, gestora comercial, para acompanhar a execução
do time de executivos junto aos parceiros (restaurantes).

Leia também `docs/produto.md` (o que cada tela resolve), `docs/arquitetura.md`
(onde mexer para cada tipo de mudança) e `docs/decisoes.md` (o que já foi
decidido e não deve ser desfeito por engano).

---

## Regra 1 — Os dados são fictícios, e isso não pode virar mentira

Tudo vem de `src/data/seed.ts`, gerado por PRNG de semente fixa. **Não existe
banco, não existe API, não existe login.** Ao falar do sistema — em texto de
interface, em commit ou com a pessoa — nunca dê a entender que um número veio
da operação real.

Onde a tela promete algo que o código não faz, ela diz isso na própria tela.
Dois exemplos que já estão assim e devem continuar:

- **Integrações** têm uma faixa avisando que nada troca dados, e o fluxo termina
  em "aguardando credenciais", nunca em "conectado".
- **Importar** avisa que o reconhecimento é por nome e formato de coluna, não por
  IA, e que nada é gravado no seed.

## Regra 2 — Todo número na tela sai de um cálculo, nunca de um literal

Não existe valor chumbado em componente. KPI, alerta, sugestão, nota e gráfico
saem de funções puras em `src/lib/`, sobre um `Snapshot` recortado pelos filtros.
Se aparecer um número que a pessoa não consegue rastrear até a origem, é bug.

Corolário: quando uma métrica precisa de uma base que não existe (sem promo, sem
hora online), o resultado é `null` e a interface mostra `—`. Nunca `NaN`, nunca
`Infinity%`, nunca zero fingindo ser medição.

## Regra 3 — Cor só onde há decisão

A paleta é **rosa, branco e preto**, na estrutura do iFood: uma cor de marca
sobre neutros puros. O rosa é da equipe.

O que precisa de ação sai em rosa. O que está bem fica em preto ou cinza.
**Não existe verde de "tudo certo" nem amarelo de "atenção"** — os tokens com
esses nomes ainda existem para não quebrar chamadas antigas, mas todos apontam
para a mesma família. Não reintroduza azul, roxo ou vermelho.

A única exceção são os logos de terceiros em Integrações: identidade de outra
empresa não é decoração nossa e não segue o tema.

## Regra 4 — Verifique no navegador, não só no TypeScript

`npx tsc` passar não significa que a tela funciona. Componente que compila e
renderiza vazio já aconteceu aqui mais de uma vez (gráfico sem dados, classe
Tailwind que não existe e por isso não é gerada).

Antes de dizer que terminou: rode `npm run dev`, abra a tela, **olhe**, e
confira o console. Se mexeu em cor, confira **nos dois temas** — o tema escuro
mora em `.dark` no `src/index.css`.

## Regra 5 — Quando a referência briga com o produto, diga

Muita coisa aqui veio de referência visual (Manus, ClickUp, shadcn, Front).
Copiar não é o objetivo: em vários pontos a referência foi adaptada de
propósito, e o porquê está em `docs/decisoes.md`.

Se uma nova referência pedir algo que piora o produto — cor sem significado,
número sem origem, animação que atrapalha a leitura — implemente o que faz
sentido e **diga o que não fez e por quê**, em vez de obedecer em silêncio.

---

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # produção
npm run typecheck  # tsc sem emitir
```

Largura mínima de trabalho: **1366×768**. Não há layout mobile, e o `Sheet`
mobile do sidebar foi removido de propósito.

## Convenções que não se negociam

- **Todo texto de interface em português do Brasil.** Nomes de função, tipo e
  variável também, salvo quando são API de terceiro.
- **Cor só por token** (`ink`, `muted`, `rosa`, `stroke`, `hairline`,
  `superficie`, `areia`…). Classe Tailwind com cor inventada não é gerada e some
  sem erro.
- **Números em pt-BR** pelos formatadores de `src/lib/format.ts`.
- **Comentário só quando o PORQUÊ não é óbvio.** Não comente o que a linha faz.
- Sem sombra pesada, sem gradiente decorativo, sem animação de entrada.
- `strict`, `noUnusedLocals` e `noUnusedParameters` estão ligados.

## Onde mexer

| Mudança | Arquivo |
| --- | --- |
| Regra de negócio, KPI, alerta | `src/lib/queries.ts` |
| Sugestões do copiloto | `src/lib/sugestoes.ts` e `src/lib/assistente.ts` |
| Nota de 0 a 100 | `src/lib/performance.ts` |
| Dados de exemplo | `src/data/seed.ts` |
| Cores e tema | `tailwind.config.js` + `src/index.css` |
| Nova aba | `src/tabs/`, e ligar em `src/App.tsx` **e** `src/components/Sidebar.tsx` |

Ligar aba nova exige os dois arquivos. Já aconteceu de uma aba pronta ficar
invisível por faltar metade.
