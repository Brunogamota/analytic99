# Próximos passos

O que ficou em aberto, com o contexto necessário para retomar. Nada aqui está
começado pela metade — são coisas que ainda não foram feitas.

---

## Pendências curtas

### Logo da equipe
Salve o PNG oficial como `public/logo-equipe.png`. O código já procura esse
caminho primeiro (`src/components/LogoEquipe.tsx`) e só cai no símbolo
provisório `public/logo-equipe.svg` se não encontrar. Não precisa mexer em mais
nada. O ideal é um quadrado com fundo transparente.

### Referências de design em Figma
Vão ser subidas depois. Quando chegarem, o lugar é `docs/referencias/`, com uma
linha em `docs/decisoes.md` dizendo o que foi adotado e o que foi adaptado —
como já está registrado para Manus, ClickUp e as demais.

---

## Buracos conhecidos

### Não existe teste automatizado
A verificação até aqui foi manual e por script de navegador. As funções de
`src/lib/` são puras e recebem `Snapshot`, então são o alvo mais fácil: nota,
sugestões, alertas e classificação de coluna dão teste de unidade direto, sem
montar componente.

### `bg-white` e `text-white` ainda espalhados
Uns 67 pontos, escritos antes do tema escuro existir. Funcionam porque são
redefinidos dentro de `.dark` no `src/index.css`, mas **isso não alcança
variantes com opacidade** — `bg-white/95` gera outra classe e já causou um
painel branco no tema escuro. A troca por `bg-superficie` é mecânica e de baixo
risco; só não foi feita para não misturar faxina com entrega.

### O bundle ainda é grande
Primeiro carregamento em ~163 kB comprimidos, o que está bom, mas o pedaço do
`xlsx` (~133 kB) e o do Recharts (~113 kB) são pesados quando abertos. Se virar
problema, o caminho é trocar o `xlsx` por algo menor ou ler planilha em worker.

---

## Ideias que não viraram pedido

Anotadas porque apareceram na conversa e podem voltar. Nenhuma foi combinada.

- **Estado por UF.** A performance por local vai até praça e cidade, porque é o
  que o modelo tem. Se a UF for útil, dá para derivar da cidade no seed.
- **Persistir o que a pessoa cria.** Tarefa, time, membro convidado e dado
  importado vivem só na sessão. Recarregar a página zera. Para valer de verdade
  precisaria de backend, que é uma decisão de outro tamanho.
- **Dado real no lugar do seed.** Hoje a aba Importar recebe planilha e valida,
  mas não substitui o seed. Ligar os dois é o passo natural quando houver
  planilha de verdade para testar.
