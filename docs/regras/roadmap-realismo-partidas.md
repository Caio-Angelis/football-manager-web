# Roadmap de Realismo — Simulação de Partidas (rumo ao FM)

Checklist das lacunas entre o motor atual (`backend/src/store/helpers/matchEngine.ts`)
e a simulação de partida de um Football Manager de verdade. Ordenado por impacto no
realismo. Marcar `[x]` conforme for implementado.

> Legenda de impacto: 🔥🔥🔥 muda a "cara de FM" · 🔥🔥 profundidade · 🔥 imersão

---

## 🔴 Críticas (o que mais quebra o realismo)

- [ ] **#1 — Atribuir cada ação do tick a um `playerId`** 🔥🔥🔥
  Hoje as estatísticas individuais nas notas (chutes/passes/desarmes) são aleatórias
  por posição (`calculatePlayerMatchRatings:455`), desconectadas do que o motor simulou.
  Fazer o tick registrar quem passou/desarmou/interceptou/finalizou e acumular por jogador.
  É a base para notas honestas, estatísticas reais e mapas de passe reais.

- [x] **#2 — Forma (`form`) dinâmica pós-partida** 🔥🔥🔥 ✅ *feito*
  Antes: `player.form` era gerado aleatório (60-99) e **nunca** mudava.
  Agora: a nota da partida atualiza a forma (`updateFormFromRating` em `matchEngine.ts`),
  com reversão à média (70) e streaks emergentes. Aplicado em `applyMatchResultToTeams`
  para todos os jogadores que atuaram (via `playerRatings`). Faixa 25–100.

- [x] **#3 — `fitness` consumido por jogar + recuperação proporcional** 🔥🔥🔥 ✅ *feito*
  Antes: jogar 90' não custava condição; recuperação fixa de +5/semana; sem incentivo a rodízio.
  Agora: `applyMatchFitnessCost` (`matchEngine.ts`) desconta condição por minutos jogados,
  penalizando idade e aliviado por stamina; `applyFatigueDecayToPlayer` (`injury.ts`) passou a
  recuperar proporcionalmente. Equilíbrio calibrado: titular fixo ~83, veterano sem rodízio ~61,
  jogador poupado ~95+. Custo também aplicado no fluxo ao vivo (`match.ts` passa `withRatings`).

- [ ] **#4 — Modelo posicional: formação → posições 2D + marcação por proximidade** 🔥🔥🔥
  `formation` (4-4-2 etc.) é **ignorada** pelo motor; a bola é 1D (`ballPos`). Introduzir grid
  de posições por formação, marcação/cobertura por proximidade espacial, overloads posicionais
  e uso real de `PlayerRole`/`PlayerInstruction` (hoje decorativos). *(Refatoração séria do tick.)*

- [ ] **#5 — Unificar xG dos dois motores** 🔥
  O motor rápido (`simulateMatchResult`, usado nas 500 simulações Monte Carlo pré-jogo) tem xG
  cosmético (`gols*0.65+…`), enquanto o tick tem xG honesto (`onTargetP × goalP`). Calibrar/unificar
  para a análise pré-jogo prever com o mesmo modelo que joga a partida.

---

## 🟠 Profundidade tática / física

- [ ] **#6 — Atributos mentais/ocultos no desempenho em jogo** 🔥🔥
  `consistency` (variância da nota), `bigGameImportance` (jogos decisivos), `aggression`
  (faltas/cartões, hoje % fixa), `workRate`/`teamwork` (cobertura) não afetam a partida — só lesões.

- [ ] **#7 — Estados de jogo (game states) e psicologia situacional** 🔥🔥
  Perdendo no fim → mais risco/linha alta; vencendo → segura o resultado; nervosismo de placar
  afetando `composure` coletivo. Hoje só há `momentum` genérico, que não muda a tática.

- [ ] **#8 — Jogadas específicas de FM** 🔥🔥
  Contra-ataque como transição vertical de N passes (não só multiplicador); cabeçada em jogada
  aberta; rebote/segundo pau/trave; gol contra; erro de goleiro/zagueiro; **impedimento anulando
  gol** (`trapOffside` existe como flag mas não anula nada).

- [ ] **#9 — Lesões durante a partida** 🔥🔥
  `injury.ts` roda semanalmente. Adicionar roll de lesão no tick (agravado por fadiga, entradas
  duras, `injuryProneness`) forçando substituição ao vivo.

---

## 🟡 Imersão / feedback

- [ ] **#10 — Clima, gramado e árbitro** 🔥
  Chuva/neve (mais erros, bola mais rápida), qualidade do gramado, perfil do árbitro (rigoroso →
  mais cartões). Modificadores baratos com bom retorno de imersão.

- [ ] **#11 — Narração/comentário minuto-a-minuto** 🔥
  Texto narrativo ("Grande defesa!", "Passe genial de X") sobre os eventos já ordenados.

- [ ] **#12 — Análise pós-jogo com dados reais** 🔥
  Heatmap/insights derivam de contadores agregados, não de posições reais dos lances (dependente
  do #1 e #4). Faltam mapa de passes real, timeline de xG, posições médias.

---

## Notas de implementação (itens concluídos)

- **#2 e #3** foram implementados juntos porque compartilham o mesmo ponto de entrada
  (`applyMatchResultToTeams`) e o mesmo dado (`playerRatings` com `rating` e `minutesPlayed`).
- Correção de fluxo: no jogo **ao vivo** (`match.ts`), `applyMatchResultToTeams` recebia `result`
  (sem `playerRatings`); passou a receber `withRatings`, senão forma/fitness não se aplicariam
  em partidas jogadas ao vivo.
- Recuperação de fitness é universal (humanos em `core.ts:632`, IA em `core.ts:950`), então o
  custo de partida pôde ser aplicado a todos os times sem risco de espiral.
